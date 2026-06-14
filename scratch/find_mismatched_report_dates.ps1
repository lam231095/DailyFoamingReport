$apikey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
$headersGet = @{
  "apikey" = $apikey
  "Authorization" = "Bearer $apikey"
}
$headersPatch = @{
  "apikey" = $apikey
  "Authorization" = "Bearer $apikey"
  "Content-Type" = "application/json"
}

$tables = @("foaming_pour_reports", "foaming_separate_reports", "foaming_warehouse_reports")

foreach ($table in $tables) {
  Write-Output "Checking table: $table..."
  $url = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/" + $table + "?select=id,created_at,report_date"
  
  try {
    $records = Invoke-RestMethod -Uri $url -Headers $headersGet -Method Get
  } catch {
    Write-Output "Error fetching $table : $_"
    if ($_.Exception.Response) {
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $resText = $reader.ReadToEnd()
      Write-Output "Response body: $resText"
    }
    continue
  }
  
  if ($records) {
    $count = 0
    foreach ($r in $records) {
      if ($r.created_at) {
        $created = [DateTime]::Parse($r.created_at)
        # Convert to ICT (UTC+7)
        $ict = [TimeZoneInfo]::ConvertTime($created, [TimeZoneInfo]::FindSystemTimeZoneById("SE Asia Standard Time"))
        
        $hours = $ict.Hour
        $minutes = $ict.Minute
        $totalMinutes = $hours * 60 + $minutes
        
        # If created between 6:00 AM (360 min) and 6:30 AM (390 min) ICT
        if ($totalMinutes -ge 360 -and $totalMinutes -lt 390) {
          # Expected report_date: date - 1 day
          $expectedDate = $ict.AddDays(-1).ToString("yyyy-MM-dd")
          $currentDate = $r.report_date
          
          if ($currentDate -ne $expectedDate) {
            Write-Output "Record ID $($r.id) created at $($ict.ToString('yyyy-MM-dd HH:mm:ss')) ICT has report_date $currentDate. Changing to $expectedDate..."
            
            $updateUrl = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/$table?id=eq.$($r.id)"
            $body = @{ "report_date" = $expectedDate } | ConvertTo-Json
            $postBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
            
            try {
              $res = Invoke-RestMethod -Uri $updateUrl -Headers $headersPatch -Method Patch -Body $postBytes
              $count++
            } catch {
              Write-Output "Error updating $($r.id): $_"
            }
          }
        }
      }
    }
    Write-Output "Updated $count records in $table."
  } else {
    Write-Output "No records found in $table."
  }
}
