$pattern = "C:\Users\lam.dv2\OneDrive - Ortholite Vietnam\PROJECT*\REPORT DAILY"
Write-Host "Resolving path with wildcard: $pattern"
$resolved = Resolve-Path $pattern -ErrorAction SilentlyContinue
if ($resolved) {
    Write-Host "Resolved path: $resolved" -ForegroundColor Green
    Get-ChildItem -Path $resolved
} else {
    # Let's search inside OneDrive for any folder named REPORT DAILY
    Write-Host "No path resolved by PROJECT*\REPORT DAILY. Searching OneDrive root..." -ForegroundColor Yellow
    Get-ChildItem -Path "C:\Users\lam.dv2\OneDrive - Ortholite Vietnam" -Directory -Filter "*REPORT DAILY*" -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "Found: $($_.FullName)" -ForegroundColor Green
        Get-ChildItem -Path $_.FullName
    }
}
