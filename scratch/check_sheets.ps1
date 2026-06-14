$searchRoot = "C:\Users\lam.dv2\OneDrive - Ortholite Vietnam"
$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false

try {
    $files = Get-ChildItem -Path $searchRoot -Filter "*.xlsx"
    foreach ($file in $files) {
        Write-Host "Checking sheets of: $($file.Name)" -ForegroundColor Cyan
        try {
            $wb = $xl.Workbooks.Open($file.FullName, 0, $true)
            foreach ($ws in $wb.Worksheets) {
                Write-Host "  $($ws.Name)" -ForegroundColor Green
            }
            $wb.Close($false)
        } catch {
            Write-Host "  Error opening file: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} finally {
    $xl.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($xl) | Out-Null
}
