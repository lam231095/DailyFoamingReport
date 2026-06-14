$apikey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
$headers = @{
  "apikey" = $apikey
  "Authorization" = "Bearer $apikey"
  "Prefer" = "return=representation"
}

# 1. Fetch records from foaming_supplementary_reports
$fetchUrl = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/foaming_supplementary_reports"
$records = Invoke-RestMethod -Uri $fetchUrl -Headers @{"apikey"=$apikey;"Authorization"="Bearer $apikey"} -Method Get

Write-Output "Found $($records.Count) records to migrate."

# 2. Loop and insert into foaming_pour_reports
foreach ($r in $records) {
  $storageCarts = [Math]::Ceiling($r.actual_bun_poured / 6.0)
  
  $body = @{
    "firm_plan" = $r.firm_plan
    "shift" = $r.shift
    "machine_id" = $r.machine_id
    "actual_bun_poured" = $r.actual_bun_poured
    "report_date" = $r.working_date
    "cleaning_agent_kg" = $r.cleaning_agent_kg
    "waste_kg" = $r.waste_kg
    "is_compensation" = $r.is_compensation
    "note" = $r.note
    "recorder_id" = $r.recorder_id
    "ng_bun_qty" = 0
    "error_type" = ""
    "operator_name" = $null
    "manager_name" = $null
    "lot_no" = $null
    "storage_location" = $null
    "storage_line" = $null
    "color_tag" = $null
    "storage_carts" = $storageCarts
    "is_pc_confirmed" = $true
    "pc_confirmed_at" = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ")
    "pc_confirmed_by" = $r.recorder_id
  }

  $insertUrl = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/foaming_pour_reports"
  $jsonBody = $body | ConvertTo-Json -Depth 5
  $postBytes = [System.Text.Encoding]::UTF8.GetBytes($jsonBody)
  
  Write-Output "Migrating record for: $($r.firm_plan)..."
  try {
    $res = Invoke-RestMethod -Uri $insertUrl -Headers $headers -ContentType "application/json; charset=utf-8" -Method Post -Body $postBytes
    Write-Output "Successfully migrated $($r.firm_plan) with ID: $($res.id)"
  } catch {
    Write-Output "Error migrating $($r.firm_plan): $_"
    if ($_.Exception.Response) {
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $resText = $reader.ReadToEnd()
      Write-Output "Response body: $resText"
    }
  }
}
