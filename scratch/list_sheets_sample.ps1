$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false

$files = Get-ChildItem -Path . -Filter "*Sample*.xlsx"
foreach ($f in $files) {
    Write-Host "File: $($f.Name) (Size: $($f.Length))" -ForegroundColor Cyan
    try {
        $wb = $xl.Workbooks.Open($f.FullName, 0, $true)
        Write-Host "  Sheets:"
        for ($i = 1; $i -le $wb.Worksheets.Count; $i++) {
            Write-Host "    - $($wb.Worksheets.Item($i).Name)" -ForegroundColor Green
        }
        $wb.Close($false)
    } catch {
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}
$xl.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($xl) | Out-Null
[GC]::Collect()
