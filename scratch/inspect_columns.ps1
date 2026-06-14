$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false

try {
    # Find the excel files using relative path
    $files = Get-ChildItem -Path ".\*.xlsx"
    foreach ($f in $files) {
        Write-Host "File: $($f.Name)" -ForegroundColor Cyan
        try {
            $wb = $xl.Workbooks.Open($f.FullName, 0, $true)
            $ws = $wb.Worksheets.Item(1)
            Write-Host "  Sheet 1: $($ws.Name)"
            # Print headers (Row 2) and row 3
            for ($c = 1; $c -le 20; $c++) {
                $h = $ws.Cells.Item(2, $c).Text.Trim()
                $v = $ws.Cells.Item(3, $c).Text.Trim()
                if ($h -or $v) {
                    Write-Host "    Col $($c): Header='$h', Val='$v'"
                }
            }
            $wb.Close($false)
        } catch {
            Write-Host "  Error reading file: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} finally {
    $xl.Quit()
}
