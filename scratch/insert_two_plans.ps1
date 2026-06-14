$SUPABASE_URL = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"

$headers = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
    "Content-Type"  = "application/json; charset=utf-8"
    "Prefer"        = "resolution=merge-duplicates,return=representation"
}

$nowStr = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")

$records = @(
    [ordered]@{
        firm_plan       = "FPRO-260324-0052"
        no_order        = "F-2026-03-480"
        bun_code        = "BDB-000163"
        pu_code         = "PVN-001556"
        ten_san_pham    = "OrthoLite Ultra-Nike YELLOW/13-0858TPX 0.085D 25+/-4 Asker C 1.1M 2M 4mm"
        sl_sheet        = 1500
        sl_bun_can_tach = 43
        sl_bun_can_do   = 43
        completion_date = "14/Jun"
        delivery_date   = $null
        week_label      = "W24-2026"
        synced_at       = $nowStr
    },
    [ordered]@{
        firm_plan       = "FPRO-260324-0028"
        no_order        = "F-2026-03-456"
        bun_code        = "BDB-000161"
        pu_code         = "PVN-001560"
        ten_san_pham    = "OrthoLite Ultra-Nike FOSSIL/17-0909TPX 0.085D 25+/-4 Asker C 1.1M 2M 4mm"
        sl_sheet        = 1000
        sl_bun_can_tach = 29
        sl_bun_can_do   = 29
        completion_date = "13/Jun"
        delivery_date   = $null
        week_label      = "W24-2026"
        synced_at       = $nowStr
    }
)

$json = $records | ConvertTo-Json -Compress -Depth 5
$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($json)

Write-Host "Upserting 2 records to Supabase..."
try {
    $resp = Invoke-RestMethod `
        -Uri "$SUPABASE_URL/rest/v1/production_plan?on_conflict=firm_plan" `
        -Method Post `
        -Headers $headers `
        -Body $bodyBytes `
        -ErrorAction Stop
    
    Write-Host "Success! Response:" -ForegroundColor Green
    $resp | ConvertTo-Json | Write-Host
} catch {
    Write-Host "Error upserting records: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errBody = $reader.ReadToEnd()
        Write-Host "Error Body: $errBody" -ForegroundColor Red
    }
}
