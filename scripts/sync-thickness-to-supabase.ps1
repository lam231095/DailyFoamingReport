# ==============================================================
#  SYNC THICKNESS STANDARDS TO SUPABASE
# ==============================================================

# ---- CONFIG ----
$SUPABASE_URL  = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"

$SCRIPT_DIR    = $PSScriptRoot
$PROJECT_ROOT  = Split-Path -Parent $SCRIPT_DIR
$EXCEL_FILE    = (Get-ChildItem -Path $PROJECT_ROOT -Filter "*d*y*s*t*m*.xlsx" | Select-Object -First 1).FullName

if (-not $EXCEL_FILE) {
    Write-Host "[ERROR] Khong tim thay file Excel Do day - So tam" -ForegroundColor Red
    exit
}

Write-Host "--- SYNCING THICKNESS STANDARDS ---"
Write-Host "File: $EXCEL_FILE"

$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false

try {
    $wb = $xl.Workbooks.Open($EXCEL_FILE, 0, $true)
    $ws = $wb.Worksheets.Item(1)
    $nr = $ws.UsedRange.Rows.Count
    
    $records = New-Object System.Collections.Generic.List[PSObject]
    
    # Data start from row 2 (row 1 is header)
    for ($r = 2; $r -le $nr; $r++) {
        $thickness = $ws.Cells.Item($r, 1).Value2
        if ($null -eq $thickness -or $thickness -eq "") { continue }
        
        $rec = [ordered]@{
            thickness_mm            = [double]$thickness
            total_bun_thickness_mm  = [double]$ws.Cells.Item($r, 2).Value2
            tolerance_mm            = [double]$ws.Cells.Item($r, 3).Value2
            sheets_per_bun          = [int]$ws.Cells.Item($r, 4).Value2
            optimal_sheets_per_bun  = [int]$ws.Cells.Item($r, 5).Value2
            updated_at              = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
        }
        $records.Add($rec)
    }
    $wb.Close($false)
    
    if ($records.Count -gt 0) {
        $json = $records | ConvertTo-Json -Compress
        $headers = @{
            "apikey"        = $SUPABASE_KEY
            "Authorization" = "Bearer $SUPABASE_KEY"
            "Content-Type"  = "application/json"
            "Prefer"        = "resolution=merge-duplicates"
        }
        
        Write-Host "Uploading $($records.Count) standards to Supabase..."
        Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/thickness_standards?on_conflict=thickness_mm" `
            -Method Post -Headers $headers -Body $json
        Write-Host "[SUCCESS] Da dong bo bảng tieu chuan do day!" -ForegroundColor Green
    }
} catch {
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
} finally {
    $xl.Quit()
}
