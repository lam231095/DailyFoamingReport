# ==============================================================
# test_utf8.ps1
# Thử nghiệm upload với định dạng byte UTF-8 để khắc phục lỗi 400 Bad Request
# ==============================================================

$SUPABASE_URL = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"

# Một record lỗi điển hình
$record = [ordered]@{
    firm_plan       = "RPRO-251226-0807"
    no_order        = "S-2025-12-122"
    bun_code        = "PVN-004106"
    pu_code         = "OrthoLite Eco LT-Hybrid SEEDPEARL/12-0703TPX Hybrid Flat Sheet 0.085D 25+/-4 Asker C 1.1M 2M 5mm"
    ten_san_pham    = "20"
    sl_sheet        = 20
    sl_bun_can_tach = $null
    sl_bun_can_do   = $null
    completion_date = $null
    delivery_date   = $null
    week_label      = "Sample"
    synced_at       = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
}

$batch = @($record)
$json = $batch | ConvertTo-Json -Compress -Depth 3

$headers = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
    "Content-Type"  = "application/json; charset=utf-8"
}

# Chuyển body thành byte UTF-8
$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($json)

try {
    $res = Invoke-RestMethod `
        -Uri "$SUPABASE_URL/rest/v1/production_plan?on_conflict=firm_plan" `
        -Method Post `
        -Headers $headers `
        -Body $bodyBytes `
        -ErrorAction Stop
    Write-Host "Upload SUCCESS!" -ForegroundColor Green
} catch {
    $msg = $_.Exception.Message
    $details = ""
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $details = $reader.ReadToEnd()
    }
    Write-Host "Upload FAILED. Msg: $msg | Details: $details" -ForegroundColor Red
}
