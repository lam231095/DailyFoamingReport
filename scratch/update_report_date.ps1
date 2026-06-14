$headers = @{
  "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
  "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
  "Content-Type" = "application/json"
  "Prefer" = "return=representation"
}

$ids = @(
  "13fba25c-df65-4890-8a9c-131b55311ea4",
  "d13a4c57-2bac-45ca-8e15-0ab5ea32d070",
  "b9080489-51e4-4d80-8579-1e10d08a7b63",
  "b84c27d9-66ff-498d-9c21-8ee6a3049649",
  "dfd753a4-8a5c-48cc-ae04-db2a7b8e37d9"
)

$idsJoined = ($ids | ForEach-Object { $_ }) -join ","
$url = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/foaming_pour_reports?id=in.($idsJoined)"
$body = '{"report_date": "2026-06-05"}'

Write-Host "Updating report_date to 2026-06-05 for IDs: $idsJoined..."
try {
  $res = Invoke-RestMethod -Uri $url -Headers $headers -Method Patch -Body $body -ErrorAction Stop
  Write-Host "Update successful! Resulting records:" -ForegroundColor Green
  $res | ForEach-Object {
    [PSCustomObject]@{
      id = $_.id
      firm_plan = $_.firm_plan
      report_date = $_.report_date
      created_at = $_.created_at
      shift = $_.shift
    }
  } | Format-Table -AutoSize
} catch {
  Write-Host "Error updating records: $_" -ForegroundColor Red
}
