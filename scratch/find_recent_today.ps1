$headers = @{
  "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
  "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
}

Write-Host "=== foaming_pour_reports created today ==="
$urlPour = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/foaming_pour_reports?created_at=gte.2026-06-06T00:00:00&select=*"
$resPour = Invoke-RestMethod -Uri $urlPour -Headers $headers -Method Get
$resPour | Format-Table | Out-String -Width 300

Write-Host "=== foaming_separate_reports created today ==="
$urlSep = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/foaming_separate_reports?created_at=gte.2026-06-06T00:00:00&select=*"
$resSep = Invoke-RestMethod -Uri $urlSep -Headers $headers -Method Get
$resSep | Format-Table | Out-String -Width 300
