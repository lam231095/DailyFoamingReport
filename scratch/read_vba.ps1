$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$parentPath = Split-Path -Parent $scriptPath
$filePath = Join-Path $parentPath "IN DON.xlsm"

Write-Output "Resolved file path: $filePath"

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$excel.ScreenUpdating = $false

try {
    if (-not (Test-Path $filePath)) {
        Write-Error "File does not exist: $filePath"
        return
    }
    
    Write-Output "Opening workbook..."
    $wb = $excel.Workbooks.Open($filePath, 0, $true)
    Write-Output "Successfully opened workbook: $($wb.Name)"
    
    try {
        Write-Output "Accessing VBProject..."
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
    } catch {
        Write-Error "Failed to access VBA Project: $_"
    }
    
    $wb.Close($false)
} catch {
    Write-Error "Failed to open workbook: $_"
} finally {
    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
}
