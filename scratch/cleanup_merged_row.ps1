# Xóa record "rác" có firm_plan chứa dấu | (ghép nhiều mã)
$supabaseUrl = "https://brdecledtyypykowjnjt.supabase.co"
$supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
$headers = @{
    "apikey"        = $supabaseKey
    "Authorization" = "Bearer $supabaseKey"
    "Content-Type"  = "application/json"
}

# Xóa record có firm_plan chứa ký tự | (dòng tổng cộng ghép nhiều mã)
$deleteUrl = "$supabaseUrl/rest/v1/production_plan?firm_plan=like.*%7C*"
$resp = Invoke-RestMethod -Uri $deleteUrl -Headers $headers -Method Delete
Write-Host "Deleted rogue merged-firm_plan records: OK"
