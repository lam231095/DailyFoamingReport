$body = @{
  "firm_plan" = "FPRO-260318-0031"
  "shift" = "Ca 3"
  "actual_bun_separated" = 44
  "actual_sheet_received" = 500
  "lot_no" = "1/6"
  "ng_qty" = 0
  "error_type" = ""
  "recorder_id" = "8acc93be-cff0-4103-b76f-4de025e9bca1"
  "machine_id" = "Máy tách tự động 2"
  "operator_name" = "Trương Văn Đạt"
  "bun_thickness_mm" = 144
  "sheet_thickness_mm" = 12
  "ng_bun_qty" = 0
  "product_type" = "thanh_pham"
  "report_date" = "2026-06-01"
  "manager_name" = "Tuấn Anh"
  "note" = $null
  "is_compensation" = $false
} | ConvertTo-Json

$utf8Body = [System.Text.Encoding]::UTF8.GetBytes($body)

$url = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/foaming_separate_reports"
$headers = @{
  "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
  "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
  "Content-Type" = "application/json"
}

try {
  $res = Invoke-RestMethod -Uri $url -Headers $headers -Method Post -Body $utf8Body
  Write-Host "Insert completed successfully!"
} catch {
  Write-Host "Error: $_"
  $streamReader = New-Object System.IO.StreamReader $_.Exception.Response.GetResponseStream()
  $errBody = $streamReader.ReadToEnd()
  Write-Host "Response error body: $errBody"
}
