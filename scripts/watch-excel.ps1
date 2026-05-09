# ==============================================================
# watch-excel.ps1
# Theo dõi file Excel, tự động chạy sync khi file thay đổi
# Chạy: powershell -ExecutionPolicy Bypass -File ".\scripts\watch-excel.ps1"
# Để chạy ẩn: powershell -WindowStyle Hidden -ExecutionPolicy Bypass -File ".\scripts\watch-excel.ps1"
# ==============================================================

$SCRIPT_DIR   = $PSScriptRoot
$WATCH_DIR    = Split-Path -Parent $SCRIPT_DIR    # thư mục cha = project root
$WATCH_FILE   = (Get-ChildItem -Path $WATCH_DIR -Filter "*.xlsx" | Select-Object -First 1).Name
if (-not $WATCH_FILE) { $WATCH_FILE = "W16-Prodcution plan.xlsx" }
$SYNC_SCRIPT  = Join-Path $SCRIPT_DIR "sync-excel-to-supabase.ps1"
$LOG_FILE     = Join-Path $SCRIPT_DIR "sync-log.txt"
$DEBOUNCE_SEC = 8   # Chờ Excel lưu xong trước khi sync

function Write-Log($msg) {
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
    Write-Host $line
    Add-Content -Path $LOG_FILE -Value $line -Encoding UTF8
}

function Run-Sync() {
    Write-Log ">>> Phát hiện thay đổi trong Excel. Chờ ${DEBOUNCE_SEC}s..."
    Start-Sleep -Seconds $DEBOUNCE_SEC

    Write-Log ">>> Bắt đầu sync..."
    try {
        $result = & powershell -ExecutionPolicy Bypass -File $SYNC_SCRIPT 2>&1
        $result | ForEach-Object { Write-Log "    $_" }
        Write-Log ">>> Sync hoàn thành!"
    } catch {
        Write-Log "[ERROR] Sync thất bại: $($_.Exception.Message)"
    }
}

# Khởi tạo FileSystemWatcher
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path                  = $WATCH_DIR
$watcher.Filter                = $WATCH_FILE
$watcher.NotifyFilter          = [System.IO.NotifyFilters]::LastWrite
$watcher.EnableRaisingEvents   = $true
$watcher.IncludeSubdirectories = $false

Write-Log "========================================"
Write-Log "  EXCEL WATCHER STARTED"
Write-Log "  Watching: $WATCH_DIR\$WATCH_FILE"
Write-Log "========================================"

# Debounce: tránh sync nhiều lần khi Excel save nhiều event liên tiếp
$lastEventTime = [DateTime]::MinValue
$minInterval   = [TimeSpan]::FromSeconds(15)

$action = {
    $now = Get-Date
    # Lấy biến từ parent scope
    $parentLastEvent = $Event.MessageData.LastEventTime
    $parentMinInterval = $Event.MessageData.MinInterval

    if (($now - $parentLastEvent) -gt $parentMinInterval) {
        $Event.MessageData.LastEventTime = $now
        Run-Sync
    }
}

# Dùng cách đơn giản hơn với polling để tránh vấn đề scope
# Theo dõi tất cả các file .xlsx trong thư mục
$excelFiles = Get-ChildItem -Path $WATCH_DIR -Filter "*.xlsx"
$fileStates = @{}

foreach ($f in $excelFiles) {
    $fileStates[$f.FullName] = $f.LastWriteTime
}

Write-Log "Watcher active. Dang theo doi $($excelFiles.Count) file Excel."
Write-Log "Nhan Ctrl+C de dung."

while ($true) {
    Start-Sleep -Seconds 3
    
    $currentExcelFiles = Get-ChildItem -Path $WATCH_DIR -Filter "*.xlsx"
    
    foreach ($f in $currentExcelFiles) {
        $fullPath = $f.FullName
        $lastModified = $f.LastWriteTime
        
        # Nếu là file mới hoặc file đã bị thay đổi
        if (-not $fileStates.ContainsKey($fullPath) -or $lastModified -gt $fileStates[$fullPath]) {
            
            $fileStates[$fullPath] = $lastModified
            $fileName = $f.Name
            
            Write-Log "Phat hien thay doi tai file: $fileName"
            
            # Chọn script sync phù hợp
            $targetSyncScript = ""
            if ($fileName -like "*W16-Prodcution*") {
                $targetSyncScript = Join-Path $SCRIPT_DIR "sync-excel-to-supabase.ps1"
            } elseif ($fileName -like "*dộ dày - số tấm*") {
                $targetSyncScript = Join-Path $SCRIPT_DIR "sync-thickness-to-supabase.ps1"
            }
            
            if ($targetSyncScript -and (Test-Path $targetSyncScript)) {
                Write-Log "Dang kich hoat sync: $(Split-Path $targetSyncScript -Leaf)"
                powershell -ExecutionPolicy Bypass -File "$targetSyncScript" >> "$LOG_FILE" 2>&1
                Write-Log "Sync hoan tat cho $fileName"
            }
        }
    }
}
