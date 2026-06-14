Get-ChildItem -Path "." -Filter "*.xlsx" | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize
