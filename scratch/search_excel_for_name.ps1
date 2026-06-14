$excelFiles = Get-ChildItem -Path "." -Filter "*.xlsx"
$searchTerms = @("Đinh Chí", "Lê Huỳnh")

$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false

foreach ($file in $excelFiles) {
    if ($file.Name -match "~" -or $file.Name -match "temp") { continue }
    Write-Host "Processing file: $($file.Name)"
    
    $tempFile = Join-Path $env:TEMP ($file.BaseName + "_temp.xlsx")
    try {
        Copy-Item -Path $file.FullName -Destination $tempFile -Force -ErrorAction Stop
        $size = (Get-Item $tempFile).Length
        if ($size -eq 0) { continue }
        
        $wb = $xl.Workbooks.Open($tempFile, 0, $true)
        foreach ($ws in $wb.Worksheets) {
            foreach ($term in $searchTerms) {
                $foundRange = $ws.UsedRange.Find($term, [Type]::Missing, -4163) # xlValues
                if ($foundRange) {
                    Write-Host "  Found '$term' in sheet '$($ws.Name)' at cell $($foundRange.AddressLocal)" -ForegroundColor Green
                }
            }
        }
        $wb.Close($false)
    } catch {
        Write-Host "  Error reading: $($_.Exception.Message)" -ForegroundColor Red
    } finally {
        if (Test-Path $tempFile) { Remove-Item $tempFile -Force -ErrorAction SilentlyContinue }
    }
}

$xl.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($xl) | Out-Null
[GC]::Collect()
