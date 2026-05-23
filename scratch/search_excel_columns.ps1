# scratch/search_excel_columns.ps1
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$excelFiles = Get-ChildItem -Filter "*.xlsx"

foreach ($file in $excelFiles) {
    $zipFile = "scratch/temp_search.zip"
    $tempDir = "scratch/temp_search_read"
    if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
    if (Test-Path $zipFile) { Remove-Item -Force $zipFile }
    
    Copy-Item $file.FullName $zipFile
    try {
        Expand-Archive -Path $zipFile -DestinationPath $tempDir -ErrorAction SilentlyContinue
    } catch {
        continue
    }
    
    $sharedStringsFile = "$tempDir/xl/sharedStrings.xml"
    if (-not (Test-Path $sharedStringsFile)) {
        continue
    }
    
    [xml]$xml = Get-Content $sharedStringsFile -Encoding UTF8
    $ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
    $ns.AddNamespace("x", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")
    $tNodes = $xml.SelectNodes("//x:t", $ns)
    $strings = @()
    foreach ($node in $tNodes) {
        $strings += $node.InnerText
    }
    
    # Check if "nứt rách" or "lỗi khác" is in the shared strings
    $foundNutRach = $false
    $foundLoiKhac = $false
    for ($i = 0; $i -lt $strings.Count; $i++) {
        if ($strings[$i] -like "*nứt rách*") {
            $foundNutRach = $true
            # Write-Host "  Found 'nứt rách' in string ID $i: '$($strings[$i])'"
        }
        if ($strings[$i] -like "*lỗi khác*") {
            $foundLoiKhac = $true
            # Write-Host "  Found 'lỗi khác' in string ID $i: '$($strings[$i])'"
        }
    }
    
    if ($foundNutRach -or $foundLoiKhac) {
        Write-Host "`nExcel File: $($file.Name) contains target error terms."
        # Find sheet names
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
        foreach ($sFile in $sheetFiles) {
            $sheetId = $sFile.Name -replace "sheet(\d+)\.xml", '$1'
            $sheetName = $sheetNames[$sheetId]
            
            [xml]$sheetXml = Get-Content $sFile.FullName
            $sNs = New-Object System.Xml.XmlNamespaceManager($sheetXml.NameTable)
            $sNs.AddNamespace("x", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")
            
            $rows = $sheetXml.SelectNodes("//x:row", $sNs)
            # Scan the first 10 rows for columns with these strings
            for ($r = 0; $r -lt [Math]::Min(15, $rows.Count); $r++) {
                $row = $rows[$r]
                $cells = $row.SelectNodes("x:c", $sNs)
                $matchedHeaders = @()
                foreach ($cell in $cells) {
                    $valNode = $cell.SelectSingleNode("x:v", $sNs)
                    if ($valNode) {
                        $valIndex = [int]$valNode.InnerText
                        $type = $cell.getAttribute("t")
                        if ($type -eq "s" -and $valIndex -lt $strings.Count) {
                            $strVal = $strings[$valIndex]
                            if ($strVal -like "*nứt rách*" -or $strVal -like "*lỗi khác*" -or $strVal -like "*bọt khí*") {
                                $matchedHeaders += "$($cell.getAttribute('r'))='$strVal'"
                            }
                        }
                    }
                }
                if ($matchedHeaders.Count -gt 0) {
                    Write-Host "  Sheet: $sheetName | Row $($row.getAttribute('r')): $($matchedHeaders -join ', ')"
                }
            }
        }
    }
    
    if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
    if (Test-Path $zipFile) { Remove-Item -Force $zipFile }
}
