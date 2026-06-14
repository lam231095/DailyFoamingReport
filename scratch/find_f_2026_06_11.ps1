$SUPABASE_URL  = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"

$headers = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
}

$noOrder = "F-2026-06-11"

Write-Host "--- Searching production_plan for no_order = $noOrder ---"
$url1 = "$SUPABASE_URL/rest/v1/production_plan?no_order=eq.$noOrder&select=*"
try {
    $plans = Invoke-RestMethod -Uri $url1 -Headers $headers -Method Get
    Write-Host "Found $($plans.Count) plans:"
    $plans | ConvertTo-Json
    
    if ($plans.Count -gt 0) {
        $firmPlans = $plans | ForEach-Object { $_.firm_plan }
        $firmPlanQuery = ($firmPlans | ForEach-Object { "firm_plan.eq.$_" }) -join ","
        Write-Host "`nFirm Plans to search reports for: $firmPlans"
        
        Write-Host "`n--- Searching foaming_pour_reports ---"
        # We can search by firm plan
        $url2 = "$SUPABASE_URL/rest/v1/foaming_pour_reports?firm_plan=in.($($firmPlans -join ','))&select=*"
        $pourReports = Invoke-RestMethod -Uri $url2 -Headers $headers -Method Get
        Write-Host "Found $($pourReports.Count) pour reports:"
        $pourReports | ConvertTo-Json
    }
} catch {
    Write-Error $_
}
