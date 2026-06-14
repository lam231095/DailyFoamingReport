$headers = @{
  "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
  "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
}
$urlPour = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/foaming_pour_reports?select=*&order=created_at.desc&limit=200"
$resPour = Invoke-RestMethod -Uri $urlPour -Headers $headers -Method Get

# Helper function to format date from created_at and shift
function formatReportDate($createdAt, $shift) {
  if (-not $createdAt) { return "N/A" }
  $date = [DateTime]::Parse($createdAt)
  
  # If Ca 3, we shift date back if hour is early morning? 
  # Let's see how formatReportDate is implemented in JS.
  # Let's just output report_date and created_at.
  return $date.ToString("yyyy-MM-dd")
}

$resPour | ForEach-Object {
  [PSCustomObject]@{
    id = $_.id
    report_date = $_.report_date
    created_at = $_.created_at
    shift = $_.shift
    actual_bun_poured = $_.actual_bun_poured
    manager_name = $_.manager_name
  }
} | Format-Table -AutoSize | Out-String -Width 300
