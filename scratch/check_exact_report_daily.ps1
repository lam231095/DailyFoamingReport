$path = "C:\Users\lam.dv2\OneDrive - Ortholite Vietnam\PROJECT LÂM\REPORT DAILY"
Write-Host "Checking exact path: $path"
if (Test-Path $path) {
    Write-Host "FOUND!" -ForegroundColor Green
    Get-ChildItem -Path $path
} else {
    Write-Host "NOT FOUND" -ForegroundColor Red
    # List the parent directory of this path
    $parent = "C:\Users\lam.dv2\OneDrive - Ortholite Vietnam\PROJECT LÂM"
    Write-Host "Listing parent path: $parent"
    if (Test-Path $parent) {
        Get-ChildItem -Path $parent
    } else {
        Write-Host "Parent also does not exist!"
    }
}
