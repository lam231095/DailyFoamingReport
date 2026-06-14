$results = Get-ChildItem -Path "C:\Users\lam.dv2" -Filter "*.xlsx" -Recurse -ErrorAction SilentlyContinue | Where-Object {
    $_.Name -like "*Sample*" -or $_.Name -like "*W23*" -or $_.Name -like "*W22*" -or $_.LastWriteTime -gt (Get-Date).AddDays(-5)
} | Sort-Object LastWriteTime -Descending

foreach ($r in $results) {
    [PSCustomObject]@{
        Name = $r.Name
        LastWriteTime = $r.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
        Length = $r.Length
        FullName = $r.FullName
    } | Format-List
}
