$SUPABASE_URL = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"

$headers = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
}

$plans = @("FPRO-260527-0010", "FPRO-260429-0038", "FPRO-260429-0024", "FPRO-260514-0005")
foreach ($p in $plans) {
    $uri = "$SUPABASE_URL/rest/v1/foaming_separate_reports?firm_plan=eq.$p&select=id,firm_plan,actual_sheet_received,sheet_thickness_mm,actual_bun_separated,report_date,bun_thickness_mm"
    $reports = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get
    if ($reports.Count -gt 0) {
        Write-Host "Found report for $p`:"
        $reports | Format-Table -AutoSize
    }
}
