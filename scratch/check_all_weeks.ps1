$SUPABASE_URL  = "https://brdecledtyypykowjnjt.supabase.co"
$SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"

$headers = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
}

# We will page through production_plan to find all unique week labels
$allWeeks = @{}
$limit = 1000
$offset = 0
$hasMore = $true

while ($hasMore) {
    $url = "$SUPABASE_URL/rest/v1/production_plan?select=week_label&limit=$limit&offset=$offset"
    try {
        $resp = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
        if ($resp.Count -eq 0) {
            $hasMore = $false
        } else {
            foreach ($item in $resp) {
                $wl = $item.week_label
                if ($null -ne $wl) {
                    $allWeeks[$wl] = ($allWeeks[$wl] + 1)
                }
            }
            $offset += $limit
        }
    } catch {
        Write-Host "Error fetching at offset $($offset): $_"
        $hasMore = $false
    }
}

Write-Host "=== Unique Week Labels in DB ==="
foreach ($key in $allWeeks.Keys) {
    Write-Host "$key -> $($allWeeks[$key])"
}
