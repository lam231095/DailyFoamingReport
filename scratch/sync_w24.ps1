# scratch/sync_w24.ps1
$ExcelPath = Join-Path (Resolve-Path ".") "ke_hoach_san_xuat.xlsx"
$sheetName = "List pha liệu đầu tuần 24"

# Set console encoding to UTF-8
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "Syncing sheet '$sheetName' from $ExcelPath with week label W24-2026..." -ForegroundColor Cyan

& ".\scripts\sync-excel-to-supabase.ps1" -WeekLabel "W24-2026" -ExcelPath $ExcelPath -SheetName $sheetName
