$activeFiles = Get-ChildItem -Path "C:\Users\lam.dv2\Ortholite Vietnam" -Filter "Sample Orders.xlsx" -Recurse -ErrorAction SilentlyContinue
if ($activeFiles.Count -eq 0) {
    Write-Host "No files found"
    exit 1
}
$filePath = $activeFiles[0].FullName
Write-Host "Searching in file: $filePath"

$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false
$wb = $xl.Workbooks.Open($filePath, 0, $true)

$targetOrder = "RPRO-260529-0339"
$found = $false

for ($i = 1; $i -le $wb.Worksheets.Count; $i++) {
    $ws = $wb.Worksheets.Item($i)
    $name = $ws.Name
    
    # Check first 50 rows in column 2 (Firm plan)
    for ($r = 1; $r -le 50; $r++) {
        $val = $ws.Cells.Item($r, 2).Text.Trim()
        if ($val -eq $targetOrder) {
            Write-Host "Found order $targetOrder in sheet: $name at row $r"
            $found = $true
            break
        }
    }
    if ($found) { break }
}

$wb.Close($false)
$xl.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($xl) | Out-Null
[GC]::Collect()
