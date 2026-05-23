# scratch/read_exact_headers.ps1
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$excelFile = (Get-ChildItem -Filter "*Foaming*.xlsx" | Where-Object { $_.Name -like "*DS*" })[0].FullName
Write-Host "Reading headers from $excelFile..."

$zipFile = "scratch/temp_read.zip"
$tempDir = "scratch/temp_read_dir"
if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
if (Test-Path $zipFile) { Remove-Item -Force $zipFile }

Copy-Item $excelFile $zipFile
Expand-Archive -Path $zipFile -DestinationPath $tempDir -ErrorAction SilentlyContinue

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

$workbookFile = "$tempDir/xl/workbook.xml"
$sheetNames = @{}
if (Test-Path $workbookFile) {
    [xml]$wbXml = Get-Content $workbookFile
    $wbNs = New-Object System.Xml.XmlNamespaceManager($wbXml.NameTable)
    $wbNs.AddNamespace("x", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")
    $sheets = $wbXml.SelectNodes("//x:sheet", $wbNs)
    foreach ($sheet in $sheets) {
        $sheetNames[$sheet.getAttribute("sheetId")] = $sheet.getAttribute("name")
    }
}

$worksheetsDir = "$tempDir/xl/worksheets"
$sheetFiles = Get-ChildItem -Path $worksheetsDir -Filter "sheet*.xml"
foreach ($file in $sheetFiles) {
    $sheetId = $file.Name -replace "sheet(\d+)\.xml", '$1'
    $sheetName = $sheetNames[$sheetId]
    
    [xml]$sheetXml = Get-Content $file.FullName
    $sNs = New-Object System.Xml.XmlNamespaceManager($sheetXml.NameTable)
    $sNs.AddNamespace("x", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")
    
    $rows = $sheetXml.SelectNodes("//x:row", $sNs)
    Write-Host "Sheet: $sheetName | Total Rows: $($rows.Count)"
    
    # Read first 15 rows to find headers
    for ($r = 0; $r -lt [Math]::Min(15, $rows.Count); $r++) {
        $row = $rows[$r]
        $cells = $row.SelectNodes("x:c", $sNs)
        $rowCells = @()
        foreach ($cell in $cells) {
            $valNode = $cell.SelectSingleNode("x:v", $sNs)
            $ref = $cell.getAttribute("r")
            if ($valNode) {
                $val = $valNode.InnerText
                $type = $cell.getAttribute("t")
                if ($type -eq "s") {
                    $stringVal = $strings[[int]$val]
                    $rowCells += "$ref='$stringVal'"
                } else {
                    $rowCells += "$ref=$val"
                }
            } else {
                # sometimes cells have inlineString
                $isNode = $cell.SelectSingleNode("x:is/x:t", $sNs)
                if ($isNode) {
                    $rowCells += "$ref='$($isNode.InnerText)'"
                }
            }
        }
        Write-Host "  Row $($row.getAttribute('r')): $($rowCells[0..[Math]::Min(25, $rowCells.Count-1)] -join ', ')"
    }
}

if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
if (Test-Path $zipFile) { Remove-Item -Force $zipFile }
