$SUPABASE_URL = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"

$headers = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
}

Write-Host "--- Querying Separate Reports for 2026-06-04 ---"
$uri = "$SUPABASE_URL/rest/v1/foaming_separate_reports?report_date=eq.2026-06-04&select=*,production_plan(*)"
$reports = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get

foreach ($r in $reports) {
    [PSCustomObject]@{
        id = $r.id
        firm_plan = $r.firm_plan
        shift = $r.shift
        manager_name = $r.manager_name
        actual_sheet_received = $r.actual_sheet_received
        sheet_thickness_mm = $r.sheet_thickness_mm
        actual_bun_separated = $r.actual_bun_separated
        bun_thickness_mm = $r.bun_thickness_mm
        ten_san_pham = $r.production_plan.ten_san_pham
        week_label = $r.production_plan.week_label
    } | Format-List
}

# Calculate average thickness for this day
$totalSheetThickSum = 0
$totalBunSep = 0
foreach ($r in $reports) {
    if ($r.actual_bun_separated -gt 0 -and $r.sheet_thickness_mm -gt 0) {
        $totalSheetThickSum += ($r.actual_sheet_received) * ($r.sheet_thickness_mm)
        $totalBunSep += $r.actual_bun_separated
    }
}
$avg = if ($totalBunSep -gt 0) { $totalSheetThickSum / $totalBunSep } else { 0 }
Write-Host "Total reports on June 4th: $($reports.Count)"
Write-Host "Total Buns Separated: $totalBunSep"
Write-Host "Total Sheets thickness sum: $totalSheetThickSum"
Write-Host "Average bun thickness: $avg mm"
