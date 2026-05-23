$SUPABASE_URL = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"

$headers = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
}

try {
    $url = "$SUPABASE_URL/rest/v1/foaming_separate_reports?select=*&limit=1"
    $resp = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
    if ($resp) {
        Write-Host "Success! Columns present in result:"
        $resp[0] | Get-Member -MemberType NoteProperty | ForEach-Object { $_.Name }
    } else {
        Write-Host "No records returned, but request succeeded. Querying structure..."
    }
} catch {
    Write-Host "Error occurred: $_"
}
