$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false
try {
    $files = Get-ChildItem -Path . -Filter "*.xlsx"
    $files += Get-ChildItem -Path . -Filter "*.xlsm"
    foreach ($file in $files) {
        $path = $file.FullName
        try {
            $wb = $xl.Workbooks.Open($path, 0, $true)
            foreach ($ws in $wb.Worksheets) {
                $nr = $ws.UsedRange.Rows.Count
                for ($r = 1; $r -le $nr; $r++) {
                    $val = $ws.Cells.Item($r, 2).Text.Trim()
                    if ($val -like "*RPRO-260527-0578*" -or $ws.Cells.Item($r, 1).Text -like "*S-2026-05-86*") {
                        Write-Output "Found matching order in File: $($file.Name), Sheet: $($ws.Name), Row: $r"
                        Write-Output "  Col 1: $($ws.Cells.Item($r, 1).Text)"
                        Write-Output "  Col 2: $($ws.Cells.Item($r, 2).Text)"
                        Write-Output "  Col 3: $($ws.Cells.Item($r, 3).Text)"
                        Write-Output "  Col 4: $($ws.Cells.Item($r, 4).Text)"
                        Write-Output "  Col 5: $($ws.Cells.Item($r, 5).Text)"
                        Write-Output "  Col 6: $($ws.Cells.Item($r, 6).Text)"
                        Write-Output "  Col 7: $($ws.Cells.Item($r, 7).Text)"
                        Write-Output "  Col 8: $($ws.Cells.Item($r, 8).Text)"
                    }
                }
            }
            $wb.Close($false)
        } catch {
            Write-Warning "Could not open $($file.Name): $($_.Exception.Message)"
        }
    }
} finally {
    $xl.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($xl) | Out-Null
    [GC]::Collect()
}
