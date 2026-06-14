$content = Get-Content -Path "src/components/tabs/DailyReportTab.tsx" -Raw
$lines = $content -split "`r?`n"

Write-Host "Searching for edit / delete methods in DailyReportTab.tsx..."
for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    # Check if line contains edit, update, delete, or permission related code (case-insensitive)
    if ($line -match "handle" -or $line -match "delete" -or $line -match "edit" -or $line -match "update" -or $line -match "save" -or $line -match "admin" -or $line -match "role" -or $line -match "msnv") {
        Write-Host "Line $($i + 1): $($line.Trim())"
    }
}
