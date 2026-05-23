# scratch/inspect-excel.ps1
# Script to inspect Lam_BCN master 19.05.xlsx file sheets and columns.

$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot
$ExcelPath = Join-Path $PROJECT_ROOT "Lam_BCN master 19.05.xlsx"

Write-Host "Opening Excel file: $ExcelPath" -ForegroundColor Cyan

if (-not (Test-Path $ExcelPath)) {
    Write-Host "[ERROR] Excel file not found!" -ForegroundColor Red
    exit 1
}

$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false

try {
    $wb = $xl.Workbooks.Open($ExcelPath, 0, $true)
    Write-Host "Sheets in this workbook:" -ForegroundColor Green
    foreach ($ws in $wb.Worksheets) {
        Write-Host " - Name: $($ws.Name) (Rows: $($ws.UsedRange.Rows.Count), Columns: $($ws.UsedRange.Columns.Count))" -ForegroundColor Yellow
    }

    # Let's inspect the first sheet in detail, or sheets that look relevant
    foreach ($ws in $wb.Worksheets) {
        Write-Host "`n========================================" -ForegroundColor Cyan
        Write-Host "Sheet: $($ws.Name)" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan

        $rowCount = [Math]::Min($ws.UsedRange.Rows.Count, 15)
        $colCount = [Math]::Min($ws.UsedRange.Columns.Count, 25)

        Write-Host "First $rowCount rows and $colCount columns:" -ForegroundColor Green
        
        # Read the first 15 rows to print and find headers
        for ($r = 1; $r -le $rowCount; $r++) {
            $rowValues = @()
            for ($c = 1; $c -le $colCount; $c++) {
                $val = $ws.Cells.Item($r, $c).Text
                $rowValues += "$($c): '$($val.Trim())'"
            }
            Write-Host "Row $($r): $($rowValues -join ' | ')"
        }

        # Look specifically for column names
        $headerRow = 0
        $columnsFound = @{}
        
        # Search the first 10 rows for headers
        for ($r = 1; $r -le 10; $r++) {
            for ($c = 1; $c -le $ws.UsedRange.Columns.Count; $c++) {
                $val = $ws.Cells.Item($r, $c).Text.Trim()
                if ($val -ne "") {
                    # Add to found columns mapping
                    if (-not $columnsFound.ContainsKey($val)) {
                        $columnsFound[$val] = @()
                    }
                    $columnsFound[$val] += @{ Row = $r; Col = $c }
                }
            }
        }

        Write-Host "`nDetected headers in sheet '$($ws.Name)':" -ForegroundColor Green
        foreach ($key in $columnsFound.Keys) {
            $locs = $columnsFound[$key] | ForEach-Object { "Row $($_.Row), Col $($_.Col)" }
            Write-Host " - '$key' at: $($locs -join '; ')"
        }
    }

    $wb.Close($false)
} catch {
    Write-Host "[ERROR] An error occurred: $_" -ForegroundColor Red
} finally {
    $xl.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($xl) | Out-Null
    [GC]::Collect()
}
