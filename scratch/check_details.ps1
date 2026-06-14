$headers = @{
  "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
  "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
}

Write-Host "=== Pouring Reports Details ==="
$urlPour = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/foaming_pour_reports?id=in.(13fba25c-df65-4890-8a9c-131b55311ea4,d13a4c57-2bac-45ca-8e15-0ab5ea32d070,b9080489-51e4-4d80-8579-1e10d08a7b63,b84c27d9-66ff-498d-9c21-8ee6a3049649,dfd753a4-8a5c-48cc-ae04-db2a7b8e37d9)&select=*,production_plan(no_order)"
$pour = Invoke-RestMethod -Uri $urlPour -Headers $headers -Method Get
$pour | ForEach-Object {
  [PSCustomObject]@{
    id = $_.id
    no_order = $_.production_plan.no_order
    shift = $_.shift
    actual_bun_poured = $_.actual_bun_poured
    lot_no = $_.lot_no
    operator_name = $_.operator_name
    manager_name = $_.manager_name
    created_at = $_.created_at
  }
} | Format-Table -AutoSize | Out-String -Width 300

Write-Host "=== Separating Reports Details ==="
$urlSep = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/foaming_separate_reports?id=in.(0ee6698d-e115-4ecf-8866-3c7c1488e872,e2bf9584-e109-4d29-8258-2c7fc69763c1)&select=*,production_plan(no_order)"
$sep = Invoke-RestMethod -Uri $urlSep -Headers $headers -Method Get
$sep | ForEach-Object {
  [PSCustomObject]@{
    id = $_.id
    no_order = $_.production_plan.no_order
    shift = $_.shift
    actual_bun_separated = $_.actual_bun_separated
    lot_no = $_.lot_no
    operator_name = $_.operator_name
    manager_name = $_.manager_name
    created_at = $_.created_at
  }
} | Format-Table -AutoSize | Out-String -Width 300
