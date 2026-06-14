$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false

try {
    $files = Get-ChildItem -Path ".\*.xlsx"
    foreach ($f in $files) {
        try {
            $wb = $xl.Workbooks.Open($f.FullName, 0, $true)
            foreach ($ws in $wb.Worksheets) {
                $r = $ws.UsedRange.Find("RPRO-260604-0466")
                if ($r) {
                    Write-Host "Found RPRO-260604-0466 in File: $($f.Name), Sheet: $($ws.Name), Cell: $($r.Address())" -ForegroundColor Green
                }
            }
            $wb.Close($false)
        } catch {
            Write-Host "Error in $($f.Name): $($_.Exception.Message)"
        }
    }
} finally {
    $xl.Quit()
}
