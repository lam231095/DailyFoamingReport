$SUPABASE_URL = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"

$headers = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
}

$uri = "$SUPABASE_URL/rest/v1/foaming_separate_reports?report_date=eq.2026-06-04&select=bun_thickness_mm"
$reports = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get

$sum = 0
$cnt = 0
foreach ($r in $reports) {
    if ($r.bun_thickness_mm -gt 0) {
        $sum += $r.bun_thickness_mm
        $cnt++
    }
}
$avg = if ($cnt -gt 0) { $sum / $cnt } else { 0 }
Write-Host "Target Thickness Count: $cnt"
Write-Host "Average Target Thickness: $([Math]::Round($avg, 2)) mm"
