try {
    $excel = [System.Runtime.InteropServices.Marshal]::GetActiveObject("Excel.Application")
    Write-Output "Successfully attached to running Excel instance."
    Write-Output "Open workbooks:"
    foreach ($wb in $excel.Workbooks) {
        Write-Output " - $($wb.Name) (Path: $($wb.FullName))"
    }
} catch {
    Write-Output "Could not attach to running Excel instance: $_"
}
