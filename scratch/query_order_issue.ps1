# ==============================================================
# query_order_issue.ps1
# Truy vấn chi tiết kế hoạch và các báo cáo liên quan đến FPRO-260401-0004
# ==============================================================

$headers = @{
  "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
  "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
}
$SUPABASE_URL = "https://brdecledtyypykowjnjt.supabase.co"

$FIRM_PLAN = "FPRO-260401-0004"

Write-Host "=== 1. PRODUCTION PLAN (production_plan) ===" -ForegroundColor Cyan
$urlPlan = "$SUPABASE_URL/rest/v1/production_plan?firm_plan=eq.$FIRM_PLAN"
$plan = Invoke-RestMethod -Uri $urlPlan -Headers $headers -Method Get
$plan | ConvertTo-Json | Write-Host

Write-Host "`n=== 2. SEPARATE REPORTS (foaming_separate_reports) ===" -ForegroundColor Cyan
$urlSep = "$SUPABASE_URL/rest/v1/foaming_separate_reports?firm_plan=eq.$FIRM_PLAN&select=*,production_plan(no_order,week_label)"
$sep = Invoke-RestMethod -Uri $urlSep -Headers $headers -Method Get
$sep | ConvertTo-Json | Write-Host

Write-Host "`n=== 3. POUR REPORTS (foaming_pour_reports) ===" -ForegroundColor Cyan
$urlPour = "$SUPABASE_URL/rest/v1/foaming_pour_reports?firm_plan=eq.$FIRM_PLAN"
$pour = Invoke-RestMethod -Uri $urlPour -Headers $headers -Method Get
$pour | ConvertTo-Json | Write-Host

Write-Host "`n=== 4. WAREHOUSE REPORTS (foaming_warehouse_reports) ===" -ForegroundColor Cyan
$urlWh = "$SUPABASE_URL/rest/v1/foaming_warehouse_reports?firm_plan=eq.$FIRM_PLAN"
$wh = Invoke-RestMethod -Uri $urlWh -Headers $headers -Method Get
$wh | ConvertTo-Json | Write-Host

Write-Host "`n=== 5. CHECK EXCEL FILES FOR FPRO-260401-0004 ===" -ForegroundColor Cyan
$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot
$excelFiles = Get-ChildItem -Path $PROJECT_ROOT -Filter "*.xlsx"
$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false

try {
    foreach ($file in $excelFiles) {
        $tempFile = Join-Path $env:TEMP ("temp_" + $file.Name)
        Copy-Item -Path $file.FullName -Destination $tempFile -Force
        $wb = $xl.Workbooks.Open($tempFile, 0, $true)
        foreach ($ws in $wb.Worksheets) {
            $range = $ws.UsedRange
            $foundCell = $range.Find($FIRM_PLAN)
            if ($foundCell) {
                Write-Host "Found '$FIRM_PLAN' in '$($file.Name)' -> Sheet '$($ws.Name)' at cell $($foundCell.AddressLocal)" -ForegroundColor Green
                # In thông tin dòng đó
                $r = $foundCell.Row
                $rowValues = @()
                for ($c = 1; $c -le 20; $c++) {
                    $rowValues += $ws.Cells.Item($r, $c).Text.Trim()
                }
                Write-Host "Row values: $($rowValues -join ' | ')" -ForegroundColor Yellow
            }
        }
        $wb.Close($false)
        if (Test-Path $tempFile) { Remove-Item $tempFile -Force }
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    $xl.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($xl) | Out-Null
    [GC]::Collect()
}
