$apikey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZGVjbGVkdHl5cHlrb3dqbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzgzMDksImV4cCI6MjA5MTg1NDMwOX0.86Vbjllr_IwYHgA92NJCxjPECmLWnb8ZQjiHISOrEkQ"
$headers = @{
  "apikey" = $apikey
  "Authorization" = "Bearer $apikey"
}

$ids = @("cdefd0e2-b1f8-4f12-8fdc-1b07d8625cf0", "f65a0c79-f776-423c-b225-6534e36150f4", "a162b8ab-ab95-4bf2-a0ec-5172978cc0f0", "e74532cf-d6a0-42d1-8002-e4e26c4d349a")

foreach ($id in $ids) {
  $url = "https://brdecledtyypykowjnjt.supabase.co/rest/v1/users?id=eq.$id"
  $res = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
  if ($res) {
    Write-Output "User ID $id -> MSNV: $($res.msnv), Name: $($res.full_name)"
  } else {
    Write-Output "User ID $id not found."
  }
}
