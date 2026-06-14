$apikey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
$headers = @{
    "apikey"        = $apikey
    "Authorization" = "Bearer $apikey"
}

Write-Host "=== Search foaming_separate_reports by Dang Minh Duong around 5:00 - 6:00 ICT (22:00 - 23:00 UTC) ==="
$urlSep = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/foaming_separate_reports?recorder_id=eq.cdefd0e2-b1f8-4f12-8fdc-1b07d8625cf0&created_at=gte.2026-06-10T22:00:00Z&created_at=lte.2026-06-10T23:00:00Z&select=*"
try {
    $sep = Invoke-RestMethod -Uri $urlSep -Headers $headers -Method Get
    $sep | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error: $_"
}

Write-Host "`n=== Search ALL foaming_separate_reports created around 5:10 - 5:25 ICT (22:10 - 22:25 UTC) ==="
$urlAllSep = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/foaming_separate_reports?created_at=gte.2026-06-10T22:10:00Z&created_at=lte.2026-06-10T22:25:00Z&select=*"
try {
    $allSep = Invoke-RestMethod -Uri $urlAllSep -Headers $headers -Method Get
    $allSep | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error: $_"
}

Write-Host "`n=== Search foaming_pour_reports around same time ==="
$urlPour = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/foaming_pour_reports?created_at=gte.2026-06-10T22:00:00Z&created_at=lte.2026-06-10T23:00:00Z&select=*"
try {
    $pour = Invoke-RestMethod -Uri $urlPour -Headers $headers -Method Get
    $pour | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error: $_"
}

Write-Host "`n=== Search foaming_transfer_reports around same time ==="
$urlTrans = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/foaming_transfer_reports?created_at=gte.2026-06-10T22:00:00Z&created_at=lte.2026-06-10T23:00:00Z&select=*"
try {
    $trans = Invoke-RestMethod -Uri $urlTrans -Headers $headers -Method Get
    $trans | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error: $_"
}

Write-Host "`n=== Search foaming_warehouse_reports around same time ==="
$urlWh = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/foaming_warehouse_reports?created_at=gte.2026-06-10T22:00:00Z&created_at=lte.2026-06-10T23:00:00Z&select=*"
try {
    $wh = Invoke-RestMethod -Uri $urlWh -Headers $headers -Method Get
    $wh | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error: $_"
}
