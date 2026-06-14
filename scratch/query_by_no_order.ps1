$headers = @{
  "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
  "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
}

$orders = @('L-2026-06-07', 'F-2026-06-47', 'F-2026-06-25', 'F-2026-05-449', 'F-2026-02-374-2')

# 1. Get firm plans from production_plan table
$inQuery = ($orders | ForEach-Object { "no_order.eq." + $_ }) -join ","
$urlPlans = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/production_plan?or=($inQuery)&select=firm_plan,no_order"
$plans = Invoke-RestMethod -Uri $urlPlans -Headers $headers -Method Get

Write-Host "=== Resolved Plans ==="
$plans | Format-Table | Out-String -Width 300

if ($plans.Count -eq 0) {
  Write-Host "No plans resolved!"
  exit
}

$firmPlans = $plans.firm_plan
$fpQuery = ($firmPlans | ForEach-Object { "firm_plan.eq." + $_ }) -join ","

# 2. Search in foaming_pour_reports
Write-Host "=== Matches in foaming_pour_reports ==="
$urlPour = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/foaming_pour_reports?or=($fpQuery)&select=*,production_plan(no_order)"
$pour = Invoke-RestMethod -Uri $urlPour -Headers $headers -Method Get
$pour | ForEach-Object {
  [PSCustomObject]@{
    id = $_.id
    no_order = $_.production_plan.no_order
    firm_plan = $_.firm_plan
    report_date = $_.report_date
    created_at = $_.created_at
    shift = $_.shift
    actual_bun_poured = $_.actual_bun_poured
  }
} | Format-Table -AutoSize | Out-String -Width 300

# 3. Search in foaming_separate_reports
Write-Host "=== Matches in foaming_separate_reports ==="
$urlSep = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/foaming_separate_reports?or=($fpQuery)&select=*,production_plan(no_order)"
$sep = Invoke-RestMethod -Uri $urlSep -Headers $headers -Method Get
$sep | ForEach-Object {
  [PSCustomObject]@{
    id = $_.id
    no_order = $_.production_plan.no_order
    firm_plan = $_.firm_plan
    report_date = $_.report_date
    created_at = $_.created_at
    shift = $_.shift
    actual_bun_separated = $_.actual_bun_separated
  }
} | Format-Table -AutoSize | Out-String -Width 300

# 4. Search in foaming_warehouse_reports
Write-Host "=== Matches in foaming_warehouse_reports ==="
$urlWh = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/foaming_warehouse_reports?or=($fpQuery)&select=*,production_plan(no_order)"
$wh = Invoke-RestMethod -Uri $urlWh -Headers $headers -Method Get
$wh | ForEach-Object {
  [PSCustomObject]@{
    id = $_.id
    no_order = $_.production_plan.no_order
    firm_plan = $_.firm_plan
    report_date = $_.report_date
    created_at = $_.created_at
    delivery_date = $_.delivery_date
    qty_delivered_sheet = $_.qty_delivered_sheet
  }
} | Format-Table -AutoSize | Out-String -Width 300
