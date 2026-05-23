$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$parentPath = Split-Path -Parent $scriptPath
$filePath = Join-Path $parentPath "IN DON.xlsm"

Write-Output "Checking lock on: $filePath"

try {
    # Open file with exclusive ReadWrite access to see if it is locked
    $file = [System.IO.File]::Open($filePath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
    $file.Close()
    Write-Output "RESULT: The file is NOT locked. It can be opened for writing."
} catch {
    Write-Output "RESULT: The file is LOCKED!"
    Write-Output "Details: $($_.Exception.Message)"
}
