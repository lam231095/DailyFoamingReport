$apikey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
$headers = @{
    "apikey"        = $apikey
    "Authorization" = "Bearer $apikey"
}

Write-Host "=== production_plan for FPRO-260428-0014 ==="
$urlPlan = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/production_plan?firm_plan=eq.FPRO-260428-0014&select=*"
$plan = Invoke-RestMethod -Uri $urlPlan -Headers $headers -Method Get
$plan | ConvertTo-Json -Depth 5
