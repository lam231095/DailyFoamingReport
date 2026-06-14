# ==============================================================
# inspect_failed_details.ps1
# Đọc 4 records bị lỗi từ Excel để kiểm tra giá trị thô và đã parse
# ==============================================================

$EXCEL_FILE = Join-Path (Resolve-Path ".") "Kế hoach sản xuất Sample.xlsx"
$FAILED_PLANS = @("RPRO-251226-0807", "RPRO-260313-0150", "RPRO-260325-0410", "RPRO-260421-0627")

$COL_NO_ORDER   = 1
$COL_FIRM_PLAN  = 2
$COL_BUN_CODE   = 3
$COL_PU_CODE    = 4
$COL_TEN_SP     = 5
$COL_SL_SHEET   = 6
$COL_SL_TACH    = 7
$COL_SL_DO      = 8
$COL_COMPLETION = 14
$COL_DELIVERY   = 15

$xl = New-Object -ComObject Excel.Application
$xl.Visible       = $false
$xl.DisplayAlerts = $false

try {
    $wb         = $xl.Workbooks.Open($EXCEL_FILE, 0, $true)
    $sheetCount = $wb.Worksheets.Count

    for ($si = 1; $si -le $sheetCount; $si++) {
        $ws       = $wb.Worksheets.Item($si)
        $sheetName = $ws.Name
        
        $col_no_order   = $COL_NO_ORDER
        $col_firm_plan  = $COL_FIRM_PLAN
        $col_bun_code   = $COL_BUN_CODE
        $col_pu_code    = $COL_PU_CODE
        $col_ten_sp     = $COL_TEN_SP
        $col_sl_sheet   = $COL_SL_SHEET
        $col_sl_tach    = $COL_SL_TACH
        $col_sl_do      = $COL_SL_DO
        $col_completion = $COL_COMPLETION
        $col_delivery   = $COL_DELIVERY

        if ($sheetName -match "BCN") {
            $col_no_order   = 1
            $col_firm_plan  = 2
            $col_bun_code   = 3
            $col_pu_code    = 4
            $col_ten_sp     = 5
            $col_sl_sheet   = 6
            $col_sl_tach    = 7
            $col_sl_do      = 99
            $col_completion = 12
            $col_delivery   = 12
        }

        $consecutiveEmpty = 0
        for ($r = 3; $r -le 1000; $r++) {
            $firmPlan = $ws.Cells.Item($r, $col_firm_plan).Text.Trim()
            if ([string]::IsNullOrWhiteSpace($firmPlan)) {
                $consecutiveEmpty++
                if ($consecutiveEmpty -ge 15) { break }
                continue
            }
            $consecutiveEmpty = 0
            
            if ($FAILED_PLANS -contains $firmPlan) {
                Write-Host "--- Found $firmPlan in Sheet '$sheetName', Row $r ---" -ForegroundColor Yellow
                Write-Host "  Raw No Order:   '$($ws.Cells.Item($r, $col_no_order).Text)'"
                Write-Host "  Raw Bun Code:   '$($ws.Cells.Item($r, $col_bun_code).Text)'"
                Write-Host "  Raw PU Code:    '$($ws.Cells.Item($r, $col_pu_code).Text)'"
                Write-Host "  Raw Ten SP:     '$($ws.Cells.Item($r, $col_ten_sp).Text)'"
                Write-Host "  Raw SL Sheet:   '$($ws.Cells.Item($r, $col_sl_sheet).Text)'"
                Write-Host "  Raw SL Tach:    '$($ws.Cells.Item($r, $col_sl_tach).Text)'"
                Write-Host "  Raw SL Do:      '$($ws.Cells.Item($r, $col_sl_do).Text)'"
                Write-Host "  Raw Completion: '$($ws.Cells.Item($r, $col_completion).Text)'"
                Write-Host "  Raw Delivery:   '$($ws.Cells.Item($r, $col_delivery).Text)'"
            }
        }
    }
    $wb.Close($false)
} finally {
    $xl.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($xl) | Out-Null
    [GC]::Collect()
}
