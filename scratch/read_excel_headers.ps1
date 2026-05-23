# scratch/read_excel_headers.ps1
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$excelFile = "Lam_BCN master 19.05.xlsx"
$zipFile = "scratch/temp_excel.zip"
$tempDir = "scratch/temp_excel_read"

if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
if (Test-Path $zipFile) {
    Remove-Item -Force $zipFile
}

Copy-Item $excelFile $zipFile
# Unzip the zip file
Expand-Archive -Path $zipFile -DestinationPath $tempDir

# Read sharedStrings.xml to match string IDs
$sharedStringsFile = "$tempDir/xl/sharedStrings.xml"
$strings = @()
if (Test-Path $sharedStringsFile) {
    [xml]$xml = Get-Content $sharedStringsFile -Encoding UTF8
    $ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
    $ns.AddNamespace("x", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")
    $tNodes = $xml.SelectNodes("//x:t", $ns)
    foreach ($node in $tNodes) {
        $strings += $node.InnerText
    }
}

Write-Host "Total shared strings: $($strings.Count)"

# Let's find workbook.xml to see sheet names
$workbookFile = "$tempDir/xl/workbook.xml"
$sheetNames = @{}
if (Test-Path $workbookFile) {
    [xml]$wbXml = Get-Content $workbookFile
    $ns = New-Object System.Xml.XmlNamespaceManager($wbXml.NameTable)
    $ns.AddNamespace("x", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")
    $sheets = $wbXml.SelectNodes("//x:sheet", $ns)
    foreach ($sheet in $sheets) {
        $sheetNames[$sheet.getAttribute("sheetId")] = $sheet.getAttribute("name")
    }
}

# Let's find files in xl/worksheets/
$worksheetsDir = "$tempDir/xl/worksheets"
$sheetFiles = Get-ChildItem -Path $worksheetsDir -Filter "sheet*.xml"

foreach ($file in $sheetFiles) {
    # Extract sheet ID from filename (e.g. sheet1.xml -> 1)
    $sheetId = $file.Name -replace "sheet(\d+)\.xml", '$1'
    $sheetName = $sheetNames[$sheetId]
    
    [xml]$sheetXml = Get-Content $file.FullName
    $ns = New-Object System.Xml.XmlNamespaceManager($sheetXml.NameTable)
    $ns.AddNamespace("x", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")
    
    # Let's read first few rows (e.g. row 1 or 2 which usually contain headers)
    $rows = $sheetXml.SelectNodes("//x:row", $ns)
    Write-Host "`nSheet ID: $sheetId | Name: $sheetName | Total Rows: $($rows.Count)"
    
    # Let's search row 1 to 5 for headers
    for ($r = 0; $r -lt [Math]::Min(10, $rows.Count); $r++) {
        $row = $rows[$r]
        $cells = $row.SelectNodes("x:c", $ns)
        $rowCells = @()
        foreach ($cell in $cells) {
            $valNode = $cell.SelectSingleNode("x:v", $ns)
            if ($valNode) {
                $val = $valNode.InnerText
                $type = $cell.getAttribute("t")
                if ($type -eq "s") {
                    $stringVal = $strings[[int]$val]
                    $rowCells += "$($cell.getAttribute('r'))='$stringVal'"
                } else {
                    $rowCells += "$($cell.getAttribute('r'))=$val"
                }
            }
        }
        if ($rowCells.Count -gt 0) {
            Write-Host "  Row $($row.getAttribute('r')): $($rowCells[0..[Math]::Min(15, $rowCells.Count-1)] -join ', ')"
        }
    }
}

# Clean up
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
if (Test-Path $zipFile) {
    Remove-Item -Force $zipFile
}
