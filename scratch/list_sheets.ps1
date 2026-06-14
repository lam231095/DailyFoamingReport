$ExcelPath = Join-Path (Resolve-Path ".") "ke_hoach_san_xuat.xlsx"
$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false
try {
    $wb = $xl.Workbooks.Open($ExcelPath, 0, $true)
    foreach ($ws in $wb.Worksheets) {
        Write-Output $ws.Name
    }
    $wb.Close($false)
} finally {
    $xl.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($xl) | Out-Null
    [GC]::Collect()
}
