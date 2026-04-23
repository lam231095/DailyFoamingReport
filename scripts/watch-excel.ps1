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
Write-Log "Watcher active. Nhấn Ctrl+C để dừng."
Write-Log ""

$excelPath     = Join-Path $WATCH_DIR $WATCH_FILE
$lastModified  = (Get-Item $excelPath -ErrorAction SilentlyContinue).LastWriteTime
$lastSyncTime = [DateTime]::MinValue

while ($true) {
    Start-Sleep -Seconds 3

    $currentItem = Get-Item $excelPath -ErrorAction SilentlyContinue
    if ($null -eq $currentItem) { continue }

    $currentModified = $currentItem.LastWriteTime

    # Nếu file thay đổi và chưa sync gần đây (>15s)
    if ($currentModified -gt $lastModified -and ((Get-Date) - $lastSyncTime).TotalSeconds -gt 15) {
        $lastModified = $currentModified
        $lastSyncTime = Get-Date
        Run-Sync
    }
}
