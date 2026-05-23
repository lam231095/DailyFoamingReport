# scratch/analyze-data.ps1
# Script to analyze and summarize columns in Lam_BCN master 19.05.xlsx

$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot
$ExcelPath = Join-Path $PROJECT_ROOT "Lam_BCN master 19.05.xlsx"

Write-Host "Analyzing Excel file: $ExcelPath" -ForegroundColor Cyan

if (-not (Test-Path $ExcelPath)) {
    Write-Host "[ERROR] Excel file not found!" -ForegroundColor Red
    exit 1
}

$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false

try {
    $wb = $xl.Workbooks.Open($ExcelPath, 0, $true)
    $ws = $wb.Worksheets.Item("Master BCN")
    $nr = $ws.UsedRange.Rows.Count
    
    Write-Host "Total rows in sheet 'Master BCN': $nr" -ForegroundColor Green

    $data = [System.Collections.Generic.List[object]]::new()
    
    # Columns indexes (based on header search)
    $COL_NO_ORDER       = 2
    $COL_FIRM_PLAN      = 4
    $COL_BUN_CODE       = 5
    $COL_PU_CODE        = 6
    $COL_QTY_ACTUAL     = 10
    $COL_PO_NO          = 13
    $COL_QTY_BUN        = 15
    $COL_PU_THICKNESS   = 17
    $COL_ETD_BUN_CHINA  = 18
    $COL_ETD_SYS_FIX    = 32

    # Loop through data rows (starting from row 5)
    for ($r = 5; $r -le $nr; $r++) {
        $firmPlan = $ws.Cells.Item($r, $COL_FIRM_PLAN).Text.Trim()
        
        # If both Firm Plan and Bun Code are empty, skip or keep?
        # Let's check if the row has any content. Let's filter by non-empty Firm Plan or Bun Code or PU Code
        $noOrder = $ws.Cells.Item($r, $COL_NO_ORDER).Text.Trim()
        $bunCode = $ws.Cells.Item($r, $COL_BUN_CODE).Text.Trim()
        $puCode = $ws.Cells.Item($r, $COL_PU_CODE).Text.Trim()
        
        if ([string]::IsNullOrWhiteSpace($firmPlan) -and [string]::IsNullOrWhiteSpace($bunCode) -and [string]::IsNullOrWhiteSpace($puCode)) {
            continue
        }

        $qtyActualText = $ws.Cells.Item($r, $COL_QTY_ACTUAL).Text.Trim()
        $poNo = $ws.Cells.Item($r, $COL_PO_NO).Text.Trim()
        $qtyBunText = $ws.Cells.Item($r, $COL_QTY_BUN).Text.Trim()
        $thicknessText = $ws.Cells.Item($r, $COL_PU_THICKNESS).Text.Trim()
        $etdBunChina = $ws.Cells.Item($r, $COL_ETD_BUN_CHINA).Text.Trim()
        $etdSysFix = $ws.Cells.Item($r, $COL_ETD_SYS_FIX).Text.Trim()

        $record = [ordered]@{
            RowIndex         = $r
            NoOrder          = $noOrder
            FirmPlan         = $firmPlan
            BunCode          = $bunCode
            PuCode           = $puCode
            QtyActualText    = $qtyActualText
            PoNo             = $poNo
            QtyBunText       = $qtyBunText
            ThicknessText    = $thicknessText
            EtdBunChina      = $etdBunChina
            EtdSysFix        = $etdSysFix
        }
        $data.Add($record)
    }

    Write-Host "Successfully read $($data.Count) data rows (excluding completely empty ones)." -ForegroundColor Green

    # Output details
    Write-Host "`nSummary of Data Columns:" -ForegroundColor Cyan
    Write-Host "------------------------"
    
    # Show first 15 records in markdown style to stdout
    Write-Host "| Row | No Order | Firm Plan | Bun Code | PU Code | PO No | Thickness | Qty Bun | Qty Actual | ETD China | ETD Sys Fix |"
    Write-Host "|---|---|---|---|---|---|---|---|---|---|---|"
    for ($i = 0; $i -lt [Math]::Min($data.Count, 20); $i++) {
        $rec = $data[$i]
        Write-Host "| $($rec.RowIndex) | $($rec.NoOrder) | $($rec.FirmPlan) | $($rec.BunCode) | $($rec.PuCode) | $($rec.PoNo) | $($rec.ThicknessText) | $($rec.QtyBunText) | $($rec.QtyActualText) | $($rec.EtdBunChina) | $($rec.EtdSysFix) |"
    }

    if ($data.Count -gt 20) {
        Write-Host "... and $($data.Count - 20) more rows."
    }

    # Gather some basic statistics
    $emptyFirmPlan = 0
    $emptyNoOrder = 0
    $totalQtyActual = 0.0
    $totalQtyBun = 0.0
    $uniqueBunCodes = @{}
    $uniquePuCodes = @{}

    foreach ($rec in $data) {
        if ([string]::IsNullOrWhiteSpace($rec.FirmPlan)) { $emptyFirmPlan++ }
        if ([string]::IsNullOrWhiteSpace($rec.NoOrder)) { $emptyNoOrder++ }
        
        # Parse QtyActual
        if ($rec.QtyActualText -match "^[\d\.,-]+$") {
            $val = 0.0
            if ([double]::TryParse($rec.QtyActualText.Replace(",", ""), [ref]$val)) {
                $totalQtyActual += $val
            }
        }
        # Parse QtyBun
        if ($rec.QtyBunText -match "^[\d\.,-]+$") {
            $val = 0.0
            if ([double]::TryParse($rec.QtyBunText.Replace(",", ""), [ref]$val)) {
                $totalQtyBun += $val
            }
        }

        if (-not [string]::IsNullOrWhiteSpace($rec.BunCode)) { $uniqueBunCodes[$rec.BunCode] = $true }
        if (-not [string]::IsNullOrWhiteSpace($rec.PuCode)) { $uniquePuCodes[$rec.PuCode] = $true }
    }

    Write-Host "`n--- Statistics ---" -ForegroundColor Cyan
    Write-Host "Total records parsed: $($data.Count)"
    Write-Host "Records missing Firm Plan: $emptyFirmPlan"
    Write-Host "Records missing No Order: $emptyNoOrder"
    Write-Host "Unique Bun Codes: $($uniqueBunCodes.Count)"
    Write-Host "Unique PU Codes: $($uniquePuCodes.Count)"
    Write-Host "Sum of Qty (BUN) (Pur Qty): $totalQtyBun"
    Write-Host "Sum of QQTY Actual Delivered: $totalQtyActual"

    $wb.Close($false)
} catch {
    Write-Host "[ERROR] An error occurred: $_" -ForegroundColor Red
} finally {
    $xl.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($xl) | Out-Null
    [GC]::Collect()
}
