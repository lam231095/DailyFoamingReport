$excelFiles = Get-ChildItem -Path "C:\Users\lam.dv2\OneDrive - Ortholite Vietnam" -Filter "*.xlsx" -Recurse -ErrorAction SilentlyContinue
$searchTerms = @("Đặng Minh Dương", "Dang Minh Duong")

$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false

foreach ($file in $excelFiles) {
    if ($file.Name -like "~$*") { continue } # Skip temp files
    Write-Host "Searching in $($file.FullName)..."
    try {
        $wb = $xl.Workbooks.Open($file.FullName, 0, $true)
        foreach ($ws in $wb.Worksheets) {
            foreach ($term in $searchTerms) {
                $foundRange = $ws.UsedRange.Find($term, [Type]::Missing, -4163) # xlValues
                if ($foundRange) {
                    Write-Host "FOUND '$term' in file '$($file.Name)', sheet '$($ws.Name)' at cell $($foundRange.AddressLocal)" -ForegroundColor Green
                }
            }
        }
        $wb.Close($false)
    } catch {
        Write-Host "Error reading $($file.Name): $($_.Exception.Message)" -ForegroundColor Red
    }
}
$xl.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null
[GC]::Collect()
