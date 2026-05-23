$cwd = Get-Location
$filePath = Join-Path $cwd "ke_hoach_san_xuat.xlsx"
$sheetName = "W20-2026 -L2"

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

try {
    $workbook = $excel.Workbooks.Open($filePath, 0, $true)
    $sheet = $workbook.Sheets.Item($sheetName)
    $usedRange = $sheet.UsedRange
    $rowCount = $usedRange.Rows.Count
    $colCount = $usedRange.Columns.Count
    
    Write-Host "=== Sheet: $sheetName ==="
    Write-Host "Rows: $rowCount, Cols: $colCount"
    
    # Print first 10 rows
    Write-Host "`n=== First 10 rows ==="
    for ($r = 1; $r -le [Math]::Min(10, $rowCount); $r++) {
        $row = @()
        for ($c = 1; $c -le [Math]::Min(20, $colCount); $c++) {
            $val = $sheet.Cells.Item($r, $c).Text
            $row += "[$c]$val"
        }
        Write-Host "Row $($r): $($row -join ' | ')"
    }
    
    $workbook.Close($false)
} finally {
    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}
