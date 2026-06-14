$content = Get-Content -Path "src/components/tabs/DailyReportTab.tsx" -Raw
$lines = $content -split "`r?`n"

Write-Host "Searching for imports in DailyReportTab.tsx..."
for ($i = 0; $i -lt 100; $i++) {
    $line = $lines[$i]
    if ($line -match "import") {
        Write-Host "Line $($i + 1): $($line.Trim())"
    }
}
