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
    Write-Output "Found file: $path"
    $wb = $xl.Workbooks.Open($path, 0, $true)
    $sheetCount = $wb.Worksheets.Count
    Write-Output "Total sheets: $sheetCount"
    for ($si = 1; $si -le $sheetCount; $si++) {
        $ws = $wb.Worksheets.Item($si)
        $nr = $ws.UsedRange.Rows.Count
        for ($r = 3; $r -le $nr; $r++) {
            $firmPlan = $ws.Cells.Item($r, 2).Text.Trim()
            $noOrder = $ws.Cells.Item($r, 1).Text.Trim()
            if ($noOrder -like "*S-2026-05-86*" -or $firmPlan -like "*RPRO-260527-0578*") {
                Write-Output "Found in Sheet: $($ws.Name), Row: $r"
                Write-Output "Col 1: $noOrder"
                Write-Output "Col 2: $firmPlan"
                Write-Output "Col 3: $($ws.Cells.Item($r, 3).Text)"
                Write-Output "Col 4: $($ws.Cells.Item($r, 4).Text)"
                Write-Output "Col 5: $($ws.Cells.Item($r, 5).Text)"
                Write-Output "Col 6: $($ws.Cells.Item($r, 6).Text)"
                Write-Output "Col 7: $($ws.Cells.Item($r, 7).Text)"
                Write-Output "Col 8: $($ws.Cells.Item($r, 8).Text)"
                Write-Output "Col 14: $($ws.Cells.Item($r, 14).Text)"
            }
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
