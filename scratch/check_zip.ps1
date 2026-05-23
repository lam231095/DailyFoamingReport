$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$parentPath = Split-Path -Parent $scriptPath
$filePath = Join-Path $parentPath "IN DON.xlsm"

Write-Output "Checking zip contents for: $filePath"

try {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::OpenRead($filePath)
    
    Write-Output "Zip archive opened successfully."
    $hasVba = $false
    foreach ($entry in $zip.Entries) {
        if ($entry.FullName -like "*vba*") {
            Write-Output "Found: $($entry.FullName) (Size: $($entry.Length) bytes)"
            $hasVba = $true
        }
    }
    $zip.Dispose()
    
    if (-not $hasVba) {
        Write-Output "No VBA files found in the ZIP archive!"
    }
} catch {
    Write-Error "Failed to read zip: $_"
}
