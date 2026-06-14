$excelFiles = Get-ChildItem -Path "." -Filter "*.xlsx"
$searchTerms = @("FPRO-260324-0052", "F-2026-03-480", "FPRO-260324-0028", "F-2026-03-456")

$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false

foreach ($file in $excelFiles) {
    if ($file.Name -match "temp") { continue }
    $tempFile = Join-Path $env:TEMP ($file.Name + "_" + (Get-Random) + ".xlsx")
    try {
        Copy-Item -Path $file.FullName -Destination $tempFile -Force
        $wb = $xl.Workbooks.Open($tempFile, 0, $true)
        foreach ($ws in $wb.Worksheets) {
            foreach ($term in $searchTerms) {
                $foundRange = $ws.UsedRange.Find($term, [Type]::Missing, -4163) # xlValues
                if ($foundRange) {
                    Write-Host "Found '$term' in file '$($file.Name)', sheet '$($ws.Name)' at cell $($foundRange.AddressLocal)" -ForegroundColor Green
                }
            }
        }
        $wb.Close($false)
    } catch {
        Write-Host "Error reading $($file.Name): $($_.Exception.Message)" -ForegroundColor Red
    } finally {
        if (Test-Path $tempFile) { Remove-Item $tempFile -Force }
    }
}
$xl.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($xl) | Out-Null
[GC]::Collect()
