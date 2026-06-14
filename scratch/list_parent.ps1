$currentDir = Get-Location
Write-Host "Current Directory: $currentDir"
$parentDir = Split-Path -Parent $currentDir
Write-Host "Parent Directory: $parentDir"
if (Test-Path $parentDir) {
    Write-Host "Listing parent directory:" -ForegroundColor Cyan
    Get-ChildItem -Path $parentDir
} else {
    Write-Host "Parent directory does not exist!" -ForegroundColor Red
}
