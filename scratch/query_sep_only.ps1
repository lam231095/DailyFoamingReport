$apikey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
$headers = @{
    "apikey"        = $apikey
    "Authorization" = "Bearer $apikey"
}

Write-Host "=== foaming_separate_reports by Dang Minh Duong around 5:00 - 6:00 ICT ==="
$urlSep = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/foaming_separate_reports?recorder_id=eq.cdefd0e2-b1f8-4f12-8fdc-1b07d8625cf0&created_at=gte.2026-06-10T22:00:00Z&created_at=lte.2026-06-10T23:00:00Z&select=id,firm_plan,shift,created_at,operator_name,actual_bun_separated"
$sep = Invoke-RestMethod -Uri $urlSep -Headers $headers -Method Get
$sep | ConvertTo-Json -Depth 5

Write-Host "`n=== foaming_separate_reports by anyone around 5:10 - 5:25 ICT ==="
$urlAllSep = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/foaming_separate_reports?created_at=gte.2026-06-10T22:10:00Z&created_at=lte.2026-06-10T22:25:00Z&select=id,firm_plan,shift,created_at,operator_name,actual_bun_separated,users(full_name)"
$allSep = Invoke-RestMethod -Uri $urlAllSep -Headers $headers -Method Get
$allSep | ConvertTo-Json -Depth 5
