# ==============================================================
# check_failures.ps1
# Sao chép từ sync-sample-plan.ps1 nhưng in chi tiết lỗi 400 Bad Request từ Supabase
# ==============================================================

$SUPABASE_URL = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
$PROJECT_ROOT = Resolve-Path "."

$EXCEL_FILE = Join-Path $PROJECT_ROOT "Kế hoach sản xuất Sample.xlsx"

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

$DATA_START  = 3

function Parse-Int($val) {
    if ($val -eq $null -or [string]::IsNullOrWhiteSpace($val) -or $val -eq "-") { return $null }
    $clean = ($val.ToString() -replace ",", "") -replace "\.", ""
    if ($clean -match "^(\d+)") { return [int]$Matches[1] }
    return $null
}

function Format-DateString($val) {
    if ($val -eq $null -or [string]::IsNullOrWhiteSpace($val)) { return $null }
    if ($val.ToString() -match "(\d{1,2})/(\d{1,2})/(\d{4})") {
        try {
            return [datetime]::ParseExact($val.ToString(), "d/M/yyyy", $null).ToString("yyyy-MM-dd")
        } catch {
            try {
                return [datetime]::ParseExact($val.ToString(), "M/d/yyyy", $null).ToString("yyyy-MM-dd")
            } catch {
                return $val.ToString()
            }
        }
    }
    return $val.ToString()
}

function Test-Upload-Record($record) {
    $batch = @($record)
    $json = $batch | ConvertTo-Json -Compress -Depth 3

    $headers = @{
        "apikey"        = $SUPABASE_KEY
        "Authorization" = "Bearer $SUPABASE_KEY"
        "Content-Type"  = "application/json"
        "Prefer"        = "resolution=merge-duplicates,return=minimal"
    }

    try {
        Invoke-RestMethod `
            -Uri "$SUPABASE_URL/rest/v1/production_plan?on_conflict=firm_plan" `
            -Method Post `
            -Headers $headers `
            -Body $json `
            -ErrorAction Stop | Out-Null
        return $true
    } catch {
        $msg = $_.Exception.Message
        $details = ""
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $details = $reader.ReadToEnd()
        }
        Write-Host "    [FAIL] FirmPlan: $($record.firm_plan) | Error: $msg | Details: $details" -ForegroundColor Red
        return $false
    }
}

Write-Host "Mở file: $EXCEL_FILE"
$xl = New-Object -ComObject Excel.Application
$xl.Visible       = $false
$xl.DisplayAlerts = $false

$planMap = [System.Collections.Generic.Dictionary[string,object]]::new()

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
        for ($r = $DATA_START; $r -le 1000; $r++) {
            $firmPlan = $ws.Cells.Item($r, $col_firm_plan).Text.Trim()
            if ([string]::IsNullOrWhiteSpace($firmPlan)) {
                $consecutiveEmpty++
                if ($consecutiveEmpty -ge 15) { break }
                continue
            }
            $consecutiveEmpty = 0
            
            if ($firmPlan -notmatch "^[FR]PRO-") { continue }
            
            $noOrder  = $ws.Cells.Item($r, $col_no_order).Text.Trim()
            $bunCode  = $ws.Cells.Item($r, $col_bun_code).Text.Trim()
            $puCode   = $ws.Cells.Item($r, $col_pu_code).Text.Trim()
            $tenSP    = ($ws.Cells.Item($r, $col_ten_sp).Text.Trim()) -replace "`r`n"," " -replace "`n"," "
            $slSheet  = $ws.Cells.Item($r, $col_sl_sheet).Text.Trim()
            $slTach   = $ws.Cells.Item($r, $col_sl_tach).Text.Trim()
            
            $slDo = ""
            if ($col_sl_do -le 50) {
                $slDo = $ws.Cells.Item($r, $col_sl_do).Text.Trim()
            }
            
            $compDate = $ws.Cells.Item($r, $col_completion).Text.Trim()
            $delDate  = $ws.Cells.Item($r, $col_delivery).Text.Trim()
            if ($delDate -eq "") { $delDate = $compDate }
            
            $cDate = Format-DateString $compDate
            $dDate = Format-DateString $delDate

            $record = [ordered]@{
                firm_plan       = $firmPlan
                no_order        = if ($noOrder -ne "") { $noOrder } else { $null }
                bun_code        = if ($bunCode -ne "") { $bunCode } else { $null }
                pu_code         = if ($puCode -ne "") { $puCode }   else { $null }
                ten_san_pham    = if ($tenSP -ne "") { $tenSP }    else { $null }
                sl_sheet        = Parse-Int $slSheet
                sl_bun_can_tach = Parse-Int $slTach
                sl_bun_can_do   = Parse-Int $slDo
                completion_date = if ($cDate -ne "") { $cDate } else { $null }
                delivery_date   = if ($dDate -ne "") { $dDate }   else { $null }
                week_label      = "Sample"
                synced_at       = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
            }
            $planMap[$firmPlan] = $record
        }
    }
    $wb.Close($false)
} finally {
    $xl.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($xl) | Out-Null
    [GC]::Collect()
}

$records = @($planMap.Values)
Write-Host "Tổng số records unique: $($records.Count)"
Write-Host "Đang kiểm tra tải lên từng record bị lỗi..."

$successCount = 0
$failCount = 0

foreach ($rec in $records) {
    # Thử upload record
    $res = Test-Upload-Record $rec
    if ($res) {
        $successCount++
    } else {
        $failCount++
    }
}

Write-Host "Hoàn thành! Thành công: $successCount | Thất bại: $failCount"
