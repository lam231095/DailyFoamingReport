# ==============================================================
# check_bcn_sync_status.ps1
# Kiểm tra các đơn trong sheet "PCN" của file "tiến độ BCN.xlsx"
# so với dữ liệu hiện tại trên Supabase để tìm ra đơn còn thiếu hoặc sai lệch.
# ==============================================================

$SUPABASE_URL = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot

$found = Get-ChildItem -Path $PROJECT_ROOT -Filter "*BCN.xlsx" | Select-Object -First 1
if (-not $found) {
    Write-Host "[ERROR] Không tìm thấy file Excel tiến độ BCN" -ForegroundColor Red
    exit 1
}
$EXCEL_FILE = $found.FullName
Write-Host "File Excel tìm thấy: $EXCEL_FILE" -ForegroundColor Cyan

# Đọc dữ liệu từ Supabase (week_label = 'China CN')
Write-Host "Đang lấy dữ liệu từ Supabase..." -ForegroundColor Yellow
$headers = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
}
$uri = "$SUPABASE_URL/rest/v1/production_plan?week_label=eq.China%20CN&select=firm_plan,no_order,bun_code,pu_code,ten_san_pham,sl_sheet,sl_bun_can_tach,sl_bun_can_do,completion_date,delivery_date"
try {
    $dbRecords = Invoke-RestMethod -Uri $uri -Method Get -Headers $headers
    Write-Host "Tìm thấy $($dbRecords.Count) dòng trên Supabase với week_label = 'China CN'" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Không thể lấy dữ liệu từ Supabase: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Tạo hashtable từ DB để tra cứu nhanh
$dbMap = @{}
foreach ($rec in $dbRecords) {
    $dbMap[$rec.firm_plan] = $rec
}

# Đọc Excel
$TEMP_EXCEL_FILE = Join-Path $PROJECT_ROOT "tiến độ BCN_temp.xlsx"
try {
    Copy-Item -Path $EXCEL_FILE -Destination $TEMP_EXCEL_FILE -Force -ErrorAction Stop
} catch {
    $TEMP_EXCEL_FILE = $EXCEL_FILE
}

$xl = New-Object -ComObject Excel.Application
$xl.Visible       = $false
$xl.DisplayAlerts = $false

$excelRecords = @()

$COL_NO_ORDER   = 2
$COL_FIRM_PLAN  = 3
$COL_BUN_CODE   = 4
$COL_PU_CODE    = 5
$COL_TEN_SP     = 6
$COL_SL_SHEET   = 7
$COL_SL_TACH    = 10
$COL_SL_DO      = 10
$COL_COMPLETION = 12
$COL_DELIVERY   = 13
$DATA_START  = 3

function Parse-Int($val) {
    if ([string]::IsNullOrWhiteSpace($val) -or $val -eq "-") { return $null }
    $clean = ($val -replace ",", "") -replace "\.", ""
    if ($clean -match "^(\d+)") { return [int]$Matches[1] }
    return $null
}

try {
    $wb = $xl.Workbooks.Open($TEMP_EXCEL_FILE, 0, $true)
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
    Write-Host "Đang đọc sheet '$sheetName' ($nr dòng)..." -ForegroundColor Yellow

    for ($r = $DATA_START; $r -le $nr; $r++) {
        $firmPlan = $ws.Cells.Item($r, $COL_FIRM_PLAN).Text.Trim()
        if ([string]::IsNullOrWhiteSpace($firmPlan)) { continue }
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
            row_index       = $r
        }
        $excelRecords += $record
    }
    $wb.Close($false)
} finally {
    $xl.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($xl) | Out-Null
    [GC]::Collect()
    if ($TEMP_EXCEL_FILE -ne $EXCEL_FILE -and (Test-Path $TEMP_EXCEL_FILE)) {
        Remove-Item -Path $TEMP_EXCEL_FILE -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "Tìm thấy $($excelRecords.Count) dòng trong Excel hợp lệ." -ForegroundColor Green

# So sánh
$missing = @()
$different = @()

foreach ($exRec in $excelRecords) {
    $fp = $exRec.firm_plan
    if (-not $dbMap.ContainsKey($fp)) {
        $missing += $exRec
    } else {
        $dbRec = $dbMap[$fp]
        $diffCols = @()
        
        # So sánh các trường chính
        if ($exRec.no_order -ne $dbRec.no_order) { $diffCols += "no_order: '$($exRec.no_order)' vs '$($dbRec.no_order)'" }
        if ($exRec.bun_code -ne $dbRec.bun_code) { $diffCols += "bun_code: '$($exRec.bun_code)' vs '$($dbRec.bun_code)'" }
        if ($exRec.pu_code -ne $dbRec.pu_code) { $diffCols += "pu_code: '$($exRec.pu_code)' vs '$($dbRec.pu_code)'" }
        if ($exRec.ten_san_pham -ne $dbRec.ten_san_pham) { $diffCols += "ten_san_pham: '$($exRec.ten_san_pham)' vs '$($dbRec.ten_san_pham)'" }
        
        $exSlSheet = $exRec.sl_sheet
        $dbSlSheet = $dbRec.sl_sheet
        if ($exSlSheet -ne $dbSlSheet) { $diffCols += "sl_sheet: $exSlSheet vs $dbSlSheet" }
        
        $exSlTach = $exRec.sl_bun_can_tach
        $dbSlTach = $dbRec.sl_bun_can_tach
        if ($exSlTach -ne $dbSlTach) { $diffCols += "sl_bun_can_tach: $exSlTach vs $dbSlTach" }
        
        $exComp = $exRec.completion_date
        $dbComp = $dbRec.completion_date
        # Chuẩn hóa ngày để so sánh
        if ($exComp -ne $dbComp) { $diffCols += "completion_date: '$exComp' vs '$dbComp'" }

        if ($diffCols.Count -gt 0) {
            $diffObj = [ordered]@{
                firm_plan = $fp
                row_index = $exRec.row_index
                diffs     = $diffCols -join "; "
            }
            $different += $diffObj
        }
    }
}

Write-Host ""
Write-Host "=== KẾT QUẢ SO SÁNH ===" -ForegroundColor Cyan
Write-Host "1. Các đơn CÒN THIẾU trên Supabase (chưa được push):" -ForegroundColor Yellow
if ($missing.Count -eq 0) {
    Write-Host "   -> Không có đơn nào bị thiếu!" -ForegroundColor Green
} else {
    foreach ($m in $missing) {
        Write-Host "   - Dòng $($m.row_index): $($m.firm_plan) | Đơn: $($m.no_order) | Mã BUN: $($m.bun_code) | Sản phẩm: $($m.ten_san_pham) | SL: $($m.sl_sheet)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "2. Các đơn SAI KHÁC giữa Excel và Supabase (cần cập nhật):" -ForegroundColor Yellow
if ($different.Count -eq 0) {
    Write-Host "   -> Không có đơn nào sai khác!" -ForegroundColor Green
} else {
    foreach ($d in $different) {
        Write-Host "   - Dòng $($d.row_index): $($d.firm_plan) | Khác biệt: $($d.diffs)" -ForegroundColor DarkYellow
    }
}
