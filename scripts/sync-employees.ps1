$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false

# Config
$SUPABASE_URL  = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"

try {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    if (-not $scriptDir) { $scriptDir = $PSScriptRoot }
    $projectRoot = Split-Path -Parent $scriptDir
    $path = (Get-ChildItem -Path (Join-Path $projectRoot "DS*.xlsx") | Select-Object -ExpandProperty FullName -First 1)
    if (-not $path) {
        $path = Get-ChildItem -Path "C:\Users\lam.dv2\OneDrive - Ortholite Vietnam\PROJECT L*\DailyFoamingReport\DS*.xlsx" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName -First 1
    }
    if (-not $path) {
        $path = Get-ChildItem -Path "C:\Users\lam.dv\OneDrive - Ortholite Vietnam\PROJECT L*\REPORT DAILY\DS*.xlsx" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName -First 1
    }
    if (-not $path) {
        throw "Could not find DS*.xlsx file in project root or expected directories."
    }
    Write-Host "Opening file: $path"
    $wb = $xl.Workbooks.Open($path, 0, $true)
    $ws = $wb.Worksheets.Item(1)
    $nr = $ws.UsedRange.Rows.Count
    # Find header row and column mappings dynamically
    $headerRow = 0
    $colMsnv = 5
    $colName = 6
    $colDept = 8
    $colRole = 9

    for ($r = 1; $r -le 100; $r++) {
        $found = $false
        for ($c = 1; $c -le 15; $c++) {
            $txt = $ws.Cells.Item($r, $c).Text.Trim()
            if ($txt -like "*Số Thẻ*" -or $txt -like "*MSNV*" -or $txt -eq "Code") {
                $found = $true
                break
            }
        }
        if ($found) {
            $headerRow = $r
            for ($c = 1; $c -le 15; $c++) {
                $txt = $ws.Cells.Item($r, $c).Text.Trim() -replace "`r`n", " " -replace "`n", " "
                if ($txt -like "*Th?*Code*" -or $txt -like "*Thẻ*Code*" -or $txt -like "*MSNV*" -or ($txt -like "*Code*" -and $txt -ne "Code")) { $colMsnv = $c }
                elseif ($txt -like "*Name*" -or $txt -like "*Tên*" -or $txt -like "*Ten*") { $colName = $c }
                elseif ($txt -like "*Section*" -or $txt -like "*Phận*" -or $txt -like "*Phan*") { $colDept = $c }
                elseif ($txt -like "*Position*" -or $txt -like "*Vụ*" -or $txt -like "*Vu*") { $colRole = $c }
            }
            Write-Host "Detected header row $headerRow. Columns - MSNV: $colMsnv, Name: $colName, Section: $colDept, Position: $colRole"
            break
        }
    }

    $startRow = if ($headerRow -gt 0) { $headerRow + 1 } else { 2 }
    $users = [System.Collections.Generic.List[object]]::new()

    for($r=$startRow; $r -le $nr; $r++){
        $msnv = $ws.Cells.Item($r, $colMsnv).Text.Trim()
        $name = $ws.Cells.Item($r, $colName).Text.Trim() -replace "`r`n", " " -replace "`n", " "
        $dept = $ws.Cells.Item($r, $colDept).Text.Trim() 
        $role = $ws.Cells.Item($r, $colRole).Text.Trim()

        if ([string]::IsNullOrWhiteSpace($msnv) -or $msnv -match "[a-zA-Z]" -or $msnv -eq "Code" -or $msnv -like "*S? Th?*") { continue }
        if ([string]::IsNullOrWhiteSpace($name) -or $name -match "Full Name" -or $name -match "H? v Tn") { continue }

        $dbRole = "worker"
        if ($role -match "Manager|Director|Supervisor|Leader|Staff|Engineer") {
            $dbRole = "supervisor"
        }

        $users.Add(@{
            msnv = $msnv
            full_name = $name
            department = $dept
            role = $dbRole
            position = $role
        })
    }

    $wb.Close($false)
    $xl.Quit()

    Write-Host "Found $($users.Count) valid users. Syncing to Supabase..."

    if ($users.Count -gt 0) {
        $batchSize = 20
        for ($i = 0; $i -lt $users.Count; $i += $batchSize) {
            $batch = $users | Select-Object -Skip $i -First $batchSize
            $json = $batch | ConvertTo-Json -Compress
            
            $headers = @{
                "apikey"        = $SUPABASE_KEY
                "Authorization" = "Bearer $SUPABASE_KEY"
                "Content-Type"  = "application/json"
                "Prefer"        = "resolution=merge-duplicates"
            }

            try {
                $resp = Invoke-WebRequest -Uri "$SUPABASE_URL/rest/v1/users?on_conflict=msnv" -Method Post -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($json)) -UseBasicParsing
                Write-Host "  Batch starting at ${i}: Success ($($resp.StatusCode))"
            } catch {
                Write-Host "  [ERROR] Batch starting at ${i}: $($_.Exception.Message)" -ForegroundColor Red
                if ($_.Exception.Response) {
                    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                    Write-Host "  Details: $($reader.ReadToEnd())" -ForegroundColor Yellow
                }
            }
        }
        Write-Host "Sync process completed."
    }

} catch {
    Write-Host "  [CRITICAL ERROR] $($_.Exception.Message)" -ForegroundColor Red
} finally {
    $xl.Quit()
}
