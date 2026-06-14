$body = Get-Content -Raw -Encoding UTF8 "scratch/payload.json"
$utf8Body = [System.Text.Encoding]::UTF8.GetBytes($body)

$url = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/foaming_separate_reports"
$headers = @{
  "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
  "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
  "Content-Type" = "application/json"
}

try {
  $res = Invoke-RestMethod -Uri $url -Headers $headers -Method Post -Body $utf8Body
  Write-Host "UTF8 Insert completed successfully!"
} catch {
  Write-Host "Error: $_"
  $streamReader = New-Object System.IO.StreamReader $_.Exception.Response.GetResponseStream()
  $errBody = $streamReader.ReadToEnd()
  Write-Host "Response error body: $errBody"
}
