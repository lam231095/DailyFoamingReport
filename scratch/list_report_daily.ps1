$parentDir = "C:\Users\lam.dv2\OneDrive - Ortholite Vietnam"
$projectDirs = Get-ChildItem -Path $parentDir -Directory -Filter "PROJECT*"
foreach ($p in $projectDirs) {
    Write-Host "Listing contents of project folder: $($p.FullName)" -ForegroundColor Cyan
    Get-ChildItem -Path $p.FullName
}
