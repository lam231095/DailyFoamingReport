# ==============================================================
# find_specific_records.ps1
# ==============================================================
$SUPABASE_URL  = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"

$headers = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
}

$uri = "$SUPABASE_URL/rest/v1/foaming_separate_reports?select=*,production_plan(ten_san_pham)"
$reports = Invoke-RestMethod -Uri $uri -Method Get -Headers $headers

$targets = @("AIR BLUE/16-4134TPX", "SEEDPEARL/1", "YELLOW/13-0858TPX", "MINT GRE")

$outputPath = Join-Path $PSScriptRoot "specific_records_output.txt"
$out = [System.Collections.Generic.List[string]]::new()

$out.Add("Total reports loaded: $($reports.Count)")

foreach ($t in $targets) {
    $out.Add("==========================================================================================")
    $out.Add("TARGET PRODUCT: $t")
    $out.Add("==========================================================================================")
    
    $matches = $reports | Where-Object {
        $pn = $_.production_plan.ten_san_pham
        $pn -like "*$t*" -and ($_.actual_bun_separated -gt 0) -and ($_.sheet_thickness_mm -gt 0)
    }
    
    $count = 0
    foreach ($m in $matches) {
        $bunSep = [double]$m.actual_bun_separated
        $sheetThick = [double]$m.sheet_thickness_mm
        $sheets = [double]$m.actual_sheet_received
        $calcThick = ($sheets * $sheetThick) / $bunSep
        
        if ($calcThick -lt 136) {
            $count++
            $expectedSheets = if ($m.bun_thickness_mm -and $sheetThick -gt 0) { [Math]::Round($m.bun_thickness_mm / $sheetThick, 1) } else { 0 }
            $actualSheetsPerBun = [Math]::Round($sheets / $bunSep, 1)
            $productName = $m.production_plan.ten_san_pham
            $date = $m.report_date
            $shift = $m.shift
            $firm = $m.firm_plan
            $ng = $m.ng_qty
            $err = $m.error_type
            $note = $m.note
            
            $out.Add("Date: $date | Shift: $shift | Plan: $firm")
            $out.Add("  Product: $productName")
            $out.Add("  Sheet Thick: $sheetThick mm | Bun Target: $($m.bun_thickness_mm) mm")
            $out.Add("  Bun Sep: $bunSep | Sheets Recv: $sheets")
            $out.Add("  Expected Sheets/Bun: $expectedSheets | Actual Sheets/Bun: $actualSheetsPerBun")
            $out.Add("  Calculated Thickness: $([Math]::Round($calcThick, 1)) mm")
            $out.Add("  NG Qty: $ng | Error Type: $err | Note: $note")
            $out.Add("------------------------------------------------------------------------------------------")
        }
    }
    $out.Add("Total matches for $t : $count")
    $out.Add("")
}

# Output to console line-by-line
foreach ($l in $out) {
    Write-Host $l
}

# Write to file
$out | Out-File -FilePath $outputPath -Encoding utf8
Write-Host "Written to $outputPath"
