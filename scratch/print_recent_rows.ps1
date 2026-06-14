$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false
try {
    $file = Get-ChildItem -Path . -Filter "*Sample*.xlsx" | Select-Object -First 1
    if (-not $file) {
        Write-Error "Could not find Sample Excel file"
        exit 1
    }
    $path = $file.FullName
    $wb = $xl.Workbooks.Open($path, 0, $true)
    $sheetCount = $wb.Worksheets.Count
    for ($si = 1; $si -le $sheetCount; $si++) {
        $ws = $wb.Worksheets.Item($si)
        $nr = $ws.UsedRange.Rows.Count
        Write-Output "Sheet: $($ws.Name), Total rows: $nr"
        $start = [Math]::Max(1, $nr - 15)
        for ($r = $start; $r -le $nr; $r++) {
            $rowStr = ""
            for ($c = 1; $c -le 8; $c++) {
                $rowStr += "[$c]: " + $ws.Cells.Item($r, $c).Text + " | "
            }
            Write-Output "  Row ${r}: $rowStr"
        }
    }
    $wb.Close($false)
} catch {
    Write-Error $_.Exception.Message
} finally {
    $xl.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($xl) | Out-Null
    [GC]::Collect()
}
