Get-Process | Where-Object {$_.ProcessName -eq "excel"} | Select-Object Id, MainWindowTitle | Format-Table -AutoSize
