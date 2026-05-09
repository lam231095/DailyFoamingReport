$cwd = Get-Location
$filePath = Join-Path $cwd "ke_hoach_san_xuat.xlsx"
$sheetName = "W19-2026 - L2"

Write-Host "Opening: $filePath"

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

try {
    $workbook = $excel.Workbooks.Open($filePath, 0, $true)
    
    # List all sheet names
    Write-Host "=== All Sheets ==="
    foreach ($s in $workbook.Sheets) {
        Write-Host " -" $s.Name
    }
    
    # Find the sheet
    $sheet = $null
    foreach ($s in $workbook.Sheets) {
        if ($s.Name -eq $sheetName) {
            $sheet = $s
            break
        }
    }
    
    if ($null -eq $sheet) {
        Write-Host "Sheet '$sheetName' not found!"
        $workbook.Close($false)
        return
    }
    
    $usedRange = $sheet.UsedRange
    $rowCount = $usedRange.Rows.Count
    $colCount = $usedRange.Columns.Count
    
    Write-Host "`n=== Sheet: $sheetName ==="
    Write-Host "Rows: $rowCount, Cols: $colCount"
    
    # Print first 10 rows
    Write-Host "`n=== First 10 rows ==="
    for ($r = 1; $r -le [Math]::Min(10, $rowCount); $r++) {
        $row = @()
        for ($c = 1; $c -le $colCount; $c++) {
            $val = $sheet.Cells.Item($r, $c).Text
            $row += "[$c]$val"
        }
        Write-Host "Row $r`: $($row -join ' | ')"
    }
    
    $workbook.Close($false)
} finally {
    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}
