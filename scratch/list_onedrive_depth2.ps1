$root = "C:\Users\lam.dv2\OneDrive - Ortholite Vietnam"
Write-Host "Listing subfolders of: $root"
Get-ChildItem -Path $root -Directory | ForEach-Object {
    $p = $_.FullName
    Write-Host "Dir: $p" -ForegroundColor Cyan
    Get-ChildItem -Path $p -Directory -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "  SubDir: $($_.Name)" -ForegroundColor Green
        # If it contains REPORT or DAILY, check inside
        if ($_.Name -like "*REPORT*" -or $_.Name -like "*DAILY*") {
            Write-Host "    Items inside $($_.Name):" -ForegroundColor Yellow
            Get-ChildItem -Path $_.FullName
        }
    }
}
