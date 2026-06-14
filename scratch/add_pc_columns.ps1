$headers = @{
  "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
  "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
  "Content-Type" = "application/json"
}

# Test: Query 1 row to verify connection
$testResp = Invoke-RestMethod -Uri "https://brdecledtyypykowjnjt.supabase.co/rest/v1/foaming_pour_reports?select=id,is_pc_confirmed&limit=1" -Headers $headers -Method GET -ErrorAction Stop
Write-Host "=== Current columns test ===" -ForegroundColor Cyan
$testResp | ConvertTo-Json

Write-Host ""
Write-Host "NOTE: SQL ALTER TABLE must be run via Supabase Dashboard SQL Editor:" -ForegroundColor Yellow
Write-Host @"
ALTER TABLE foaming_pour_reports
  ADD COLUMN IF NOT EXISTS is_pc_confirmed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pc_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS pc_confirmed_by uuid,
  ADD COLUMN IF NOT EXISTS pc_note text;
"@ -ForegroundColor Green
