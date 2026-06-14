$SUPABASE_URL = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"

$headers = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
    "Content-Type"  = "application/json"
    "Prefer"        = "return=representation"
}

$ids = @("39c2d1cb-f1d5-4ca6-847c-b32a60eca34c", "4e81d4dc-5ac0-4120-8b0e-5ff107abb3b1")

foreach ($id in $ids) {
    $uri = "$SUPABASE_URL/rest/v1/foaming_pour_reports?id=eq.$id"
    $body = @{
        shift = "Ca 1"
    } | ConvertTo-Json
    
    Write-Host "Updating report ID $id to Ca 1..."
    try {
        $resp = Invoke-RestMethod -Uri $uri -Method Patch -Headers $headers -Body $body -ErrorAction Stop
        Write-Host "Updated successfully!" -ForegroundColor Green
        $resp | ConvertTo-Json | Write-Host
    } catch {
        Write-Host "Error updating report $($id): $_" -ForegroundColor Red
    }
}
