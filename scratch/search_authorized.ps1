$base = Resolve-Path "."
$files = Get-ChildItem -Path (Join-Path $base "src") -Filter "*.ts*" -Recurse

Write-Host "Searching for AUTHORIZED in src..."
foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    $lines = $content -split "`r?`n"
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "AUTHORIZED") {
            Write-Host "$($file.FullName.Replace($base.Path, '')) Line $($i + 1): $($lines[$i].Trim())"
        }
    }
}
