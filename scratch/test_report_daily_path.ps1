$path1 = "C:\Users\lam.dv2\OneDrive - Ortholite Vietnam\PROJECT LAM\REPORT DAILY"
$path2 = "C:\Users\lam.dv2\OneDrive - Ortholite Vietnam\PROJECT LÂM\REPORT DAILY"

Write-Host "Checking Path 1: $path1"
if (Test-Path $path1) {
    Write-Host "Path 1 exists!" -ForegroundColor Green
    Get-ChildItem -Path $path1
} else {
    Write-Host "Path 1 does not exist." -ForegroundColor Red
}

Write-Host "Checking Path 2: $path2"
if (Test-Path $path2) {
    Write-Host "Path 2 exists!" -ForegroundColor Green
    Get-ChildItem -Path $path2
} else {
    Write-Host "Path 2 does not exist." -ForegroundColor Red
}
