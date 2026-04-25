# ==============================================================
# sync-excel-to-supabase.ps1
# Đọc file Excel W16 và UPSERT dữ liệu lên Supabase
# Chạy thủ công: powershell -ExecutionPolicy Bypass -File ".\scripts\sync-excel-to-supabase.ps1"
# ==============================================================

param(
    [string]$WeekLabel = "W17-2026",
    [string]$ExcelPath = ""
)

# ---- CONFIG ----
$SUPABASE_URL  = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
$PROJECT_ROOT  = Split-Path -Parent $PSScriptRoot   # thư mục cha của scripts/

if ($ExcelPath -ne "") {
    $EXCEL_FILE = $ExcelPath
} else {
    $EXCEL_FILE = (Get-ChildItem -Path $PROJECT_ROOT -Filter "W17*.xlsx" | Select-Object -First 1).FullName
    if (-not $EXCEL_FILE) { 
        $EXCEL_FILE = (Get-ChildItem -Path $PROJECT_ROOT -Filter "*.xlsx" | Select-Object -First 1).FullName
    }
}

# Header row = 2, data bắt đầu từ row 3 (W17 layout)
$HEADER_ROW   = 2
$DATA_START   = 3

# Cột tương ứng
$COL_FIRM_PLAN    = 2
$COL_BUN_CODE     = 5
$COL_PU_CODE      = 6
$COL_TEN_SP       = 7
$COL_SL_SHEET     = 8
$COL_SL_TACH      = 9
$COL_SL_DO        = 14

# ---- FUNCTIONS ----

function Parse-Int($val) {
    if ([string]::IsNullOrWhiteSpace($val) -or $val -eq "-") { return $null }
    # Xóa dấu phẩy, lấy phần số đầu tiên (tránh "107-6")
    $clean = $val -replace ",", "" -replace "\.", ""
    if ($clean -match "^(\d+)") { return [int]$Matches[1] }
    return $null
}

function Upload-Batch($batch) {
    $json = $batch | ConvertTo-Json -Compress -Depth 3
    # Nếu chỉ 1 item, ConvertTo-Json trả object thay vì array
    if ($batch.Count -eq 1) { $json = "[$json]" }

    $headers = @{
        "apikey"        = $SUPABASE_KEY
        "Authorization" = "Bearer $SUPABASE_KEY"
        "Content-Type"  = "application/json"
        "Prefer"        = "resolution=merge-duplicates,return=minimal"
    }

    try {
        $resp = Invoke-RestMethod `
            -Uri "$SUPABASE_URL/rest/v1/production_plan?on_conflict=firm_plan" `
            -Method Post `
            -Headers $headers `
            -Body $json `
            -ErrorAction Stop
        return $true
    } catch {
        $errMsg = $_.Exception.Message
        Write-Host "  [ERROR] Upload failed: $errMsg" -ForegroundColor Red
        return $false
    }
}

# ---- MAIN ----

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  EXCEL → SUPABASE SYNC" -ForegroundColor Cyan
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Kiểm tra file tồn tại
if (-not (Test-Path $EXCEL_FILE)) {
    Write-Host "[ERROR] Không tìm thấy file Excel: $EXCEL_FILE" -ForegroundColor Red
    exit 1
}

Write-Host "[1/3] Đang mở file Excel..." -ForegroundColor Yellow

# Mở Excel
$xl = New-Object -ComObject Excel.Application
$xl.Visible        = $false
$xl.DisplayAlerts  = $false

try {
    $wb = $xl.Workbooks.Open($EXCEL_FILE, 0, $true)  # ReadOnly = true
    $ws = $wb.Worksheets.Item(1)
    $nr = $ws.UsedRange.Rows.Count

    Write-Host "[1/3] Đã mở sheet '$($ws.Name)' - $nr rows" -ForegroundColor Green

    Write-Host "[2/3] Đang đọc dữ liệu..." -ForegroundColor Yellow

    $records = [System.Collections.Generic.List[object]]::new()

    for ($r = $DATA_START; $r -le $nr; $r++) {
        $firmPlan = $ws.Cells.Item($r, $COL_FIRM_PLAN).Text.Trim()
        $bunCode  = $ws.Cells.Item($r, $COL_BUN_CODE).Text.Trim()
        $puCode   = $ws.Cells.Item($r, $COL_PU_CODE).Text.Trim()
        $tenSP    = $ws.Cells.Item($r, $COL_TEN_SP).Text.Trim() -replace "`r`n", " " -replace "`n", " "
        $slSheet  = $ws.Cells.Item($r, $COL_SL_SHEET).Text.Trim()
        $slTach   = $ws.Cells.Item($r, $COL_SL_TACH).Text.Trim()
        $slDo     = $ws.Cells.Item($r, $COL_SL_DO).Text.Trim()

        # Bỏ qua dòng không có Firm Plan
        if ([string]::IsNullOrWhiteSpace($firmPlan)) { continue }

        $record = [ordered]@{
            firm_plan       = $firmPlan
            bun_code        = if ($bunCode  -ne "") { $bunCode }  else { $null }
            pu_code         = if ($puCode   -ne "") { $puCode }   else { $null }
            ten_san_pham    = if ($tenSP    -ne "") { $tenSP }    else { $null }
            sl_sheet        = Parse-Int $slSheet
            sl_bun_can_tach = Parse-Int $slTach
            sl_bun_can_do   = Parse-Int $slDo
            week_label      = $WeekLabel
            synced_at       = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
        }

        $records.Add($record)
    }

    Write-Host "[2/3] Đọc được $($records.Count) dòng dữ liệu hợp lệ" -ForegroundColor Green

    $wb.Close($false)
} finally {
    $xl.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($xl) | Out-Null
    [GC]::Collect()
}

# Upload theo batch 25 records mỗi lần
Write-Host "[3/3] Đang upload lên Supabase..." -ForegroundColor Yellow

$batchSize  = 25
$total      = $records.Count
$uploaded   = 0
$failed     = 0

for ($i = 0; $i -lt $total; $i += $batchSize) {
    $batch = $records | Select-Object -Skip $i -First $batchSize
    $batchNum = [Math]::Floor($i / $batchSize) + 1
    $batchTotal = [Math]::Ceiling($total / $batchSize)

    Write-Host "  Batch ${batchNum}/${batchTotal} ($($batch.Count) records)..." -NoNewline

    $ok = Upload-Batch $batch
    if ($ok) {
        $uploaded += $batch.Count
        Write-Host " OK" -ForegroundColor Green
    } else {
        $failed += $batch.Count
        Write-Host " FAILED" -ForegroundColor Red
    }

    Start-Sleep -Milliseconds 300  # Tránh rate limit
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DONE! Uploaded: $uploaded | Failed: $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Yellow" })
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
