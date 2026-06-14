$dir = "C:\Users\lam.dv2\OneDrive - Ortholite Vietnam\PROJECT LAM\DailyFoamingReport"
Write-Host "Listing: $dir"
if (Test-Path $dir) {
    Get-ChildItem -Path $dir
} else {
    Write-Host "Path does not exist!"
}
