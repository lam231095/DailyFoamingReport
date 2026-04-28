$path = (Get-ChildItem -Path "c:\Users\lam.dv\OneDrive - Ortholite Vietnam\PROJECT LÂM\REPORT DAILY" -Filter "DS*Foaming.xlsx").FullName
$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$wb = $xl.Workbooks.Open($path, 0, $true)
$ws = $wb.Worksheets.Item(1)
for($c=1; $c -le 15; $c++) {
    $val = $ws.Cells.Item(1, $c).Text
    Write-Host ("Col {0}: {1}" -f $c, $val)
}

Write-Host "--- First Data Row ---"
for($c=1; $c -le 15; $c++) {
    $val = $ws.Cells.Item(2, $c).Text
    Write-Host ("Col {0}: {1}" -f $c, $val)
}

$wb.Close($false)
$xl.Quit()
