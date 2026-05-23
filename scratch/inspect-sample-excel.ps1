# scratch/inspect-sample-excel.ps1
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PROJECT_ROOT = Resolve-Path "."

# Find Excel files containing "Sample"
$excelFiles = Get-ChildItem -Path $PROJECT_ROOT -Filter "*Sample*.xlsx"
if ($excelFiles.Count -eq 0) {
    Write-Host "[ERROR] Không tìm thấy file Excel nào chứa chữ 'Sample' ở: $PROJECT_ROOT" -ForegroundColor Red
    exit 1
}

$EXCEL_FILE = $excelFiles[0].FullName
Write-Host "Found file: $EXCEL_FILE" -ForegroundColor Green

$xl = New-Object -ComObject Excel.Application
$xl.Visible        = $false
$xl.DisplayAlerts  = $false

try {
    $wb = $xl.Workbooks.Open($EXCEL_FILE, 0, $true)
    $sheetCount = $wb.Worksheets.Count
    Write-Host "Total Worksheets: ${sheetCount}" -ForegroundColor Green

    for ($i = 1; $i -le $sheetCount; $i++) {
        $ws = $wb.Worksheets.Item($i)
        $nr = $ws.UsedRange.Rows.Count
        $nc = $ws.UsedRange.Columns.Count
        $wsName = $ws.Name
        Write-Host "Sheet ${i}: '${wsName}' (${nr} rows, ${nc} columns)" -ForegroundColor Cyan
        
        if ($nr -ge 1) {
            Write-Host "  First 15 rows:"
            for ($r = 1; $r -le [Math]::Min($nr, 15); $r++) {
                $rowVals = @()
                for ($c = 1; $c -le [Math]::Min($nc, 25); $c++) {
                    $rowVals += $ws.Cells.Item($r, $c).Text.Trim()
                }
                $joined = $rowVals -join " | "
                Write-Host "    Row ${r}: ${joined}"
            }
        }
    }
    $wb.Close($false)
} finally {
    $xl.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($xl) | Out-Null
    [GC]::Collect()
}
