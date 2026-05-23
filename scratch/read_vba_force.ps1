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

try {
    # Set to Enable All Macros (1) and Trust Access to VBOM (1)
    Write-Output "Temporarily modifying registry settings to enable macro access..."
    Set-RegValue "VBAWarnings" 1
    Set-RegValue "AccessVBOM" 1

    # Now open Excel and read VBA
    $scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
    $parentPath = Split-Path -Parent $scriptPath
    $filePath = Join-Path $parentPath "IN DON.xlsm"

    Write-Output "Opening Excel file: $filePath"
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    
    $wb = $excel.Workbooks.Open($filePath, 0, $true)
    Write-Output "Opened workbook: $($wb.Name)"
    
    $vbProject = $wb.VBProject
    $count = $vbProject.VBComponents.Count
    Write-Output "Number of VBA Components found: $count"
    
    foreach ($module in $vbProject.VBComponents) {
        $name = $module.Name
        $typeNum = $module.Type
        $lines = 0
        if ($module.CodeModule) {
            $lines = $module.CodeModule.CountOfLines
        }
        Write-Output "Component: $name (Type: $typeNum, Lines: $lines)"
        
        if ($lines -gt 0) {
            Write-Output "--- CODE FOR $name ---"
            $code = $module.CodeModule.Lines(1, $lines)
            Write-Output $code
            Write-Output "----------------------"
        }
    }
    
    $wb.Close($false)
    $excel.Quit()
} catch {
    Write-Error "An error occurred: $_"
} finally {
    # Clean up Excel COM
    if ($excel) {
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
