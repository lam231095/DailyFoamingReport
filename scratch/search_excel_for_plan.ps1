$excelFiles = Get-ChildItem -Path "." -Include *.xlsx, *.xlsm -Recurse
$searchTerms = @("FPRO-260401-0004")

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
                    # Let's print the row
                    $row = $foundRange.Row
                    $cols = $ws.UsedRange.Columns.Count
                    $rowVals = @()
                    for ($c = 1; $c -le $cols; $c++) {
                        $rowVals += $ws.Cells.Item($row, $c).Text
                    }
                    Write-Host "Row values: $($rowVals -join ' | ')" -ForegroundColor Yellow
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
