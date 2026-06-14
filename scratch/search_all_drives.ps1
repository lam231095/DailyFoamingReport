$homeDir = "C:\Users\lam.dv2"
Write-Host "Searching for directories containing 'REPORT DAILY' under $homeDir..." -ForegroundColor Yellow

$dirs = Get-ChildItem -Path $homeDir -Directory -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*REPORT DAILY*" -or $_.Name -eq "REPORT DAILY" }
foreach ($d in $dirs) {
    Write-Host "Found directory: $($d.FullName)" -ForegroundColor Green
    Get-ChildItem -Path $d.FullName
}
