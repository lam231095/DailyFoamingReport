$SUPABASE_URL  = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"

$headers = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
    "Prefer"        = "return=representation"
}

$id = "39f872b7-b831-41bf-8625-ac11e956aa0f"
$url = "$SUPABASE_URL/rest/v1/foaming_pour_reports?id=eq.$id"

# Use pure ASCII with Unicode escape for "ả" (\u1ea3) to represent "Thảo"
$body = '{"report_date":"2026-06-06","shift":"Ca 2","manager_name":"Th\u1ea3o"}'
$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)

Write-Host "Updating foaming_pour_report ID $id..."
try {
    $res = Invoke-RestMethod -Uri $url -Headers $headers -Method Patch -Body $bodyBytes -ContentType "application/json; charset=utf-8" -ErrorAction Stop
    $json = $res | ConvertTo-Json
    [System.IO.File]::WriteAllText("scratch/verified_record.json", $json, [System.Text.Encoding]::UTF8)
    Write-Host "Update successful! Saved to scratch/verified_record.json"
} catch {
    Write-Host "Error updating record: $_" -ForegroundColor Red
}
