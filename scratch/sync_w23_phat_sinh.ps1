$ExcelPath = Join-Path (Resolve-Path ".") "ke_hoach_san_xuat.xlsx"
$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false

$sheetName = $null
try {
    $wb = $xl.Workbooks.Open($ExcelPath, 0, $true)
    foreach ($ws in $wb.Worksheets) {
        if ($ws.Name -like "*W23*ph*t*sinh*") {
            $sheetName = $ws.Name
            break
        }
    }
    $wb.Close($false)
} finally {
    $xl.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($xl) | Out-Null
    [GC]::Collect()
}

if ($sheetName -ne $null) {
    Write-Host "Found target sheet: '$sheetName'" -ForegroundColor Green
    # Set console encoding to UTF-8
    $OutputEncoding = [System.Text.Encoding]::UTF8
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    
    # Execute the sync script
    & ".\scripts\sync-excel-to-supabase.ps1" -WeekLabel "W23-2026" -ExcelPath $ExcelPath -SheetName $sheetName
} else {
    Write-Host "Error: Could not find W23 phat sinh sheet!" -ForegroundColor Red
}
