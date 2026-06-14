$SUPABASE_URL = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"

$headers = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
}

$uri = "$SUPABASE_URL/rest/v1/foaming_separate_reports?report_date=eq.2026-06-04&select=id,firm_plan,actual_sheet_received,sheet_thickness_mm,actual_bun_separated,created_at,updated_at"
$reports = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get

$reports | Sort-Object created_at | ForEach-Object {
    [PSCustomObject]@{
        firm_plan = $_.firm_plan
        created_at = $_.created_at
        updated_at = $_.updated_at
        actual_sheet_received = $_.actual_sheet_received
        sheet_thickness_mm = $_.sheet_thickness_mm
        actual_bun_separated = $_.actual_bun_separated
        calculated_thickness = if ($_.actual_bun_separated -gt 0) { [Math]::Round(($_.actual_sheet_received * $_.sheet_thickness_mm) / $_.actual_bun_separated, 2) } else { 0 }
    }
} | Format-Table -AutoSize
