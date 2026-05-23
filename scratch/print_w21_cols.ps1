$cwd = Get-Location
$filePath = Join-Path $cwd "ke_hoach_san_xuat.xlsx"
$sheetName = "W21-2026 - L1"

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

try {
    $workbook = $excel.Workbooks.Open($filePath, 0, $true)
    $sheet = $workbook.Sheets.Item($sheetName)
    $usedRange = $sheet.UsedRange
    $rowCount = $usedRange.Rows.Count
    
    Write-Host "=== Inspecting non-empty rows for Col 17 and 18 ==="
    $count = 0
    for ($r = 3; $r -le $rowCount; $r++) {
        $firmPlan = $sheet.Cells.Item($r, 2).Text.Trim()
        if ([string]::IsNullOrWhiteSpace($firmPlan)) { continue }
        
        $c17 = $sheet.Cells.Item($r, 17).Text.Trim()
        $c18 = $sheet.Cells.Item($r, 18).Text.Trim()
        
        Write-Host "Row $r -> Firm: $firmPlan | Col 17: $c17 | Col 18: $c18"
        $count++
        if ($count -ge 15) { break }
    }
    
    $workbook.Close($false)
} finally {
    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}
