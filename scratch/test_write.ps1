$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$parentPath = Split-Path -Parent $scriptPath
$filePath = Join-Path $parentPath "IN DON.xlsm"

Write-Output "Opening Excel..."
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

try {
    Write-Output "Opening file: $filePath"
    $wb = $excel.Workbooks.Open($filePath, 0, $false) # ReadOnly = $false
    
    Write-Output "Workbook details:"
    Write-Output " - Name: $($wb.Name)"
    Write-Output " - Path: $($wb.FullName)"
    Write-Output " - ReadOnly: $($wb.ReadOnly)"
    Write-Output " - HasVBProject: $($wb.HasVBProject)"
    
    if ($excel.ProtectedViewWindows.Count -gt 0) {
        Write-Output " - Active ProtectedViewWindow count: $($excel.ProtectedViewWindows.Count)"
    } else {
        Write-Output " - No Protected View windows."
    }

    try {
        $vbProject = $wb.VBProject
        $count = $vbProject.VBComponents.Count
        Write-Output " - VBComponents.Count: $count"
        foreach ($comp in $vbProject.VBComponents) {
            Write-Output "   * Component: $($comp.Name) (Type: $($comp.Type))"
        }
    } catch {
        Write-Error "Could not access VBProject: $_"
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
