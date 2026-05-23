# scratch/check_error_types.ps1
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$SUPABASE_URL = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"

$headers = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
}

$res = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/foaming_separate_reports?select=id,firm_plan,error_type,ng_qty&error_type=neq.&limit=100" -Method Get -Headers $headers
foreach ($row in $res) {
    if ($row.error_type) {
        Write-Host "Separate ID: $($row.id) | Error: $($row.error_type) | NG Qty: $($row.ng_qty)"
    }
}
