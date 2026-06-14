# scratch/save_active_excel.ps1
try {
    $xl = [System.Runtime.InteropServices.Marshal]::GetActiveObject("Excel.Application")
    $wb = $null
    foreach ($w in $xl.Workbooks) {
        if ($w.Name -like "*ke_hoach_san_xuat*") {
            $wb = $w
            break
        }
    }
    if ($null -ne $wb) {
        $wb.Save()
        Write-Host "Saved the active workbook '$($wb.Name)' successfully!" -ForegroundColor Green
    } else {
        Write-Host "Workbook 'ke_hoach_san_xuat.xlsx' is not currently open in the active Excel instance." -ForegroundColor Yellow
    }
} catch {
    Write-Host "Could not get active Excel application: $_" -ForegroundColor Red
}
