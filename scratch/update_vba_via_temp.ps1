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

    # Resolve paths
    $scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
    $parentPath = Split-Path -Parent $scriptPath
    $filePath = Join-Path $parentPath "IN DON.xlsm"
    $tempPath = Join-Path $scriptPath "temp_IN_DON.xlsm"

    Write-Output "Original File: $filePath"
    Write-Output "Temp File Copy: $tempPath"

    # 1. Copy the file to temp location
    if (-not (Test-Path $filePath)) {
        Write-Error "Original file not found: $filePath"
        return
    }
    Copy-Item -Path $filePath -Destination $tempPath -Force
    Write-Output "Copied original file to temporary location."

    # 2. Open the temp copy in Excel (Read-Write)
    Write-Output "Opening temporary file in Excel..."
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    
    $wb = $excel.Workbooks.Open($tempPath, 0, $false) # ReadOnly = $false
    Write-Output "Opened temp workbook: $($wb.Name)"
    Write-Output "Is ReadOnly? $($wb.ReadOnly)"
    
    $vbProject = $wb.VBProject
    
    # 3. Find Sheet1 and update VBA code
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
        
        # New VBA code with 2 seconds pause and DoEvents
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
        Write-Output "VBA Code successfully updated in temporary file!"
        
        # Save temp file
        Write-Output "Saving temporary workbook..."
        $wb.Save()
        Write-Output "Temporary workbook saved successfully."
    } else {
        Write-Error "Sheet1 component not found in the temp workbook VBA project!"
    }
    
    # Close workbook and excel
    $wb.Close($true)
    $excel.Quit()
    $excel = $null
    
    # Force COM cleanup to release the lock on temp file
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
    Start-Sleep -Seconds 1

    # 4. Copy the modified temp file back to the original file
    Write-Output "Overwriting original file with modified temporary file..."
    Copy-Item -Path $tempPath -Destination $filePath -Force
    Write-Output "Original file successfully updated!"
    
    # Delete temp file
    if (Test-Path $tempPath) {
        Remove-Item -Path $tempPath -Force
        Write-Output "Temporary file cleaned up."
    }
    
} catch {
    Write-Error "An error occurred: $_"
} finally {
    # Close Excel COM if still open
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
