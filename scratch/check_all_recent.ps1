$headers = @{
  "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
  "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
}

# 13:00 - 14:00 ICT is 06:00 - 07:00 UTC
$t1 = "2026-06-06T06:00:00Z"
$t2 = "2026-06-06T07:00:00Z"

Write-Host "=== foaming_pour_reports (13:00 - 14:00 ICT) ==="
$urlPour = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/foaming_pour_reports?created_at=gte.$t1&created_at=lte.$t2&select=*,production_plan(no_order)"
$pour = Invoke-RestMethod -Uri $urlPour -Headers $headers -Method Get
$pour | ForEach-Object {
  [PSCustomObject]@{
    id = $_.id
    no_order = $_.production_plan.no_order
    firm_plan = $_.firm_plan
    report_date = $_.report_date
    created_at = $_.created_at
  }
} | Format-Table -AutoSize | Out-String -Width 300

Write-Host "=== foaming_separate_reports (13:00 - 14:00 ICT) ==="
$urlSep = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/foaming_separate_reports?created_at=gte.$t1&created_at=lte.$t2&select=*,production_plan(no_order)"
$sep = Invoke-RestMethod -Uri $urlSep -Headers $headers -Method Get
$sep | ForEach-Object {
  [PSCustomObject]@{
    id = $_.id
    no_order = $_.production_plan.no_order
    firm_plan = $_.firm_plan
    report_date = $_.report_date
    created_at = $_.created_at
  }
} | Format-Table -AutoSize | Out-String -Width 300

Write-Host "=== foaming_warehouse_reports (13:00 - 14:00 ICT) ==="
$urlWh = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/foaming_warehouse_reports?created_at=gte.$t1&created_at=lte.$t2&select=*,production_plan(no_order)"
$wh = Invoke-RestMethod -Uri $urlWh -Headers $headers -Method Get
$wh | ForEach-Object {
  [PSCustomObject]@{
    id = $_.id
    no_order = $_.production_plan.no_order
    firm_plan = $_.firm_plan
    report_date = $_.report_date
    created_at = $_.created_at
  }
} | Format-Table -AutoSize | Out-String -Width 300
