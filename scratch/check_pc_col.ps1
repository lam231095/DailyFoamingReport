$headers = @{
  "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
  "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
  "Content-Type" = "application/json"
}

# Test existing columns first
$testResp = Invoke-RestMethod -Uri "https://brdecledtyypykowjnjt.supabase.co/rest/v1/foaming_pour_reports?select=id,report_date&limit=1" -Headers $headers -Method GET
Write-Host "Connection OK. Row count test:" -ForegroundColor Green
$testResp | ConvertTo-Json

# Try to select is_pc_confirmed - if it returns 400, column doesn't exist
try {
  $resp = Invoke-RestMethod -Uri "https://brdecledtyypykowjnjt.supabase.co/rest/v1/foaming_pour_reports?select=id,is_pc_confirmed&limit=1" -Headers $headers -Method GET
  Write-Host "Column is_pc_confirmed EXISTS" -ForegroundColor Green
  $resp | ConvertTo-Json
} catch {
  Write-Host "Column is_pc_confirmed does NOT exist yet - need to run ALTER TABLE" -ForegroundColor Red
  Write-Host "Run this in Supabase SQL Editor:" -ForegroundColor Yellow
}
