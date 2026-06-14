$searchRoot = "C:\Users\lam.dv2\OneDrive - Ortholite Vietnam"
Write-Host "Searching for 'REPORT DAILY' folders under $searchRoot..." -ForegroundColor Yellow
$folders = Get-ChildItem -Path $searchRoot -Directory -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*REPORT DAILY*" -or $_.Name -like "*Daily*" }
foreach ($f in $folders) {
    Write-Host "Found folder: $($f.FullName)" -ForegroundColor Green
}

Write-Host "Searching for '*Kế hoạch*.xlsx' or '*Ke hoach*.xlsx' under $searchRoot..." -ForegroundColor Yellow
$files = Get-ChildItem -Path $searchRoot -File -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*Ke hoach*" -or $_.Name -like "*Kế hoạch*" }
foreach ($file in $files) {
    Write-Host "Found file: $($file.FullName)" -ForegroundColor Green
}
