$cwd = Get-Location
$filePath = Join-Path $cwd "ke_hoach_san_xuat.xlsx"
$sheetName = "W19-2026 - L2"

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

try {
    $workbook = $excel.Workbooks.Open($filePath, 0, $true)
    $sheet = $workbook.Sheets.Item($sheetName)
    
    $headers = @()
    for ($r = 1; $r -le 10; $r++) {
        $row = @()
        for ($c = 1; $c -le 15; $c++) {
            $row += $sheet.Cells.Item($r, $c).Text
        }
        Write-Host "Row ${r}: $($row -join ' | ')"
    }
    
    $workbook.Close($false)
} finally {
    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}
