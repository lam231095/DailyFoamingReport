$excelProcs = Get-Process | Where-Object {$_.ProcessName -eq "excel"}
foreach ($p in $excelProcs) {
    if ([string]::IsNullOrWhiteSpace($p.MainWindowTitle)) {
        Write-Host "Killing background Excel process ID: $($p.Id)" -ForegroundColor Yellow
        Stop-Process -Id $p.Id -Force
    } else {
        Write-Host "Keeping user Excel process ID: $($p.Id) with title '$($p.MainWindowTitle)'" -ForegroundColor Green
    }
}
