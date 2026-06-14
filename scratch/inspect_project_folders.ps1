$searchRoot = "C:\Users\lam.dv2\OneDrive - Ortholite Vietnam"
$dirs = Get-ChildItem -Path $searchRoot -Directory -Filter "PROJECT*" -Force
foreach ($d in $dirs) {
    Write-Host "Name: $($d.Name)"
    Write-Host "FullName: $($d.FullName)"
    Write-Host "Attributes: $($d.Attributes)"
    if ($d.Attributes -match "ReparsePoint") {
        # Query target
        $target = (Get-Item $d.FullName -Force).Target
        Write-Host "Target: $target"
    }
    Write-Host "--- Subdirectories ---"
    Get-ChildItem -Path $d.FullName -Directory -Force -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "  SubName: $($_.Name) | Attributes: $($_.Attributes)"
        if ($_.Attributes -match "ReparsePoint") {
            $t = (Get-Item $_.FullName -Force).Target
            Write-Host "  SubTarget: $t"
        }
    }
}
