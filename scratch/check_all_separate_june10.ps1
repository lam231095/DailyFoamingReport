$apikey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
$headers = @{
  "apikey" = $apikey
  "Authorization" = "Bearer $apikey"
}

$url = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/foaming_separate_reports?created_at=gte.2026-06-10T00:00:00Z&order=created_at.asc"

try {
  $res = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
  if ($res) {
    Write-Output "Found $($res.Count) separate reports:"
    $res | ForEach-Object {
      # Convert created_at to ICT
      $created = [DateTime]::Parse($_.created_at)
      $ict = [TimeZoneInfo]::ConvertTime($created, [TimeZoneInfo]::FindSystemTimeZoneById("SE Asia Standard Time"))
      [PSCustomObject]@{
        id = $_.id
        created_at_ict = $ict.ToString("yyyy-MM-dd HH:mm:ss")
        report_date = $_.report_date
        firm_plan = $_.firm_plan
        shift = $_.shift
        actual_bun_separated = $_.actual_bun_separated
        actual_sheet_received = $_.actual_sheet_received
        recorder_id = $_.recorder_id
        operator_name = $_.operator_name
        manager_name = $_.manager_name
      }
    } | ConvertTo-Json
  } else {
    Write-Output "No separate reports found."
  }
} catch {
  Write-Output "Error: $_"
}
