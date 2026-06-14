$SUPABASE_URL  = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"

$headers = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
}

$planId = "68257bf0-90f7-46f0-a9a8-6c2ccda28425"

Write-Host "--- daily_reports for plan_id = $planId ---"
$url = "$SUPABASE_URL/rest/v1/daily_reports?plan_id=eq.$planId&select=*"
try {
    $r = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
    if ($r) {
        $r | ConvertTo-Json
    } else {
        Write-Host "No daily reports found."
    }
} catch {
    Write-Error $_
}
