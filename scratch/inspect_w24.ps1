# scratch/inspect_w24.ps1
# Script to inspect "List pha liệu đầu tuần 24" sheet in ke_hoach_san_xuat.xlsx.

$filePath = Join-Path (Resolve-Path ".") "ke_hoach_san_xuat.xlsx"

Write-Host "Opening Excel file: $filePath" -ForegroundColor Cyan

if (-not (Test-Path $filePath)) {
    Write-Host "[ERROR] Excel file not found!" -ForegroundColor Red
    exit 1
}

# Set console encoding to UTF-8
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false

try {
    $wb = $xl.Workbooks.Open($filePath, 0, $true)
    
    # Find the sheet
    $ws = $null
    foreach ($sheet in $wb.Worksheets) {
        if ($sheet.Name -match "List pha" -and $sheet.Name -match "24") {
            $ws = $sheet
            break
        }
    }
    
    if ($null -eq $ws) {
        Write-Host "[ERROR] Sheet not found!" -ForegroundColor Red
        $wb.Close($false)
        exit 1
    }
    
    Write-Host "Found sheet: '$($ws.Name)' with $($ws.UsedRange.Rows.Count) rows and $($ws.UsedRange.Columns.Count) columns." -ForegroundColor Green
    
    $rowCount = [Math]::Min($ws.UsedRange.Rows.Count, 30)
    $colCount = [Math]::Min($ws.UsedRange.Columns.Count, 25)
    
    for ($r = 1; $r -le $rowCount; $r++) {
        $rowValues = @()
        for ($c = 1; $c -le $colCount; $c++) {
            $val = $ws.Cells.Item($r, $c).Text
            $rowValues += "$($c): '$($val.Trim())'"
        }
        Write-Host "Row $($r): $($rowValues -join ' | ')"
    }
    
    $wb.Close($false)
} catch {
    Write-Host "[ERROR] An error occurred: $_" -ForegroundColor Red
} finally {
    $xl.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null
    [GC]::Collect()
}
