$SUPABASE_URL  = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"

$headers = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
}

$firmPlan = "RPRO-260601-0862"

Write-Host "--- foaming_transfer_reports for $firmPlan ---"
$url = "$SUPABASE_URL/rest/v1/foaming_transfer_reports?firm_plan=eq.$firmPlan&select=*"
try {
    $r = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
    if ($r) {
        $r | ConvertTo-Json
    } else {
        Write-Host "No transfer reports found."
    }
} catch {
    Write-Error $_
}
