$headers = @{
  "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
  "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
}

$orders = @('L-2026-06-07', 'F-2026-06-47', 'F-2026-06-25', 'F-2026-05-449', 'F-2026-02-374-2')

Write-Host "=== Searching in foaming_pour_reports ==="
$urlPour = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/foaming_pour_reports?select=*"
$resPour = Invoke-RestMethod -Uri $urlPour -Headers $headers -Method Get
$foundPour = $resPour | Where-Object { 
  $_.firm_plan -in $orders -or $_.no_order -in $orders -or $_.order_no -in $orders -or $_.pu_code -in $orders
}
$foundPour | ForEach-Object {
  [PSCustomObject]@{
    Table = "foaming_pour_reports"
    id = $_.id
    firm_plan = $_.firm_plan
    report_date = $_.report_date
    created_at = $_.created_at
    actual_bun_poured = $_.actual_bun_poured
  }
} | Format-Table -AutoSize | Out-String -Width 300

Write-Host "=== Searching in foaming_separate_reports ==="
$urlSep = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/foaming_separate_reports?select=*"
$resSep = Invoke-RestMethod -Uri $urlSep -Headers $headers -Method Get
$foundSep = $resSep | Where-Object { 
  $_.firm_plan -in $orders -or $_.no_order -in $orders -or $_.order_no -in $orders -or $_.pu_code -in $orders
}
$foundSep | ForEach-Object {
  [PSCustomObject]@{
    Table = "foaming_separate_reports"
    id = $_.id
    firm_plan = $_.firm_plan
    report_date = $_.report_date
    created_at = $_.created_at
    actual_bun_separated = $_.actual_bun_separated
  }
} | Format-Table -AutoSize | Out-String -Width 300
