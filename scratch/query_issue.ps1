$apikey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
$headers = @{
    "apikey"        = $apikey
    "Authorization" = "Bearer $apikey"
}

Write-Host "=== User with ID cdefd0e2-b1f8-4f12-8fdc-1b07d8625cf0 ==="
$urlU1 = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/users?id=eq.cdefd0e2-b1f8-4f12-8fdc-1b07d8625cf0&select=*"
try {
    $u1 = Invoke-RestMethod -Uri $urlU1 -Headers $headers -Method Get
    $u1 | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error: $_"
}

Write-Host "`n=== User with ID f65a0c79-f776-423c-b225-6534e36150f4 ==="
$urlU2 = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/users?id=eq.f65a0c79-f776-423c-b225-6534e36150f4&select=*"
try {
    $u2 = Invoke-RestMethod -Uri $urlU2 -Headers $headers -Method Get
    $u2 | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error: $_"
}

Write-Host "`n=== Search user Dang Minh Duong or MSNV 2133 ==="
$urlU3 = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/users?or=(full_name.ilike.*D%C6%B0%C6%A1ng*,msnv.eq.2133)&select=*"
try {
    $u3 = Invoke-RestMethod -Uri $urlU3 -Headers $headers -Method Get
    $u3 | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error: $_"
}
