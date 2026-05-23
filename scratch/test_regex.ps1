# scratch/test_regex.ps1
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ERROR_TYPES = @(
  'Bọt khí', 'Loang trắng', 'Loang đen', 'Lõm mặt',
  'Xốp biên', 'Cứng đáy', 'NG màu', 'Sọc dao',
  'mm không đều', 'Mỏng dày', 'Cong, biến dạng', 'Nứt rách', 'Lỗi khác',
  'Lỗi độ cứng TRÊN chuẩn', 'Lỗi độ cứng DƯỚI chuẩn'
)

$testStrings = @(
  "Lỗi khác (8), Lõm mặt (4), Cứng đáy (8)",
  "Loang trắng (140), Lỗi khác (250)",
  "Cứng đáy (6), Lõm mặt (4), Lỗi khác (12)",
  "Bọt khí (15), Lỗi khác (45)",
  "Lỗi khác (25)"
)

foreach ($str in $testStrings) {
    Write-Host "-----------------------------"
    Write-Host "Input string: '$str'"
    
    $errorDetails = @()
    foreach ($type in $ERROR_TYPES) {
        # Escape special regex chars (like regex.escape in .NET)
        $escapedType = [regex]::Escape($type)
        # Create pattern similar to JS: `${escapedType}\s*\((\d+)\)`
        $pattern = "$escapedType\s*\((\d+)\)"
        
        # Match using .NET regex
        $match = [regex]::Match($str, $pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
        if ($match.Success) {
            $val = [int]$match.Groups[1].Value
        } else {
            $val = 0
        }
        $errorDetails += $val
    }

    # Print matching details
    for ($i = 0; $i -lt $ERROR_TYPES.Count; $i++) {
        if ($errorDetails[$i] -gt 0) {
            Write-Host "Matched: '$($ERROR_TYPES[$i])' = $($errorDetails[$i]) at index $i"
        }
    }
}
