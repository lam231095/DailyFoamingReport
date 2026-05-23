Get-ChildItem 'HKCU:\Software\Microsoft\Office' | 
    Get-ChildItem -ErrorAction SilentlyContinue | 
    Where-Object { $_.PSChildName -like '*Excel*' } | 
    Get-ChildItem -ErrorAction SilentlyContinue | 
    Where-Object { $_.PSChildName -like '*Security*' } | 
    ForEach-Object {
        Write-Output "Registry Path: $($_.Name)"
        Get-ItemProperty $_.PSPath | Select-Object -Property VBAWarnings, AccessVBOM -ErrorAction SilentlyContinue
    }
