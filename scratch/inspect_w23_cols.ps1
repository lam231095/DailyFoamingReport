# scratch/inspect_w23_cols.ps1
$filePath = Join-Path (Resolve-Path ".") "ke_hoach_san_xuat.xlsx"
$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false

try {
    $wb = $xl.Workbooks.Open($filePath, 0, $true)
    
    foreach ($sheetName in @("W23-2026 - L1", "W23-2026 - L2")) {
        $ws = $wb.Worksheets.Item($sheetName)
        if ($null -ne $ws) {
            Write-Host "=== Sheet: $sheetName ==="
            # Print row 2 (headers) and first 5 data rows
            for ($r = 2; $r -le 10; $r++) {
                $rowValues = @()
                for ($c = 1; $c -le 20; $c++) {
                    $val = $ws.Cells.Item($r, $c).Text.Trim()
                    $rowValues += "$($c): '$val'"
                }
                Write-Host "Row $($r): $($rowValues -join ' | ')"
            }
        }
    }
    
    $wb.Close($false)
} finally {
    $xl.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null
    [GC]::Collect()
}
