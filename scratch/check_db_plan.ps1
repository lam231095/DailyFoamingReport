$SUPABASE_URL = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"

$headers = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
}

# Query count of sample and china plans with null or 0 values
Write-Host "--- Querying Sample/China plans with null or 0 target values ---"
$uri = "$SUPABASE_URL/rest/v1/production_plan?week_label=in.(Sample,`"China CN`")"
$plans = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get

$nullDo = $plans | Where-Object { $_.sl_bun_can_do -eq $null -or $_.sl_bun_can_do -eq 0 }
$nullTach = $plans | Where-Object { $_.sl_bun_can_tach -eq $null -or $_.sl_bun_can_tach -eq 0 }
$nullSheet = $plans | Where-Object { $_.sl_sheet -eq $null -or $_.sl_sheet -eq 0 }

Write-Host "Total plans found: $($plans.Count)"
Write-Host "Plans with sl_bun_can_do is null or 0: $($nullDo.Count)"
Write-Host "Plans with sl_bun_can_tach is null or 0: $($nullTach.Count)"
Write-Host "Plans with sl_sheet is null or 0: $($nullSheet.Count)"

if ($nullDo.Count -gt 0) {
    Write-Host "Examples of null/0 sl_bun_can_do:"
    $nullDo | Select-Object -First 5 | Format-Table firm_plan, week_label, sl_sheet, sl_bun_can_do, sl_bun_can_tach
}
