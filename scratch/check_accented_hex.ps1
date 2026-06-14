$accentChar = [char]0xC2
$path = "C:\Users\lam.dv2\OneDrive - Ortholite Vietnam\PROJECT L$($accentChar)M\REPORT DAILY"
Write-Host "Constructed path: $path"

if (Test-Path $path) {
    Write-Host "FOUND REPORT DAILY FOLDER!" -ForegroundColor Green
    Get-ChildItem -Path $path
} else {
    Write-Host "REPORT DAILY folder not found." -ForegroundColor Red
    
    $parent = "C:\Users\lam.dv2\OneDrive - Ortholite Vietnam\PROJECT L$($accentChar)M"
    Write-Host "Checking parent path: $parent"
    if (Test-Path $parent) {
        Write-Host "Parent folder found!" -ForegroundColor Green
        Get-ChildItem -Path $parent
    } else {
        Write-Host "Parent folder NOT found." -ForegroundColor Red
    }
}
