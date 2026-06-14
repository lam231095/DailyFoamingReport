$searchRoot = "C:\Users\lam.dv2\OneDrive - Ortholite Vietnam"
Write-Host "Searching for ke_hoach and daily files..." -ForegroundColor Yellow

$files = Get-ChildItem -Path $searchRoot -File -Recurse -ErrorAction SilentlyContinue | Where-Object { 
    $_.Name -like "*ke_hoach*" -or 
    $_.Name -like "*ke*hoach*" -or 
    $_.Name -like "*daily*" -or
    $_.Name -like "*report*"
}

foreach ($f in $files) {
    Write-Host "Found: $($f.FullName) (Size: $($f.Length) bytes, LastWrite: $($f.LastWriteTime))" -ForegroundColor Green
}
