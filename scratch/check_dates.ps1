$SUPABASE_URL = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"

$headers = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
}

$uri = "$SUPABASE_URL/rest/v1/foaming_separate_reports?select=id,report_date,created_at,shift&order=created_at.desc&limit=50"

try {
    $resp = Invoke-RestMethod -Uri $uri -Method Get -Headers $headers
    Write-Host "Last 50 separate reports:" -ForegroundColor Green
    foreach ($r in $resp) {
        Write-Host "ID: $($r.id) | report_date: $($r.report_date) | created_at: $($r.created_at) | shift: $($r.shift)"
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
