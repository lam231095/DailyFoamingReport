$SUPABASE_URL  = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"

$headers = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
}

# Query specifically for W19, W20, W21 labels
$url = "$SUPABASE_URL/rest/v1/production_plan?week_label=like.W19*&select=id,week_label,firm_plan"
$resp19 = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
Write-Host "W19 count: $($resp19.Count)"

$url = "$SUPABASE_URL/rest/v1/production_plan?week_label=like.W20*&select=id,week_label,firm_plan"
$resp20 = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
Write-Host "W20 count: $($resp20.Count)"

$url = "$SUPABASE_URL/rest/v1/production_plan?week_label=like.W21*&select=id,week_label,firm_plan"
$resp21 = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
Write-Host "W21 count: $($resp21.Count)"
