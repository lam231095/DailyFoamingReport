$headers = @{
  "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
  "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
}

$firmPlan = "RPRO-260603-0484"

Write-Host "=== Plan info from production_plan ==="
$urlPlan = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/production_plan?firm_plan=eq.$firmPlan"
$plan = Invoke-RestMethod -Uri $urlPlan -Headers $headers -Method Get
$plan | Format-List | Out-String -Width 300

Write-Host "=== Matches in foaming_pour_reports ==="
$urlPour = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/foaming_pour_reports?firm_plan=eq.$firmPlan&select=*,production_plan(no_order)"
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

Write-Host "=== Matches in foaming_separate_reports ==="
$urlSep = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/foaming_separate_reports?firm_plan=eq.$firmPlan&select=*,production_plan(no_order)"
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
