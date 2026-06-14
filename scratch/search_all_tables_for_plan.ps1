$apikey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
$headers = @{
  "apikey" = $apikey
  "Authorization" = "Bearer $apikey"
}

$tables = @("foaming_pour_reports", "foaming_separate_reports", "foaming_warehouse_reports")

foreach ($table in $tables) {
  Write-Output "Searching table: $table..."
  $url = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/" + $table + "?firm_plan=eq.FPRO-260428-0014"
  try {
    $res = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
    if ($res) {
      Write-Output "Found $($res.Count) records in $table."
      $res | ConvertTo-Json
    } else {
      Write-Output "No records in $table."
    }
  } catch {
    Write-Output "Error searching $table : $_"
  }
}
