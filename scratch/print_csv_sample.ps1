# scratch/print_csv_sample.ps1
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$SUPABASE_URL = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"

$headers = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
}

# Fetch a record with 'Lỗi khác' in separate reports
$res = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/foaming_separate_reports?select=id,created_at,shift,machine_id,operator_name,bun_thickness_mm,sheet_thickness_mm,actual_bun_separated,actual_sheet_received,lot_no,ng_qty,error_type,production_plan(week_label,no_order,pu_code,ten_san_pham),users(full_name,msnv)&error_type=ilike.*Lỗi khác*&limit=1" -Method Get -Headers $headers

if ($res.Count -eq 0) {
    Write-Host "No record found with 'Lỗi khác'"
    exit
}

$row = $res[0]
Write-Host "Fetched Row: $($row | ConvertTo-Json -Depth 5)"

# Replicate FoamingHistory.tsx exportCSV logic
$ERROR_TYPES = @(
  'Bọt khí', 'Loang trắng', 'Loang đen', 'Lõm mặt',
  'Xốp biên', 'Cứng đáy', 'NG màu', 'Sọc dao',
  'mm không đều', 'Mỏng dày', 'Cong, biến dạng', 'Nứt rách', 'Lỗi khác',
  'Lỗi độ cứng TRÊN chuẩn', 'Lỗi độ cứng DƯỚI chuẩn'
)

$csvHeaders = @("Ngày/Giờ", "Ngày Báo Cáo", "Tuần", "NO.ORDER", "Firm Plan", "PU Code", "Sản phẩm", "Người nhập", "MSNV")
$csvHeaders += @("Ca", "Máy", "Operator", "Dày Bun (mm)", "Độ dày bun thực tế", "Tổng độ dày sheet thực tế", "Dày Sheet (mm)", "SL Tách (Bun)", "SL Sheet Nhận", "Sheet Tối Ưu (Gợi ý)", "% Hiệu Suất", "Lot No", "Sheet không có thông tin", "NG", "Lỗi Cứng Trên", "Lỗi Cứng Dưới")
$csvHeaders += $ERROR_TYPES

$dateTime = (Get-Date).ToString("dd/MM/yyyy HH:mm:ss")
$delivery_date = $row.delivery_date
if ($delivery_date) {
    $report_date = (Get-Date $delivery_date).ToString("dd/MM/yyyy")
} else {
    $report_date = (Get-Date $row.created_at).ToString("dd/MM/yyyy")
}

$common = @(
    "`"$dateTime`"",
    "`"$report_date`"",
    "`"$($row.production_plan.week_label)`"",
    "`"$($row.production_plan.no_order)`"",
    $row.firm_plan,
    "`"$($row.production_plan.pu_code)`"",
    "`"$($row.production_plan.ten_san_pham)`"",
    "`"$($row.users.full_name)`"",
    $row.users.msnv
)

$thicknessText = $row.production_plan.ten_san_pham
$thickness = 0.0
if ($thicknessText -match "([0-9.]+)\s*mm") {
    $thickness = [float]$Matches[1]
}
$optimalSheetsPerBun = 0
if ($thickness -gt 0) {
    # Simple mockup of optimal
    $optimalSheetsPerBun = [Math]::Floor(43.0 / $thickness)
}
$suggested = $row.actual_bun_separated * $optimalSheetsPerBun
$perf = 0
if ($suggested -gt 0) {
    $perf = [Math]::Round(($row.actual_sheet_received / $suggested) * 100)
}
$totalActualSheetThickness = $row.actual_sheet_received * $row.sheet_thickness_mm
$actualBunThickness = 0.0
if ($row.actual_bun_separated -gt 0) {
    $actualBunThickness = $totalActualSheetThickness / $row.actual_bun_separated
}

$errorDetails = @()
foreach ($type in $ERROR_TYPES) {
    $escapedType = [regex]::Escape($type)
    $pattern = "$escapedType\s*\((\d+)\)"
    $match = [regex]::Match($row.error_type, $pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    if ($match.Success) {
        $errorDetails += [int]$match.Groups[1].Value
    } else {
        $errorDetails += 0
    }
}

$noInfoSheets = $suggested - $row.actual_sheet_received - $row.ng_qty
if ($noInfoSheets -lt 0) { $noInfoSheets = 0 }

$specific = @(
    $row.shift, 
    ($row.machine_id ? $row.machine_id : '---'),
    ($row.operator_name ? $row.operator_name : '---'),
    ($row.bun_thickness_mm ? $row.bun_thickness_mm : 0),
    $actualBunThickness.ToString("F2"),
    $totalActualSheetThickness.ToString("F2"),
    ($row.sheet_thickness_mm ? $row.sheet_thickness_mm : 0),
    $row.actual_bun_separated, 
    $row.actual_sheet_received, 
    $suggested, 
    "$perf%",
    $row.lot_no, 
    $noInfoSheets,
    $row.ng_qty, 
    ($row.error_hardness_above ? $row.error_hardness_above : 0),
    ($row.error_hardness_below ? $row.error_hardness_below : 0)
)
$specific += $errorDetails

$csvRow = $common + $specific

# Print aligned columns
Write-Host "`n=== Column Alignment Check ==="
for ($i = 0; $i -lt $csvHeaders.Count; $i++) {
    $hdr = $csvHeaders[$i]
    $val = $csvRow[$i]
    Write-Host "$($i.ToString('D2')): Header = '$hdr' | Value = '$val'"
}
