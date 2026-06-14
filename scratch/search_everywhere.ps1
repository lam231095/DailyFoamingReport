$searchRoot = "C:\Users\lam.dv2\OneDrive - Ortholite Vietnam"
Write-Host "Searching for Excel files under $searchRoot..." -ForegroundColor Yellow

$patterns = @("*Kế hoạch*", "*Ke hoach*", "*Production*", "*Foaming*", "*W24*")

foreach ($p in $patterns) {
    Write-Host "Pattern: $p" -ForegroundColor Cyan
    Get-ChildItem -Path $searchRoot -Filter "$p.xlsx" -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "  Found: $($_.FullName) (Size: $($_.Length) bytes, LastWrite: $($_.LastWriteTime))" -ForegroundColor Green
    }
}
