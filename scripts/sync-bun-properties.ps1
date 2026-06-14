# ==============================================================
# sync-bun-properties.ps1
# Đọc file Excel "Mã Bun.xlsx" và UPSERT dữ liệu lên Supabase
# Chạy: powershell -ExecutionPolicy Bypass -File ".\scripts\sync-bun-properties.ps1"
# ==============================================================

# ---- CONFIG ----
$SUPABASE_URL = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot
$ExcelFile = Get-ChildItem -Path $PROJECT_ROOT -Filter "*Bun*.xlsx" | Select-Object -First 1

if (-not $ExcelFile) {
    Write-Host "[ERROR] Không tìm thấy file Excel *Bun*.xlsx trong thư mục dự án!" -ForegroundColor Red
    exit 1
}

$EXCEL_PATH = $ExcelFile.FullName
Write-Host "Opening Excel file: $EXCEL_PATH" -ForegroundColor Cyan

# Column mapping (1-based index)
$COL_MA_BUN        = 1
$COL_BUN_CODE      = 2
$COL_SHEET_CODE    = 3
$COL_MATERIAL_NAME = 4
$COL_DONG_HANG     = 5
$COL_MAU           = 6
$COL_DENSITY       = 7
$COL_DO_CUNG       = 8
$COL_BOT           = 9
$COL_CHIEU_DAI     = 10
$COL_DO_DAY        = 11
$COL_DONG_SP       = 12

$DATA_START_ROW    = 2

# ---- FUNCTIONS ----

function Upload-Batch($batch) {
    $json = $batch | ConvertTo-Json -Compress -Depth 3
    if ($batch.Count -eq 1) { $json = "[$json]" }

    $headers = @{
        "apikey"        = $SUPABASE_KEY
        "Authorization" = "Bearer $SUPABASE_KEY"
        "Content-Type"  = "application/json; charset=utf-8"
        "Prefer"        = "resolution=merge-duplicates,return=minimal"
    }

    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($json)

    try {
        Invoke-RestMethod `
            -Uri "$SUPABASE_URL/rest/v1/bun_properties?on_conflict=bun_code" `
            -Method Post `
            -Headers $headers `
            -Body $bodyBytes `
            -ErrorAction Stop | Out-Null
        return $true
    } catch {
        Write-Host "  [ERROR] $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $body = $reader.ReadToEnd()
            Write-Host "  [DETAILS] Response Body: $body" -ForegroundColor DarkRed
        }
        return $false
    }
}

# ---- MAIN ----

# Step 1: Clear the existing table to prevent orphans/duplicates
Write-Host "Clearing existing data in bun_properties table..." -ForegroundColor Yellow
$clearHeaders = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
}
try {
    $deleteUrl = "$SUPABASE_URL/rest/v1/bun_properties?id=not.is.null"
    Invoke-RestMethod -Uri $deleteUrl -Method Delete -Headers $clearHeaders -ErrorAction Stop | Out-Null
    Write-Host "Table bun_properties cleared successfully." -ForegroundColor Green
} catch {
    Write-Host "  [WARNING] Could not clear table: $($_.Exception.Message)" -ForegroundColor Yellow
}

$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false

try {
    $wb = $xl.Workbooks.Open($EXCEL_PATH, 0, $true)
    $ws = $wb.Worksheets.Item("Refer")
    
    if (-not $ws) {
        $ws = $wb.Worksheets.Item(1)
    }

    $rowCount = $ws.UsedRange.Rows.Count
    Write-Host "Found $($rowCount) rows in sheet '$($ws.Name)'" -ForegroundColor Green

    # Use a hashtable to keep unique bun_codes (overwriting duplicates with latest row)
    $uniqueBuns = [ordered]@{}

    for ($r = $DATA_START_ROW; $r -le $rowCount; $r++) {
        $bunCode = $ws.Cells.Item($r, $COL_BUN_CODE).Text.Trim()
        
        # Skip empty rows or headers
        if ([string]::IsNullOrWhiteSpace($bunCode) -or $bunCode -eq "Bun code") {
            continue
        }

        # Clean and standardize casing / values
        $botRaw = $ws.Cells.Item($r, $COL_BOT).Text.Trim().ToUpper()
        if ($botRaw -eq "CSD") { $botRaw = "CSĐ" }
        elseif ($botRaw -eq "CSD HB" -or $botRaw -eq "CSDHB") { $botRaw = "CSĐ HB" }
        elseif ($botRaw -eq "NIKEHB") { $botRaw = "NIKE HB" }

        $rec = [ordered]@{
            ma_bun        = $ws.Cells.Item($r, $COL_MA_BUN).Text.Trim()
            bun_code      = $bunCode
            sheet_code    = $ws.Cells.Item($r, $COL_SHEET_CODE).Text.Trim()
            material_name = $ws.Cells.Item($r, $COL_MATERIAL_NAME).Text.Trim()
            dong_hang     = $ws.Cells.Item($r, $COL_DONG_HANG).Text.Trim().ToUpper()
            mau           = $ws.Cells.Item($r, $COL_MAU).Text.Trim().ToUpper()
            density       = $ws.Cells.Item($r, $COL_DENSITY).Text.Trim().ToUpper()
            do_cung       = $ws.Cells.Item($r, $COL_DO_CUNG).Text.Trim().ToUpper()
            bot           = $botRaw
            chieu_dai     = $ws.Cells.Item($r, $COL_CHIEU_DAI).Text.Trim().ToUpper()
            do_day        = $ws.Cells.Item($r, $COL_DO_DAY).Text.Trim()
            dong_sp       = $ws.Cells.Item($r, $COL_DONG_SP).Text.Trim()
            updated_at    = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
        }

        # Override or add to hashtable
        $uniqueBuns[$bunCode] = $rec
    }

    # Now upload the unique records in batches of 50
    $uniqueList = @($uniqueBuns.Values)
    $totalCount = $uniqueList.Count
    Write-Host "Filtered to $totalCount unique bun codes out of $($rowCount - 1) rows." -ForegroundColor Green

    $batch = New-Object System.Collections.Generic.List[PSObject]
    $successCount = 0

    for ($i = 0; $i -lt $totalCount; $i++) {
        $batch.Add($uniqueList[$i])

        if ($batch.Count -ge 50) {
            Write-Host "Syncing batch of 50 records..." -ForegroundColor Yellow
            if (Upload-Batch $batch) {
                $successCount += $batch.Count
            }
            $batch.Clear()
        }
    }

    # Upload remaining records
    if ($batch.Count -gt 0) {
        Write-Host "Syncing final batch of $($batch.Count) records..." -ForegroundColor Yellow
        if (Upload-Batch $batch) {
            $successCount += $batch.Count
        }
    }

    Write-Host "[SUCCESS] Sync completed. Successfully synced $successCount / $totalCount unique records to Supabase." -ForegroundColor Green

    $wb.Close($false)
} catch {
    Write-Host "[ERROR] An error occurred: $_" -ForegroundColor Red
} finally {
    $xl.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($xl) | Out-Null
    [GC]::Collect()
}
