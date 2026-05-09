# Supabase Config
$supabaseUrl = "https://brdecledtyypykowjnjt.supabase.co"
$supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"

$headers = @{
    "apikey" = $supabaseKey
    "Authorization" = "Bearer $supabaseKey"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

# Excel Config
$cwd = Get-Location
$filePath = Join-Path $cwd "ke_hoach_san_xuat.xlsx"
$sheetName = "W19-2026 - L2"
$weekLabel = "W19-2026"

Write-Host "Connecting to Excel..."
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

try {
    $workbook = $excel.Workbooks.Open($filePath, 0, $true)
    $sheet = $workbook.Sheets.Item($sheetName)
    
    $row = 6
    while ($true) {
        $firmPlan = $sheet.Cells.Item($row, 2).Text.Trim()
        if ([string]::IsNullOrWhiteSpace($firmPlan)) {
            if ($row -gt 20) { break } # Stop if empty firm plan and we've processed some rows
        }
        
        if (![string]::IsNullOrWhiteSpace($firmPlan)) {
            $noOrder = $sheet.Cells.Item($row, 1).Text.Trim()
            $bunCode = $sheet.Cells.Item($row, 5).Text.Trim()
            $puCode = $sheet.Cells.Item($row, 6).Text.Trim()
            $productName = $sheet.Cells.Item($row, 7).Text.Trim()
            
            $slSheetRaw = $sheet.Cells.Item($row, 8).Text.Trim().Replace(",", "")
            $slBunTachRaw = $sheet.Cells.Item($row, 9).Text.Trim().Replace(",", "")
            $slBunDoRaw = $sheet.Cells.Item($row, 10).Text.Trim().Replace(",", "")
            
            $slSheet = if ($slSheetRaw -as [int]) { [int]$slSheetRaw } else { 0 }
            $slBunTach = if ($slBunTachRaw -as [int]) { [int]$slBunTachRaw } else { 0 }
            $slBunDo = if ($slBunDoRaw -as [int]) { [int]$slBunDoRaw } else { 0 }
            
            Write-Host "Processing Row ${row}: $firmPlan | $bunCode"
            
            # Check if exists
            $checkUrl = "$supabaseUrl/rest/v1/production_plan?firm_plan=eq.$firmPlan&bun_code=eq.$bunCode&week_label=eq.$weekLabel&select=id"
            $response = Invoke-RestMethod -Uri $checkUrl -Headers $headers -Method Get
            
            $existing = @()
            if ($response -is [PSCustomObject] -and $response.value -ne $null) {
                $existing = $response.value
            } elseif ($response -is [Array]) {
                $existing = $response
            }
            
            $data = @{
                "firm_plan" = $firmPlan
                "bun_code" = $bunCode
                "pu_code" = $puCode
                "ten_san_pham" = $productName
                "sl_sheet" = $slSheet
                "sl_bun_can_tach" = $slBunTach
                "sl_bun_can_do" = $slBunDo
                "week_label" = $weekLabel
                "no_order" = $noOrder
                "synced_at" = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
            }
            
            if ($existing.Count -gt 0) {
                $id = $existing[0].id
                Write-Host "  Updating existing record ID: $id"
                $updateUrl = "$supabaseUrl/rest/v1/production_plan?id=eq.$id"
                Invoke-RestMethod -Uri $updateUrl -Headers $headers -Method Patch -Body ($data | ConvertTo-Json)
            } else {
                Write-Host "  Inserting new record"
                $insertUrl = "$supabaseUrl/rest/v1/production_plan"
                Invoke-RestMethod -Uri $insertUrl -Headers $headers -Method Post -Body ($data | ConvertTo-Json)
            }
        }
        
        $row++
        if ($row -gt 2000) { break } # Safety break
    }
    
    $workbook.Close($false)
    Write-Host "Import completed successfully."
} catch {
    Write-Error "Error: $_"
} finally {
    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}
