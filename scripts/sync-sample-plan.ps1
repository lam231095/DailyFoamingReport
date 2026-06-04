param(
    [string]$TargetSheet = ""
)

# ==============================================================
# sync-sample-plan.ps1
# Đọc sheet trong "Kế hoach sản xuất Sample.xlsx" và UPSERT lên Supabase
# Sử dụng phương pháp đọc từng ô với cơ chế early-exit để tránh lỗi treo UsedRange.
# ==============================================================

# ---- CONFIG ----
$SUPABASE_URL = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
$PROJECT_ROOT = Resolve-Path "."

# Tìm file nguồn Sample Orders.xlsx từ thư mục hệ thống của người dùng
Write-Host "[0/3] Đang tìm kiếm file Sample Orders.xlsx mới nhất..." -ForegroundColor Yellow
$activeFiles = Get-ChildItem -Path "C:\Users\lam.dv2\Ortholite Vietnam" -Filter "Sample Orders.xlsx" -Recurse -ErrorAction SilentlyContinue

$EXCEL_FILE = $null

if ($activeFiles.Count -gt 0) {
    $srcPath = $activeFiles[0].FullName
    $EXCEL_FILE = $srcPath
    Write-Host "  -> Tìm thấy file gốc tại: $srcPath" -ForegroundColor Green
    
    # Cố gắng sao chép vào dự phòng, bỏ qua nếu bị khóa (lock)
    try {
        $destPath = Join-Path $PROJECT_ROOT "Kế hoach sản xuất Sample.xlsx"
        Copy-Item -Path $srcPath -Destination $destPath -Force -ErrorAction Stop
        Write-Host "  -> Đã cập nhật bản sao dự phòng tại workspace." -ForegroundColor Green
    } catch {
        Write-Host "  -> [INFO] Bản sao tại workspace đang bị khóa. Đọc trực tiếp từ file gốc." -ForegroundColor Yellow
    }
} else {
    Write-Host "  [WARNING] Không tìm thấy file 'Sample Orders.xlsx' gốc." -ForegroundColor Yellow
}

if ($EXCEL_FILE -eq $null) {
    # Xác định file Excel chạy chính tại workspace làm dự phòng cuối cùng
    $excelFiles = Get-ChildItem -Path $PROJECT_ROOT -Filter "*Sample*.xlsx"
    if ($excelFiles.Count -eq 0) {
        Write-Host "[ERROR] Không tìm thấy file Excel nào chứa chữ 'Sample' ở: $PROJECT_ROOT" -ForegroundColor Red
        exit 1
    }
    $EXCEL_FILE = $excelFiles[0].FullName
    Write-Host "  -> Sử dụng file tại workspace: $EXCEL_FILE" -ForegroundColor Green
}

# Cấu hình vị trí cột
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

# ---- FUNCTIONS ----

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
$OutputEncoding = [System.Text.Encoding]::UTF8
Write-Host "  FAST SAMPLE PLAN → SUPABASE SYNC" -ForegroundColor Cyan
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
if (![string]::IsNullOrEmpty($TargetSheet)) {
    Write-Host "  Target Sheet: $TargetSheet" -ForegroundColor Yellow
}
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "[1/3] Mở file: $EXCEL_FILE" -ForegroundColor Yellow

$xl = New-Object -ComObject Excel.Application
$xl.Visible       = $false
$xl.DisplayAlerts = $false

$planMap = [System.Collections.Generic.Dictionary[string,object]]::new()

try {
    $wb         = $xl.Workbooks.Open($EXCEL_FILE, 0, $true)
    $sheetCount = $wb.Worksheets.Count

    Write-Host "[1/3] Tìm thấy $sheetCount sheet(s)" -ForegroundColor Green

    for ($si = 1; $si -le $sheetCount; $si++) {
        $ws       = $wb.Worksheets.Item($si)
        $sheetName = $ws.Name
        
        # Nếu target sheet được chỉ định, bỏ qua các sheet khác
        if (![string]::IsNullOrEmpty($TargetSheet) -and $sheetName -ne $TargetSheet) {
            continue
        }

        # Cấu hình động vị trí cột theo loại sheet (BCN vs Thường)
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
            $col_sl_do      = 99  # Không có cột Đổ
            $col_completion = 12  # Cột "Ngày giao hàng ETD"
            $col_delivery   = 12  # Cột "Ngày giao hàng ETD"
        }
        
        try {
            $sheetCount_rows = 0
            $consecutiveEmpty = 0
            
            for ($r = $DATA_START; $r -le 1000; $r++) {
                $firmPlan = $ws.Cells.Item($r, $col_firm_plan).Text.Trim()
                if ([string]::IsNullOrWhiteSpace($firmPlan)) {
                    $consecutiveEmpty++
                    if ($consecutiveEmpty -ge 15) {
                        break
                    }
                    continue
                }
                $consecutiveEmpty = 0
                
                # Bỏ qua nếu không khớp định dạng FPRO hoặc RPRO
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
                $sheetCount_rows++
            }

            if ($sheetCount_rows -gt 0) {
                Write-Host "  Sheet [$si/$sheetCount]: '$sheetName' → Đọc được $sheetCount_rows dòng hợp lệ" -ForegroundColor Green
            }
        } catch {
            Write-Host "[WARNING] Không thể đọc sheet '$sheetName': $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }

    $wb.Close($false)
} catch {
    Write-Host "[CRITICAL ERROR] $($_.Exception.Message)" -ForegroundColor Red
} finally {
    $xl.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($xl) | Out-Null
    [GC]::Collect()
}

$records   = @($planMap.Values)
$totalRec  = $records.Count
Write-Host ""
Write-Host "[2/3] Tổng cộng $totalRec dòng unique từ toàn bộ file Sample Plan" -ForegroundColor Green

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

    Start-Sleep -Milliseconds 200
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DONE! Uploaded: $uploaded | Failed: $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Yellow" })
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
