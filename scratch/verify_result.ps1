$SUPABASE_URL  = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"

$headers = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
}

$id = "39f872b7-b831-41bf-8625-ac11e956aa0f"
$url = "$SUPABASE_URL/rest/v1/foaming_pour_reports?id=eq.$id&select=*"
try {
    $res = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
    $json = $res | ConvertTo-Json
    [System.IO.File]::WriteAllText("scratch/verified_record.json", $json, [System.Text.Encoding]::UTF8)
    Write-Host "Verification JSON saved to scratch/verified_record.json"
} catch {
    Write-Error $_
}
