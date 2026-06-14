$SUPABASE_URL = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"

$headers = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
}

$uri = "$SUPABASE_URL/rest/v1/foaming_separate_reports?report_date=eq.2026-06-04&select=shift,manager_name,actual_sheet_received,sheet_thickness_mm,actual_bun_separated"
$reports = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get

Write-Host "=== Filtered Averages for 2026-06-04 ==="
# Overall
$tS = 0; $tB = 0
foreach ($r in $reports) {
    if ($r.actual_bun_separated -gt 0 -and $r.sheet_thickness_mm -gt 0) {
        $tS += ($r.actual_sheet_received * $r.sheet_thickness_mm)
        $tB += $r.actual_bun_separated
    }
}
Write-Host "Overall: $([Math]::Round($tS / $tB, 2)) mm (Buns: $tB, Sheets sum: $tS)"

# By Shift
$shifts = $reports | Select-Object -ExpandProperty shift -Unique
foreach ($s in $shifts) {
    $tS = 0; $tB = 0
    foreach ($r in $reports) {
        if ($r.shift -eq $s -and $r.actual_bun_separated -gt 0 -and $r.sheet_thickness_mm -gt 0) {
            $tS += ($r.actual_sheet_received * $r.sheet_thickness_mm)
            $tB += $r.actual_bun_separated
        }
    }
    if ($tB -gt 0) {
        Write-Host "Shift $($s): $([Math]::Round($tS / $tB, 2)) mm (Buns: $tB)"
    }
}

# By Manager
$managers = $reports | Select-Object -ExpandProperty manager_name -Unique
foreach ($m in $managers) {
    $tS = 0; $tB = 0
    foreach ($r in $reports) {
        $mr = $r.manager_name
        if ($mr -eq $null) { $mr = "Khác" }
        if ($mr -eq $m -and $r.actual_bun_separated -gt 0 -and $r.sheet_thickness_mm -gt 0) {
            $tS += ($r.actual_sheet_received * $r.sheet_thickness_mm)
            $tB += $r.actual_bun_separated
        }
    }
    if ($tB -gt 0) {
        Write-Host "Manager $($m): $([Math]::Round($tS / $tB, 2)) mm (Buns: $tB)"
    }
}
