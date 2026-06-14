$excelFiles = Get-ChildItem -Path "." -Filter "*.xlsx"
$searchTerms = @("FPRO-260324-0052", "F-2026-03-480", "FPRO-260324-0028", "F-2026-03-456")

$tempParent = Join-Path $env:TEMP "ExcelSearchTemp"
if (Test-Path $tempParent) { Remove-Item $tempParent -RecurRecurse -Force -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Path $tempParent -Force | Out-Null

foreach ($file in $excelFiles) {
    if ($file.Name -match "~" -or $file.Name -match "temp") { continue }
    
    $uniqueDir = Join-Path $tempParent ($file.BaseName + "_" + (Get-Random))
    New-Item -ItemType Directory -Path $uniqueDir -Force | Out-Null
    
    $zipPath = Join-Path $uniqueDir "archive.zip"
    try {
        Copy-Item -Path $file.FullName -Destination $zipPath -ErrorAction Stop
        Expand-Archive -Path $zipPath -DestinationPath $uniqueDir -Force -ErrorAction Stop
        
        # Search sharedStrings.xml
        $sharedStringsPath = Join-Path $uniqueDir "xl/sharedStrings.xml"
        if (Test-Path $sharedStringsPath) {
            $content = Get-Content -Path $sharedStringsPath -Raw
            foreach ($term in $searchTerms) {
                if ($content -like "*$term*") {
                    Write-Host "Found '$term' in sharedStrings of file '$($file.Name)'" -ForegroundColor Green
                }
            }
        }
        
        # Search worksheets
        $worksheetsPath = Join-Path $uniqueDir "xl/worksheets"
        if (Test-Path $worksheetsPath) {
            $sheetFiles = Get-ChildItem -Path $worksheetsPath -Filter "*.xml"
            foreach ($sheetFile in $sheetFiles) {
                $content = Get-Content -Path $sheetFile.FullName -Raw
                foreach ($term in $searchTerms) {
                    if ($content -like "*$term*") {
                        Write-Host "Found '$term' in worksheet '$($sheetFile.BaseName)' of file '$($file.Name)'" -ForegroundColor Green
                    }
                }
            }
        }
    } catch {
        Write-Host "Error processing $($file.Name): $($_.Exception.Message)" -ForegroundColor Red
    } finally {
        # Clean up this directory
        if (Test-Path $uniqueDir) { Remove-Item $uniqueDir -Recurse -Force -ErrorAction SilentlyContinue }
    }
}

Remove-Item $tempParent -Recurse -Force -ErrorAction SilentlyContinue
