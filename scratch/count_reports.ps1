$SUPABASE_URL  = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"

$headers = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
}

# Count pour reports
$url = "$SUPABASE_URL/rest/v1/foaming_pour_reports?select=id"
$respPour = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
Write-Host "Total Pour Reports: $($respPour.Count)"

# Count separate reports
$url = "$SUPABASE_URL/rest/v1/foaming_separate_reports?select=id"
$respSep = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
Write-Host "Total Separate Reports: $($respSep.Count)"
