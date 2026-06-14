$apikey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
$headers = @{
    "apikey"        = $apikey
    "Authorization" = "Bearer $apikey"
}

Write-Host "=== foaming_pour_reports by Dang Minh Duong since 2026-06-10T00:00:00Z ==="
$url = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/foaming_pour_reports?recorder_id=eq.cdefd0e2-b1f8-4f12-8fdc-1b07d8625cf0&created_at=gte.2026-06-10T00:00:00Z&select=id,firm_plan,shift,created_at,operator_name,actual_bun_poured,report_date"
$res = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
$res | ConvertTo-Json -Depth 5
