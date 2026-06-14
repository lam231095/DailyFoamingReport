$excelPath = "ke_hoach_san_xuat.xlsx"
Write-Host "Checking sheets of: $excelPath"

$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false

try {
    # Resolve absolute path relative to current location
    $absPath = Resolve-Path $excelPath -ErrorAction SilentlyContinue
    if ($absPath) {
        $wb = $xl.Workbooks.Open($absPath.Path, 0, $true)
        Write-Host "Sheets in ke_hoach_san_xuat.xlsx:" -ForegroundColor Green
        foreach ($ws in $wb.Worksheets) {
            Write-Host "  $($ws.Name)"
        }
        $wb.Close($false)
    } else {
        Write-Host "File not found relative to current directory!" -ForegroundColor Red
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)"
} finally {
    $xl.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($xl) | Out-Null
}
