# scratch/read_all_sheets.ps1
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$excelFile = "Foaming Plan.xlsx"
Write-Host "Reading $excelFile..."

$zipFile = "scratch/temp_read.zip"
$tempDir = "scratch/temp_read_dir"
if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
if (Test-Path $zipFile) { Remove-Item -Force $zipFile }

Copy-Item $excelFile $zipFile
Expand-Archive -Path $zipFile -DestinationPath $tempDir -ErrorAction SilentlyContinue

$workbookFile = "$tempDir/xl/workbook.xml"
if (Test-Path $workbookFile) {
    [xml]$wbXml = Get-Content $workbookFile
    $wbNs = New-Object System.Xml.XmlNamespaceManager($wbXml.NameTable)
    $wbNs.AddNamespace("x", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")
    $sheets = $wbXml.SelectNodes("//x:sheet", $wbNs)
    Write-Host "Sheets in $excelFile :"
    foreach ($sheet in $sheets) {
        Write-Host "  Name: $($sheet.getAttribute('name')) | SheetId: $($sheet.getAttribute('sheetId')) | Id: $($sheet.getAttribute('id','http://schemas.openxmlformats.org/officeDocument/2006/relationships'))"
    }
}

if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
if (Test-Path $zipFile) { Remove-Item -Force $zipFile }
