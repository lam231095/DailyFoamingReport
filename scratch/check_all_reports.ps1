$SUPABASE_URL  = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"

$headers = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
}

$firmPlan = "RPRO-260601-0862"

Write-Host "--- foaming_pour_reports for $firmPlan ---"
$url1 = "$SUPABASE_URL/rest/v1/foaming_pour_reports?firm_plan=eq.$firmPlan&select=*"
try {
    $r1 = Invoke-RestMethod -Uri $url1 -Headers $headers -Method Get
    $r1 | ConvertTo-Json
} catch {
    Write-Error $_
}

Write-Host "`n--- foaming_separate_reports for $firmPlan ---"
$url2 = "$SUPABASE_URL/rest/v1/foaming_separate_reports?firm_plan=eq.$firmPlan&select=*"
try {
    $r2 = Invoke-RestMethod -Uri $url2 -Headers $headers -Method Get
    $r2 | ConvertTo-Json
} catch {
    Write-Error $_
}

Write-Host "`n--- foaming_warehouse_reports for $firmPlan ---"
$url3 = "$SUPABASE_URL/rest/v1/foaming_warehouse_reports?firm_plan=eq.$firmPlan&select=*"
try {
    $r3 = Invoke-RestMethod -Uri $url3 -Headers $headers -Method Get
    $r3 | ConvertTo-Json
} catch {
    Write-Error $_
}
