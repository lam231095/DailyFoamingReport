$SUPABASE_URL = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"

$headers = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
}

# Query separate reports with their actual sheets and thickness
$uri = "$SUPABASE_URL/rest/v1/foaming_separate_reports?select=*,production_plan(ten_san_pham)&limit=500"
$reports = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get

# Helper to clean product name
function Clean-ProductName($name) {
    if ($name -eq $null) { return "Không rõ" }
    # Just a simple regex clean
    if ($name -match "(.*)\s+\d+(\.\d+)?\s*mm") {
        return $Matches[1].Trim()
    }
    return $name
}

$plMap = @{}
foreach ($r in $reports) {
    $pl = Clean-ProductName $r.production_plan.ten_san_pham
    $sheets = $r.actual_sheet_received
    $thick = $r.sheet_thickness_mm
    $bunSep = $r.actual_bun_separated
    
    if ($bunSep -gt 0 -and $thick -gt 0) {
        $thickSum = $sheets * $thick
        if (-not $plMap.Contains($pl)) {
            $plMap[$pl] = @{
                thickSum = 0
                bunSep = 0
            }
        }
        $plMap[$pl].thickSum += $thickSum
        $plMap[$pl].bunSep += $bunSep
    }
}

Write-Host "Product lines average bun thickness:"
foreach ($key in $plMap.Keys) {
    $avg = $plMap[$key].thickSum / $plMap[$key].bunSep
    Write-Host " - $key : $([Math]::Round($avg, 2)) mm (Bun count: $($plMap[$key].bunSep))"
}
