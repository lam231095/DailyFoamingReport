$SUPABASE_URL  = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"

$headers = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
    "Prefer"        = "return=representation"  # Returns deleted rows to count them
}

# Weeks in 2026 before week 16 (i.e. W1-2026 to W15-2026)
$weeksToDelete = @()
for ($i = 1; $i -lt 16; $i++) {
    $weeksToDelete += "W$i-2026"
}

Write-Host "=== Deleting 2026 weeks before W16 ==="
$totalDeleted = 0

foreach ($w in $weeksToDelete) {
    $url = "$SUPABASE_URL/rest/v1/production_plan?week_label=eq.$w"
    try {
        $resp = Invoke-RestMethod -Uri $url -Headers $headers -Method Delete
        $count = 0
        if ($resp -is [Array]) {
            $count = $resp.Count
        } elseif ($null -ne $resp) {
            $count = 1
        }
        Write-Host "  Deleted week: $w -> $count rows"
        $totalDeleted += $count
    } catch {
        Write-Host "  [ERROR] Failed to delete week $($w): $_"
    }
}

# Also handle any 2025 weeks just in case (using like matching)
Write-Host "`n=== Deleting 2025 weeks (ending with -2025) ==="
$url2025 = "$SUPABASE_URL/rest/v1/production_plan?week_label=like.*-2025"
try {
    $resp = Invoke-RestMethod -Uri $url2025 -Headers $headers -Method Delete
    $count = 0
    if ($resp -is [Array]) {
        $count = $resp.Count
    } elseif ($null -ne $resp) {
        $count = 1
    }
    Write-Host "  Deleted 2025 rows -> $count rows"
    $totalDeleted += $count
} catch {
    Write-Host "  [ERROR] Failed to delete 2025 weeks: $_"
}

Write-Host "`n=== Total Deleted: $totalDeleted rows ==="
