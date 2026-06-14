Get-ChildItem -Path "C:\Users\lam.dv2" -Filter "*.xlsx" -Recurse -ErrorAction SilentlyContinue | Where-Object { 
    $_.Name -like "*Sample*" -or $_.Name -like "*W23*" -or $_.LastWriteTime -gt (Get-Date).AddDays(-5)
} | Select-Object Name, FullName, Length, LastWriteTime | Format-Table -AutoSize
