$base = Resolve-Path "."
$files = @(
    (Join-Path $base "src/components/foaming/FoamingHistory.tsx"),
    (Join-Path $base "src/components/foaming/ProcessControlTab.tsx"),
    (Join-Path $base "src/components/tabs/DailyReportTab.tsx")
)

foreach ($file in $files) {
    Write-Host "`n--- Searching: $file ---"
    if (-not (Test-Path $file)) {
        Write-Host "File not found!" -ForegroundColor Red
        continue
    }
    $content = Get-Content -Path $file -Raw
    $lines = $content -split "`r?`n"
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        if ($line -match "canAccess" -or $line -match "edit" -or $line -match "delete" -or $line -match "update" -or $line -match "permission" -or $line -match "role" -or $line -match "msnv") {
            Write-Host "Line $($i + 1): $($line.Trim())"
        }
    }
}
