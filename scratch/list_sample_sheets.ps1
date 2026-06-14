$localPath = Join-Path (Resolve-Path ".") "Kế hoach sản xuất Sample.xlsx"
Write-Host "Opening local file: $localPath"

$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false
try {
    $wb = $xl.Workbooks.Open($localPath, 0, $true)
    foreach ($ws in $wb.Worksheets) {
        Write-Host $ws.Name
    }
    $wb.Close($false)
} catch {
    Write-Host "Error local: $_"
}

$activeFiles = Get-ChildItem -Path "C:\Users\lam.dv2\Ortholite Vietnam" -Filter "Sample Orders.xlsx" -Recurse -ErrorAction SilentlyContinue
if ($activeFiles.Count -gt 0) {
    $srcPath = $activeFiles[0].FullName
    Write-Host "Opening remote file: $srcPath"
    try {
        $wb = $xl.Workbooks.Open($srcPath, 0, $true)
        foreach ($ws in $wb.Worksheets) {
            Write-Host $ws.Name
        }
        $wb.Close($false)
    } catch {
        Write-Host "Error remote: $_"
    }
} else {
    Write-Host "No remote Sample Orders.xlsx found."
}

$xl.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($xl) | Out-Null
[GC]::Collect()
