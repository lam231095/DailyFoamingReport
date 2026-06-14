# ==============================================================
# analyze_low_bun_thickness.ps1
# Query foaming_separate_reports from Supabase, calculate bun thickness,
# filter those under 136mm, and output the details.
# ==============================================================

# ---- CONFIG ----
$SUPABASE_URL  = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"

$headers = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
    "Content-Type"  = "application/json"
}

Write-Host "Fetching foaming_separate_reports from Supabase..." -ForegroundColor Yellow

$uri = "$SUPABASE_URL/rest/v1/foaming_separate_reports?select=*,production_plan(ten_san_pham)"
try {
    $reports = Invoke-RestMethod -Uri $uri -Method Get -Headers $headers -ErrorAction Stop
} catch {
    Write-Host "Error fetching data: $_" -ForegroundColor Red
    exit 1
}

Write-Host "Fetched $($reports.Count) reports." -ForegroundColor Green

$lowBunReports = [System.Collections.Generic.List[object]]::new()

foreach ($r in $reports) {
    $bunSep = if ($r.actual_bun_separated) { [double]$r.actual_bun_separated } else { 0 }
    $sheetThick = if ($r.sheet_thickness_mm) { [double]$r.sheet_thickness_mm } else { 0 }
    $sheets = if ($r.actual_sheet_received) { [double]$r.actual_sheet_received } else { 0 }
    
    if ($bunSep -le 0 -or $sheetThick -le 0) {
        continue
    }
    
    $calculatedBunThickness = ($sheets * $sheetThick) / $bunSep
    if ($calculatedBunThickness -lt 136) {
        $productName = "Không rõ"
        if ($r.production_plan -and $r.production_plan.ten_san_pham) {
            $productName = $r.production_plan.ten_san_pham
        }
        
        $obj = [ordered]@{
            id = $r.id
            report_date = $r.report_date
            shift = $r.shift
            firm_plan = $r.firm_plan
            product_name = $productName
            bun_thickness_mm = $r.bun_thickness_mm
            sheet_thickness_mm = $r.sheet_thickness_mm
            actual_bun_separated = $r.actual_bun_separated
            actual_sheet_received = $r.actual_sheet_received
            calculated_thickness = [Math]::Round($calculatedBunThickness, 1)
            ng_qty = $r.ng_qty
            ng_bun_qty = $r.ng_bun_qty
            error_type = $r.error_type
            note = $r.note
            manager_name = $r.manager_name
            operator_name = $r.operator_name
        }
        $lowBunReports.Add($obj)
    }
}

Write-Host "Found $($lowBunReports.Count) reports with calculated bun thickness < 136mm." -ForegroundColor Green

if ($lowBunReports.Count -gt 0) {
    # Format list and output to file
    $json = $lowBunReports | ConvertTo-Json -Depth 3
    $jsonPath = Join-Path $PSScriptRoot "low_bun_analysis.json"
    $json | Out-File -FilePath $jsonPath -Encoding utf8
    Write-Host "Results saved to $jsonPath" -ForegroundColor Green
    
    # Print formatted table to host
    $lowBunReports | Format-Table report_date, shift, firm_plan, product_name, calculated_thickness, actual_bun_separated, actual_sheet_received, sheet_thickness_mm, ng_qty, error_type, note -AutoSize
} else {
    Write-Host "No reports under 136mm found."
}
