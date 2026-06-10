# ==============================================================
# sync-bcn-pcn.ps1
# Đọc sheet "hàng PCN" trong "tiến độ BCN.xlsx" và UPSERT lên Supabase
# Chạy: powershell -ExecutionPolicy Bypass -File ".\scripts\sync-bcn-pcn.ps1"
# ==============================================================

# ---- CONFIG ----
$SUPABASE_URL = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot

# Tìm file Excel tiến độ BCN dynamically
$found = Get-ChildItem -Path $PROJECT_ROOT -Filter "*BCN.xlsx" | Select-Object -First 1
if (-not $found) {
    Write-Host "[ERROR] Không tìm thấy file Excel tiến độ BCN" -ForegroundColor Red
    exit 1
}
$EXCEL_FILE = $found.FullName

# Layout cột (1-indexed) dựa theo sheet hàng PCN
$COL_NO_ORDER   = 2     # No. order.
$COL_FIRM_PLAN  = 3     # Firm plan
$COL_BUN_CODE   = 4     # BUN CODE
$COL_PU_CODE    = 5     # PU CODE
$COL_TEN_SP     = 6     # PU DESCRIPTION
$COL_SL_SHEET   = 7     # QTY of Order (Sheet)
$COL_SL_TACH    = 10    # So Bun lanh
$COL_SL_DO      = 10    # So Bun lanh
$COL_COMPLETION = 12    # Ngay tach = ETD Bun
$COL_DELIVERY   = 13    # Ngay giao hang (In tren don 1)

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
        "Content-Type"  = "application/json; charset=utf-8"
        "Prefer"        = "resolution=merge-duplicates,return=minimal"
    }

    # Convert to UTF-8 bytes to prevent encoding issues
    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($json)

    try {
        Invoke-RestMethod `
            -Uri "$SUPABASE_URL/rest/v1/production_plan?on_conflict=firm_plan" `
            -Method Post `
            -Headers $headers `
            -Body $bodyBytes `
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
$OutputEncoding = [System.Text.Encoding]::UTF8
Write-Host "  BCN/PCN PLAN → SUPABASE SYNC" -ForegroundColor Cyan
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Sao chép file Excel thành bản tạm để tránh bị khóa (lock) bởi Excel của người dùng
$TEMP_EXCEL_FILE = Join-Path $PROJECT_ROOT "tiến độ BCN_temp.xlsx"
try {
    Copy-Item -Path $EXCEL_FILE -Destination $TEMP_EXCEL_FILE -Force -ErrorAction Stop
    Write-Host "  -> Đã tạo bản sao tạm thời để đọc dữ liệu." -ForegroundColor Green
} catch {
    Write-Host "  -> [WARNING] Không thể tạo bản sao tạm thời, thử đọc trực tiếp: $($_.Exception.Message)" -ForegroundColor Yellow
    $TEMP_EXCEL_FILE = $EXCEL_FILE
}

Write-Host "[1/3] Mở file: $TEMP_EXCEL_FILE" -ForegroundColor Yellow

$xl = New-Object -ComObject Excel.Application
$xl.Visible       = $false
$xl.DisplayAlerts = $false

# Map firm_plan -> record (để xử lý trùng lặp)
$planMap = [System.Collections.Generic.Dictionary[string,object]]::new()

try {
    $wb = $xl.Workbooks.Open($TEMP_EXCEL_FILE, 0, $true)
    
    # Tìm sheet có tên chứa "PCN"
    $ws = $null
    foreach ($s in $wb.Worksheets) {
        if ($s.Name -like "*PCN*") {
            $ws = $s
            break
        }
    }

    if (-not $ws) {
        Write-Host "[ERROR] Không tìm thấy sheet nào chứa tên 'PCN'" -ForegroundColor Red
        $wb.Close($false)
        exit 1
    }

    $sheetName = $ws.Name
    $nr = $ws.UsedRange.Rows.Count

    Write-Host "[1/3] Đang đọc sheet '$sheetName' ($nr rows)" -ForegroundColor Green

    $sheetCount_rows = 0

    for ($r = $DATA_START; $r -le $nr; $r++) {
        $firmPlan = $ws.Cells.Item($r, $COL_FIRM_PLAN).Text.Trim()
        
        # Bỏ qua nếu dòng rỗng hoặc không có firm plan
        if ([string]::IsNullOrWhiteSpace($firmPlan)) { continue }

        # Chỉ lấy mã FPRO hoặc RPRO
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

        # Nếu compDate rỗng, dùng delDate làm completion_date
        if ($compDate -eq "") { $compDate = $delDate }

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
            week_label      = "China CN"
            synced_at       = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
        }

        $planMap[$firmPlan] = $record
        $sheetCount_rows++
    }

    $wb.Close($false)
} finally {
    $xl.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($xl) | Out-Null
    [GC]::Collect()

    # Xóa file tạm thời nếu đã được tạo
    if ($TEMP_EXCEL_FILE -ne $EXCEL_FILE -and (Test-Path $TEMP_EXCEL_FILE)) {
        try {
            Remove-Item -Path $TEMP_EXCEL_FILE -Force -ErrorAction Stop
            Write-Host "  -> Đã xóa bản sao tạm thời." -ForegroundColor Green
        } catch {
            Write-Host "  -> [WARNING] Không thể xóa bản sao tạm thời: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
}

$records   = @($planMap.Values)
$totalRec  = $records.Count
Write-Host ""
Write-Host "[2/3] Tổng cộng $totalRec dòng unique từ sheet '$sheetName'" -ForegroundColor Green

if ($totalRec -eq 0) {
    Write-Host "[WARNING] Không có dòng dữ liệu nào để sync!" -ForegroundColor Yellow
    exit 0
}

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
