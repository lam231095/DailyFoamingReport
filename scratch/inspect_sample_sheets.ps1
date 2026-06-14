$excelFiles = Get-ChildItem -Path "." -Filter "*Sample*.xlsx"
if ($excelFiles.Count -eq 0) {
    Write-Host "No sample excel file found."
    exit
}
$EXCEL_FILE = $excelFiles[0].FullName
Write-Host "Excel file: $EXCEL_FILE"

$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false
try {
    $wb = $xl.Workbooks.Open($EXCEL_FILE, 0, $true)
    Write-Host "Sheets:"
    for ($si = 1; $si -le $wb.Worksheets.Count; $si++) {
        Write-Host ("  " + $si + ": " + $wb.Worksheets.Item($si).Name)
    }
    $wb.Close($false)
} finally {
    $xl.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($xl) | Out-Null
    [GC]::Collect()
}
