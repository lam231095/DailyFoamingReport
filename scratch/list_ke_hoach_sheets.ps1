$ExcelPath = Join-Path (Resolve-Path ".") "ke_hoach_san_xuat.xlsx"
Write-Host "Opening: $ExcelPath"

$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false
try {
    $wb = $xl.Workbooks.Open($ExcelPath, 0, $true)
    foreach ($ws in $wb.Worksheets) {
        Write-Host $ws.Name
    }
    $wb.Close($false)
} catch {
    Write-Host "Error: $_"
} finally {
    $xl.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($xl) | Out-Null
    [GC]::Collect()
}
