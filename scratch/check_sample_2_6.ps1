$SUPABASE_URL = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"

$headers = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
}

Write-Host "--- Querying 5 Sample plans ---"
$uriSample = "$SUPABASE_URL/rest/v1/production_plan?week_label=eq.Sample&limit=5"
$resSample = Invoke-RestMethod -Uri $uriSample -Headers $headers -Method Get
$resSample | Format-Table firm_plan, week_label, sl_sheet, sl_bun_can_do, sl_bun_can_tach

Write-Host "--- Querying 5 China CN plans ---"
$uriChina = "$SUPABASE_URL/rest/v1/production_plan?week_label=eq.China CN&limit=5"
$resChina = Invoke-RestMethod -Uri $uriChina -Headers $headers -Method Get
$resChina | Format-Table firm_plan, week_label, sl_sheet, sl_bun_can_do, sl_bun_can_tach
