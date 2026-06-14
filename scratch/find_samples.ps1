$searchDirs = @("C:\Users\lam.dv2\OneDrive - Ortholite Vietnam", "C:\Users\lam.dv2\Ortholite Vietnam", "C:\Users\lam.dv2\OneDrive - Ortholite Vietnam\PROJECT LÂM\DailyFoamingReport")
foreach ($dir in $searchDirs) {
    if (Test-Path $dir) {
        Write-Host "Searching in $dir..."
        Get-ChildItem -Path $dir -Filter "*Sample*.xlsx" -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
            Write-Host "File: $($_.FullName)"
            Write-Host "  LastWriteTime: $($_.LastWriteTime)"
            Write-Host "  Length: $($_.Length) bytes"
        }
    }
}
