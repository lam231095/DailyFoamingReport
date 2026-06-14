$EXCEL_FILE = (Resolve-Path "Foaming Plan.xlsx").Path
Write-Host "Resolved path: $EXCEL_FILE"
Write-Host "File exists: $(Test-Path $EXCEL_FILE)"
