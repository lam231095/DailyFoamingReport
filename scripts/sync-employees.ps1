$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false

# Config
$SUPABASE_URL  = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"

try {
    $path = Get-ChildItem -Path "C:\Users\lam.dv\OneDrive - Ortholite Vietnam\PROJECT L*\REPORT DAILY\DS*.xlsx" | Select-Object -ExpandProperty FullName
    Write-Host "Opening file: $path"
    $wb = $xl.Workbooks.Open($path, 0, $true)
    $ws = $wb.Worksheets.Item(1)
    $nr = $ws.UsedRange.Rows.Count

    $users = [System.Collections.Generic.List[object]]::new()

    for($r=2; $r -le $nr; $r++){
        $msnv = $ws.Cells.Item($r, 5).Text.Trim()
        $name = $ws.Cells.Item($r, 6).Text.Trim() -replace "`r`n", " " -replace "`n", " "
        $dept = $ws.Cells.Item($r, 8).Text.Trim() 
        $role = $ws.Cells.Item($r, 9).Text.Trim()

        if ([string]::IsNullOrWhiteSpace($msnv) -or $msnv -match "[a-zA-Z]" -or $msnv -eq "Code") { continue }
        if ([string]::IsNullOrWhiteSpace($name) -or $name -match "Full Name") { continue }

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
