$SUPABASE_URL = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"

$headers = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
}

$firmPlan = "RPRO-260602-0740"

Write-Host "=== foaming_separate_reports ==="
$urlSep = "$SUPABASE_URL/rest/v1/foaming_separate_reports?firm_plan=eq.$firmPlan&select=*"
try {
    $sep = Invoke-RestMethod -Uri $urlSep -Headers $headers -Method Get
    $sep | ConvertTo-Json -Depth 5 | Write-Host
} catch {
    Write-Host "Error Sep: $_"
}

Write-Host "`n=== foaming_warehouse_reports ==="
$urlWh = "$SUPABASE_URL/rest/v1/foaming_warehouse_reports?firm_plan=eq.$firmPlan&select=*"
try {
    $wh = Invoke-RestMethod -Uri $urlWh -Headers $headers -Method Get
    $wh | ConvertTo-Json -Depth 5 | Write-Host
} catch {
    Write-Host "Error Wh: $_"
}
