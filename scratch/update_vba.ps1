$regPath = "HKCU:\Software\Microsoft\Office\16.0\Excel\Security"

# Helper to get registry value
function Get-RegValue($name) {
    if (Test-Path $regPath) {
        $val = Get-ItemProperty -Path $regPath -Name $name -ErrorAction SilentlyContinue
        if ($val) { return $val.$name }
    }
    return $null
}

# Helper to set registry value
function Set-RegValue($name, $value) {
    if (-not (Test-Path $regPath)) {
        New-Item -Path $regPath -Force | Out-Null
    }
    Set-ItemProperty -Path $regPath -Name $name -Value $value -Type DWord -Force | Out-Null
}

# Helper to remove registry value
function Remove-RegValue($name) {
    if (Test-Path $regPath) {
        Remove-ItemProperty -Path $regPath -Name $name -ErrorAction SilentlyContinue | Out-Null
    }
}

# Backup settings
$origVBAWarnings = Get-RegValue "VBAWarnings"
$origAccessVBOM = Get-RegValue "AccessVBOM"

Write-Output "Backed up registry settings:"
Write-Output " - VBAWarnings: $origVBAWarnings"
Write-Output " - AccessVBOM: $origAccessVBOM"

$excel = $null
$wb = $null

try {
    # Set to Enable All Macros (1) and Trust Access to VBOM (1)
    Write-Output "Temporarily modifying registry settings to enable macro access..."
    Set-RegValue "VBAWarnings" 1
    Set-RegValue "AccessVBOM" 1

    # Resolve file path
    $scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
    $parentPath = Split-Path -Parent $scriptPath
    $filePath = Join-Path $parentPath "IN DON.xlsm"

    Write-Output "Opening Excel file for writing: $filePath"
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    
    # Open workbook:
    # Open(Filename, UpdateLinks, ReadOnly, ...)
    # ReadOnly = $false to allow saving
    $wb = $excel.Workbooks.Open($filePath, 0, $false)
    Write-Output "Opened workbook: $($wb.Name)"
    
    $vbProject = $wb.VBProject
    
    # Let's find Sheet1 component
    $module = $null
    foreach ($comp in $vbProject.VBComponents) {
        if ($comp.Name -eq "Sheet1") {
            $module = $comp
            break
        }
    }
    
    if ($module) {
        Write-Output "Found Sheet1 VBA component. Modifying code..."
        
        # Original lines count
        $lines = $module.CodeModule.CountOfLines
        if ($lines -gt 0) {
            $module.CodeModule.DeleteLines(1, $lines)
        }
        
        # New code with 2-second delay
        $newCode = @"
Sub indon()
Dim i As Integer

i = 2

While ThisWorkbook.Sheets(2).Cells(i, 1) <> ""
ThisWorkbook.Sheets(1).Cells(4, 6) = ThisWorkbook.Sheets(2).Cells(i, 1)

' Yield execution to let Excel process events and start loading the QR code image
DoEvents

' Pause for 2 seconds (2 seconds = 00:00:02) to allow the QR image to load completely
Application.Wait (Now + TimeValue("00:00:02"))

' Yield execution again to ensure rendering is complete
DoEvents

' Print the sheet
ThisWorkbook.Sheets(1).PrintOut Preview:=False

i = i + 1
Wend

End Sub
"@
        
        $module.CodeModule.AddFromString($newCode)
        Write-Output "VBA Code successfully updated!"
        
        # Save and close
        Write-Output "Saving workbook..."
        $wb.Save()
        Write-Output "Workbook saved successfully."
    } else {
        Write-Error "Sheet1 component not found in the workbook VBA project!"
    }
    
    if ($wb) { $wb.Close($true) }
    
} catch {
    Write-Error "An error occurred: $_"
} finally {
    # Close Excel COM
    if ($excel) {
        $excel.Quit()
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
    }
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()

    # Restore registry settings
    Write-Output "Restoring registry settings..."
    if ($origVBAWarnings -eq $null) {
        Remove-RegValue "VBAWarnings"
    } else {
        Set-RegValue "VBAWarnings" $origVBAWarnings
    }
    
    if ($origAccessVBOM -eq $null) {
        Remove-RegValue "AccessVBOM"
    } else {
        Set-RegValue "AccessVBOM" $origAccessVBOM
    }
    Write-Output "Registry restored successfully."
}
