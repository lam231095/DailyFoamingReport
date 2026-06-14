$headers = @{
  "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
  "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
}

Write-Host "=== SEPARATE REPORTS FOR 2026-06-02 ==="
$urlSep = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/foaming_separate_reports?report_date=eq.2026-06-02&select=*,production_plan(ten_san_pham)"
$resSep = Invoke-RestMethod -Uri $urlSep -Headers $headers -Method Get
$resSep | ForEach-Object {
  [PSCustomObject]@{
    firm_plan = $_.firm_plan
    shift = $_.shift
    actual_bun_separated = $_.actual_bun_separated
    actual_sheet_received = $_.actual_sheet_received
    manager_name = $_.manager_name
    operator_name = $_.operator_name
    machine_id = $_.machine_id
    product_name = $_.production_plan.ten_san_pham
  }
} | Format-Table -AutoSize | Out-String -Width 300

Write-Host "=== POUR REPORTS FOR 2026-06-02 ==="
$urlPour = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/foaming_pour_reports?report_date=eq.2026-06-02&select=*"
$resPour = Invoke-RestMethod -Uri $urlPour -Headers $headers -Method Get
$resPour | ForEach-Object {
  [PSCustomObject]@{
    firm_plan = $_.firm_plan
    shift = $_.shift
    actual_bun_poured = $_.actual_bun_poured
    manager_name = $_.manager_name
    operator_name = $_.operator_name
    machine_id = $_.machine_id
  }
} | Format-Table -AutoSize | Out-String -Width 300
