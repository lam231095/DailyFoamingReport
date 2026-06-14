$activeFiles = Get-ChildItem -Path "C:\Users\lam.dv2\Ortholite Vietnam" -Filter "Sample Orders.xlsx" -Recurse -ErrorAction SilentlyContinue
if ($activeFiles.Count -eq 0) {
    Write-Host "No original Sample Orders.xlsx found in C:\Users\lam.dv2\Ortholite Vietnam"
    exit
}

$latest = $activeFiles | Sort-Object LastWriteTime -Descending | Select-Object -First 1
Write-Host ("Latest source: " + $latest.FullName + " (Modified: " + $latest.LastWriteTime + ")")

# Copy to workspace
$dest = Resolve-Path "."
$destFile = Join-Path $dest.Path "Kế hoach sản xuất Sample.xlsx"
Copy-Item -Path $latest.FullName -Destination $destFile -Force
Write-Host "Copied to workspace as Kế hoach sản xuất Sample.xlsx"

# Inspect sheet names
$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false
try {
    $wb = $xl.Workbooks.Open($destFile, 0, $true)
    Write-Host "Sheets in copied file:"
    for ($si = 1; $si -le $wb.Worksheets.Count; $si++) {
        Write-Host ("  " + $si + ": " + $wb.Worksheets.Item($si).Name)
    }
    $wb.Close($false)
} finally {
    $xl.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($xl) | Out-Null
    [GC]::Collect()
}
