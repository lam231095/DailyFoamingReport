$regPath = "HKCU:\Software\Microsoft\Office\16.0\Excel\Security"

function Get-RegValue($name) {
    if (Test-Path $regPath) {
        $val = Get-ItemProperty -Path $regPath -Name $name -ErrorAction SilentlyContinue
        if ($val) { return $val.$name }
    }
    return $null
}

function Set-RegValue($name, $value) {
    if (-not (Test-Path $regPath)) {
        New-Item -Path $regPath -Force | Out-Null
    }
    Set-ItemProperty -Path $regPath -Name $name -Value $value -Type DWord -Force | Out-Null
}

function Remove-RegValue($name) {
    if (Test-Path $regPath) {
        Remove-ItemProperty -Path $regPath -Name $name -ErrorAction SilentlyContinue | Out-Null
    }
}

$origVBAWarnings = Get-RegValue "VBAWarnings"
$origAccessVBOM = Get-RegValue "AccessVBOM"

$excel = $null
$wb = $null

try {
    Set-RegValue "VBAWarnings" 1
    Set-RegValue "AccessVBOM" 1

    $scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
    $parentPath = Split-Path -Parent $scriptPath
    $filePath = Join-Path $parentPath "IN DON.xlsm"

    Write-Output "Opening Excel file as READ-ONLY: $filePath"
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    
    # Open as Read-Only ($true)
    $wb = $excel.Workbooks.Open($filePath, 0, $true)
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
        
        $lines = $module.CodeModule.CountOfLines
        if ($lines -gt 0) {
            $module.CodeModule.DeleteLines(1, $lines)
        }
        
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
        Write-Output "VBA Code successfully updated in memory!"
        
        # Save by overwriting the original file
        Write-Output "Overwriting the original file using SaveAs..."
        
        # xlOpenXMLWorkbookMacroEnabled = 52
        # SaveAs(Filename, FileFormat, Password, WriteResPassword, ReadOnlyRecommended, CreateBackup, AccessMode, ConflictResolution, AddToMru, TextCodepage, TextVisualLayout, Local)
        # AccessMode = 1 (xlNoChange), ConflictResolution = 2 (xlLocalSessionChanges)
        $wb.SaveAs($filePath, 52)
        Write-Output "Workbook saved successfully via SaveAs!"
    } else {
        Write-Error "Sheet1 component not found in the workbook VBA project!"
    }
    
    if ($wb) { $wb.Close($false) }
    
} catch {
    Write-Error "An error occurred: $_"
} finally {
    if ($excel) {
        $excel.Quit()
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
    }
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()

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
