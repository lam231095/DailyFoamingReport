$homeDir = "C:\Users\lam.dv2"
Write-Host 'Listing items directly under' $homeDir ':' -ForegroundColor Cyan
Get-ChildItem -Path $homeDir

Write-Host 'Searching for PROJECT/REPORT under' $homeDir ':' -ForegroundColor Cyan
Get-ChildItem -Path $homeDir -Directory -Filter "*PROJECT*"
Get-ChildItem -Path $homeDir -Directory -Filter "*REPORT*"
