$apikey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
$headers = @{
  "apikey" = $apikey
  "Authorization" = "Bearer $apikey"
}

$url = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/foaming_transfer_reports?firm_plan=eq.FPRO-260428-0014"

try {
  $res = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
  if ($res) {
    Write-Output "Found $($res.Count) transfer reports:"
    $res | ConvertTo-Json
  } else {
    Write-Output "No transfer reports found."
  }
} catch {
  Write-Output "Error: $_"
}
