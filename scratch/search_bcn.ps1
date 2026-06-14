$found = Get-ChildItem -Path "." -Filter "*BCN.xlsx" | Select-Object -First 1
if (-not $found) {
    Write-Host "Error: Excel file *BCN.xlsx not found."
    exit 1
}
$file = $found.FullName
$searchTerms = @("FPRO-260324-0052", "F-2026-03-480", "FPRO-260324-0028", "F-2026-03-456")

$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false

$tempFile = Join-Path $env:TEMP ("tiendoBCN_temp.xlsx")
try {
    Copy-Item -Path $file -Destination $tempFile -Force
    $wb = $xl.Workbooks.Open($tempFile, 0, $true)
    foreach ($ws in $wb.Worksheets) {
        foreach ($term in $searchTerms) {
            $foundRange = $ws.UsedRange.Find($term, [Type]::Missing, -4163) # xlValues
            if ($foundRange) {
                Write-Host "Found '$term' in file '$($found.Name)', sheet '$($ws.Name)' at cell $($foundRange.AddressLocal)" -ForegroundColor Green
            }
        }
    }
    $wb.Close($false)
} catch {
    Write-Host "Error: $($_.Exception.Message)"
} finally {
    $xl.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($xl) | Out-Null
    [GC]::Collect()
    if (Test-Path $tempFile) { Remove-Item $tempFile -Force }
}
