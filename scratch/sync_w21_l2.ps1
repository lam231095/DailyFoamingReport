# ============================================================
#  Sync W21-2026 L2  →  Supabase production_plan  (UPSERT)
# ============================================================
$supabaseUrl = "https://brdecledtyypykowjnjt.supabase.co"
$supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"

$headers = @{
    "apikey"        = $supabaseKey
    "Authorization" = "Bearer $supabaseKey"
    "Content-Type"  = "application/json"
    "Prefer"        = "resolution=merge-duplicates,return=minimal"
}

$cwd       = Get-Location
$filePath  = Join-Path $cwd "ke_hoach_san_xuat.xlsx"
$weekLabel = "W21-2026"

Write-Host "Opening Excel: $filePath"
$excel = New-Object -ComObject Excel.Application
$excel.Visible       = $false
$excel.DisplayAlerts = $false

try {
    $workbook = $excel.Workbooks.Open($filePath, 0, $true)

    # ── Tìm đúng tab W21-L2 (không phải "phat sinh") ─────────
    $sheet     = $null
    $sheetName = ""
    foreach ($s in $workbook.Sheets) {
        if ($s.Name -match "W21" -and $s.Name -match "L2" -and $s.Name -notmatch "phat\s*sinh") {
            $sheet     = $s
            $sheetName = $s.Name
        }
    }

    if ($null -eq $sheet) {
        Write-Host "[ERROR] Không tìm thấy sheet W21-L2!"
        $workbook.Close($false); return
    }
    Write-Host ">>> Sheet: [$sheetName]"

    # ── Đọc dữ liệu từ row 4 (bỏ 3 dòng header) ─────────────
    $records      = [System.Collections.Generic.List[object]]::new()
    $emptyStreak  = 0
    $row          = 4

    while ($true) {
        $firmPlan = $sheet.Cells.Item($row, 2).Text.Trim()

        if ([string]::IsNullOrWhiteSpace($firmPlan)) {
            $emptyStreak++
            if ($emptyStreak -ge 10) { break }   # 10 dòng rỗng liên tiếp → dừng
            $row++; continue
        }
        $emptyStreak = 0   # reset khi gặp dữ liệu

        # Bỏ qua dòng section header kiểu "Máy 1", "Máy 2", "RELEASE ĐỢT 2"...
        $col1 = $sheet.Cells.Item($row, 1).Text.Trim()
        if ($firmPlan -notmatch "^[A-Z]PRO" -and $col1 -notmatch "F-\d{4}") {
            $row++; continue
        }

        $noOrder = $sheet.Cells.Item($row, 1).Text.Trim()
        $bunCode = $sheet.Cells.Item($row, 5).Text.Trim()
        $puCode  = $sheet.Cells.Item($row, 6).Text.Trim()
        $tenSP   = $sheet.Cells.Item($row, 7).Text.Trim()

        $slSheetRaw = $sheet.Cells.Item($row, 8).Text.Trim() -replace "[,. ]",""
        $slTachRaw  = $sheet.Cells.Item($row, 9).Text.Trim() -replace "[,. ]",""
        $slDoRaw    = $sheet.Cells.Item($row,10).Text.Trim() -replace "[,. ]",""

        $slSheet = if ($slSheetRaw -match '^\d+$') { [int]$slSheetRaw } else { 0 }
        $slTach  = if ($slTachRaw  -match '^\d+$') { [int]$slTachRaw  } else { 0 }
        $slDo    = if ($slDoRaw    -match '^\d+$') { [int]$slDoRaw    } else { 0 }

        $compDate = $sheet.Cells.Item($row, 17).Text.Trim()
        $delDate  = $sheet.Cells.Item($row, 18).Text.Trim()

        Write-Host "  Row $row | $firmPlan | $bunCode | Do:$slDo Tach:$slTach Sheet:$slSheet"

        $rec = [ordered]@{
            firm_plan       = $firmPlan
            bun_code        = if ($bunCode  -ne "") { $bunCode  } else { $null }
            pu_code         = if ($puCode   -ne "") { $puCode   } else { $null }
            ten_san_pham    = if ($tenSP    -ne "") { $tenSP    } else { $null }
            sl_sheet        = $slSheet
            sl_bun_can_tach = $slTach
            sl_bun_can_do   = $slDo
            no_order        = if ($noOrder  -ne "") { $noOrder  } else { $null }
            completion_date = if ($compDate -ne "") { $compDate } else { $null }
            delivery_date   = if ($delDate  -ne "") { $delDate  } else { $null }
            week_label      = $weekLabel
            synced_at       = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
        }
        $records.Add($rec)
        $row++
        if ($row -gt 2000) { break }
    }

    Write-Host "`n>>> Tổng records cần upsert: $($records.Count)"

    if ($records.Count -eq 0) {
        Write-Host "[WARN] Không có dữ liệu!"; $workbook.Close($false); return
    }

    # ── UPSERT từng record (on_conflict=firm_plan) ────────────
    $upsertUrl = "$supabaseUrl/rest/v1/production_plan?on_conflict=firm_plan"
    $ok  = 0
    $err = 0

    foreach ($rec in $records) {
        $body = "[$($rec | ConvertTo-Json -Compress -Depth 5)]"
        try {
            Invoke-RestMethod -Uri $upsertUrl -Headers $headers -Method Post -Body $body | Out-Null
            $ok++
            Write-Host "  OK  | $($rec.firm_plan)"
        } catch {
            $err++
            Write-Host "  ERR | $($rec.firm_plan) → $_"
        }
    }

    $workbook.Close($false)
    Write-Host "`n=== KẾT QUẢ: $ok OK  |  $err LỖI ==="

} catch {
    Write-Error "Lỗi: $_"
} finally {
    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}
