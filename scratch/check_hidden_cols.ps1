# scratch/check_hidden_cols.ps1
$filePath = Join-Path (Resolve-Path ".") "ke_hoach_san_xuat.xlsx"
$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false

try {
    $wb = $xl.Workbooks.Open($filePath, 0, $true)
    $ws = $null
    foreach ($sheet in $wb.Worksheets) {
        if ($sheet.Name -match "List pha" -and $sheet.Name -match "24") {
            $ws = $sheet
            break
        }
    }
    
    if ($null -eq $ws) {
        Write-Host "Sheet not found!"
        exit 1
    }
    
    Write-Host "Sheet: $($ws.Name)"
    Write-Host "Columns check (first 25 columns):"
    for ($c = 1; $c -le 25; $c++) {
        $colRange = $ws.Columns.Item($c)
        $isHidden = $colRange.Hidden
        $header = $ws.Cells.Item(2, $c).Text.Trim()
        $row4Val = $ws.Cells.Item(4, $c).Text.Trim()
        $row6Val = $ws.Cells.Item(6, $c).Text.Trim()
        Write-Host "Col $c ($([char](64+$c))): Hidden=$isHidden | Header='$header' | Row 4='$row4Val' | Row 6='$row6Val'"
    }
    
    $wb.Close($false)
} finally {
    $xl.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null
    [GC]::Collect()
}
