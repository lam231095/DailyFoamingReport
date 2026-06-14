$SUPABASE_URL  = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"

$headers = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
}

Write-Host "=== Latest 10 production_plan records ==="
$url1 = "$SUPABASE_URL/rest/v1/production_plan?order=created_at.desc&limit=10"
$resp1 = Invoke-RestMethod -Uri $url1 -Headers $headers -Method Get
$resp1 | ForEach-Object {
    [PSCustomObject]@{
        id = $_.id
        firm_plan = $_.firm_plan
        bun_code = $_.bun_code
        pu_code = $_.pu_code
        product_name = $_.product_name
        created_at = $_.created_at
    }
} | Format-Table -AutoSize

Write-Host "`n=== Latest 10 foaming_pour_reports records ==="
$url2 = "$SUPABASE_URL/rest/v1/foaming_pour_reports?order=created_at.desc&limit=10"
$resp2 = Invoke-RestMethod -Uri $url2 -Headers $headers -Method Get
$resp2 | ForEach-Object {
    [PSCustomObject]@{
        id = $_.id
        firm_plan = $_.firm_plan
        shift = $_.shift
        operator_name = $_.operator_name
        report_date = $_.report_date
        created_at = $_.created_at
    }
} | Format-Table -AutoSize
