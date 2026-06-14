$content = Get-Content -Path "src/components/tabs/DailyReportTab.tsx" -Raw
$lines = $content -split "`n"

Write-Host "Searching for edit/update/delete in DailyReportTab.tsx..."
for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    if ($line -match "edit" -or $line -match "update" -or $line -match "delete" -or $line -match "auth" -or $line -match "can" -or $line -match "permission") {
        Write-Host "Line $($i + 1): $($line.Trim())"
    }
}
