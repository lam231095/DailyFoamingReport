$searchRoot = "C:\Users\lam.dv2\OneDrive - Ortholite Vietnam"
Write-Host 'Listing folders directly under' $searchRoot ':' -ForegroundColor Cyan
Get-ChildItem -Path $searchRoot
