# ==============================================================
# sync-foaming-plan.ps1
# Đọc TẤT CẢ sheet trong "Foaming Plan.xlsx" và UPSERT lên Supabase
# Khi firm_plan trùng, dữ liệu tuần sau sẽ ghi đè tuần trước (merge-duplicates)
# Chạy: powershell -ExecutionPolicy Bypass -File ".\scripts\sync-foaming-plan.ps1"
# ==============================================================

# ---- CONFIG ----
$SUPABASE_URL = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot
$EXCEL_FILE   = Join-Path $PROJECT_ROOT "Foaming Plan.xlsx"

# Layout cột (1-indexed) — giống W17
$COL_NO_ORDER   = 1
$COL_FIRM_PLAN  = 2
$COL_BUN_CODE   = 5
$COL_PU_CODE    = 6
$COL_TEN_SP     = 7
$COL_SL_SHEET   = 8
$COL_SL_TACH    = 9
$COL_SL_DO      = 14
$COL_COMPLETION = 17
$COL_DELIVERY   = 18

$HEADER_ROW  = 2
$DATA_START  = 3

# ---- FUNCTIONS ----

function Parse-Int($val) {
    if ([string]::IsNullOrWhiteSpace($val) -or $val -eq "-") { return $null }
    $clean = ($val -replace ",", "") -replace "\.", ""
    if ($clean -match "^(\d+)") { return [int]$Matches[1] }
    return $null
}

function Upload-Batch($batch) {
    $json = $batch | ConvertTo-Json -Compress -Depth 3
    if ($batch.Count -eq 1) { $json = "[$json]" }

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
        Write-Host "  [ERROR] $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# ---- MAIN ----
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FOAMING PLAN → SUPABASE SYNC" -ForegroundColor Cyan
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if (-not (Test-Path $EXCEL_FILE)) {
    Write-Host "[ERROR] Không tìm thấy: $EXCEL_FILE" -ForegroundColor Red
    exit 1
}

Write-Host "[1/3] Mở file: $EXCEL_FILE" -ForegroundColor Yellow

$xl = New-Object -ComObject Excel.Application
$xl.Visible       = $false
$xl.DisplayAlerts = $false

# Map firm_plan -> record (để xử lý trùng lặp, tuần sau ghi đè tuần trước)
$planMap = [System.Collections.Generic.Dictionary[string,object]]::new()

try {
    $wb         = $xl.Workbooks.Open($EXCEL_FILE, 0, $true)
    $sheetCount = $wb.Worksheets.Count

    Write-Host "[1/3] Tìm thấy $sheetCount sheet(s)" -ForegroundColor Green

    # Đọc TẤT CẢ sheet theo thứ tự (sheet sau ghi đè sheet trước khi trùng firm_plan)
    for ($si = 1; $si -le $sheetCount; $si++) {
        $ws       = $wb.Worksheets.Item($si)
        $sheetName = $ws.Name
        $nr       = $ws.UsedRange.Rows.Count

        Write-Host ""
        Write-Host "  Sheet [$si/$sheetCount]: '$sheetName' ($nr rows)" -ForegroundColor Magenta

        # Đoán WeekLabel từ tên sheet (VD: W17, W18, W19...)
        if ($sheetName -match "W(\d+)") {
            $weekLabel = "W$($Matches[1])-2026"
        } else {
            $weekLabel = $sheetName
        }

        $sheetCount_rows = 0

        for ($r = $DATA_START; $r -le $nr; $r++) {
            $firmPlan = $ws.Cells.Item($r, $COL_FIRM_PLAN).Text.Trim()
            if ([string]::IsNullOrWhiteSpace($firmPlan)) { continue }

            # Bỏ qua nếu không phải FPRO hoặc RPRO
            if ($firmPlan -notmatch "^[FR]PRO-") { continue }

            $noOrder  = $ws.Cells.Item($r, $COL_NO_ORDER).Text.Trim()
            $bunCode  = $ws.Cells.Item($r, $COL_BUN_CODE).Text.Trim()
            $puCode   = $ws.Cells.Item($r, $COL_PU_CODE).Text.Trim()
            $tenSP    = ($ws.Cells.Item($r, $COL_TEN_SP).Text.Trim()) -replace "`r`n"," " -replace "`n"," "
            $slSheet  = $ws.Cells.Item($r, $COL_SL_SHEET).Text.Trim()
            $slTach   = $ws.Cells.Item($r, $COL_SL_TACH).Text.Trim()
            $slDo     = $ws.Cells.Item($r, $COL_SL_DO).Text.Trim()
            $compDate = $ws.Cells.Item($r, $COL_COMPLETION).Text.Trim()
            $delDate  = $ws.Cells.Item($r, $COL_DELIVERY).Text.Trim()

            $record = [ordered]@{
                firm_plan       = $firmPlan
                no_order        = if ($noOrder  -ne "") { $noOrder }  else { $null }
                bun_code        = if ($bunCode  -ne "") { $bunCode }  else { $null }
                pu_code         = if ($puCode   -ne "") { $puCode }   else { $null }
                ten_san_pham    = if ($tenSP    -ne "") { $tenSP }    else { $null }
                sl_sheet        = Parse-Int $slSheet
                sl_bun_can_tach = Parse-Int $slTach
                sl_bun_can_do   = Parse-Int $slDo
                completion_date = if ($compDate -ne "") { $compDate } else { $null }
                delivery_date   = if ($delDate  -ne "") { $delDate }  else { $null }
                week_label      = $weekLabel
                synced_at       = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
            }

            # Ghi đè nếu đã tồn tại (tuần sau > tuần trước)
            $planMap[$firmPlan] = $record
            $sheetCount_rows++
        }

        Write-Host "  → Đọc được $sheetCount_rows dòng hợp lệ từ '$sheetName'" -ForegroundColor Green
    }

    $wb.Close($false)
} finally {
    $xl.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($xl) | Out-Null
    [GC]::Collect()
}

$records   = @($planMap.Values)
$totalRec  = $records.Count
Write-Host ""
Write-Host "[2/3] Tổng cộng $totalRec dòng unique sau khi gộp (tuần sau ghi đè tuần trước)" -ForegroundColor Green

# ---- UPLOAD ----
Write-Host "[3/3] Upload lên Supabase..." -ForegroundColor Yellow

$batchSize = 25
$uploaded  = 0
$failed    = 0

for ($i = 0; $i -lt $totalRec; $i += $batchSize) {
    $batch     = $records[$i..([Math]::Min($i + $batchSize - 1, $totalRec - 1))]
    $batchNum  = [Math]::Floor($i / $batchSize) + 1
    $batchTotal= [Math]::Ceiling($totalRec / $batchSize)

    Write-Host "  Batch $batchNum/$batchTotal ($($batch.Count) records)..." -NoNewline

    if (Upload-Batch $batch) {
        $uploaded += $batch.Count
        Write-Host " OK" -ForegroundColor Green
    } else {
        $failed += $batch.Count
        Write-Host " FAILED" -ForegroundColor Red
    }

    Start-Sleep -Milliseconds 300
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DONE! Uploaded: $uploaded | Failed: $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Yellow" })
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
