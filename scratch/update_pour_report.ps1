$SUPABASE_URL  = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"

$headers = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
    "Prefer"        = "return=representation"
}

$id = "39f872b7-b831-41bf-8625-ac11e956aa0f"
$url = "$SUPABASE_URL/rest/v1/foaming_pour_reports?id=eq.$id"

$bodyObj = @{
    "report_date" = "2026-06-06"
    "shift"       = "Ca 2"
    "manager_name"= "Thảo"
}

$body = $bodyObj | ConvertTo-Json -Compress
$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)

Write-Host "Updating foaming_pour_report ID $id..."
try {
    $res = Invoke-RestMethod -Uri $url -Headers $headers -Method Patch -Body $bodyBytes -ContentType "application/json; charset=utf-8" -ErrorAction Stop
    Write-Host "Update successful! Resulting record:" -ForegroundColor Green
    $res | ConvertTo-Json
} catch {
    Write-Host "Error updating record: $_" -ForegroundColor Red
}
