$SUPABASE_URL  = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"

$headers = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
}

$url = "$SUPABASE_URL/rest/v1/foaming_pour_reports?select=manager_name"
try {
    $res = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
    $names = $res | ForEach-Object { $_.manager_name } | Select-Object -Unique
    $json = $names | ConvertTo-Json
    [System.IO.File]::WriteAllText("scratch/managers.json", $json, [System.Text.Encoding]::UTF8)
    Write-Host "Unique managers saved to scratch/managers.json"
} catch {
    Write-Error $_
}
