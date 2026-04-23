# ==============================================================
# install-task-scheduler.ps1
# Cài đặt Windows Task Scheduler để watch-excel.ps1 tự chạy khi đăng nhập
# Chạy với quyền Admin: powershell -ExecutionPolicy Bypass -File ".\scripts\install-task-scheduler.ps1"
# ==============================================================

$WATCH_DIR   = Split-Path -Parent $PSScriptRoot    # project root
$SCRIPT_PATH = Join-Path $PSScriptRoot "watch-excel.ps1"
$TASK_NAME   = "OVN_ExcelSync_Watcher"

Write-Host ""
Write-Host "=== Cài đặt Windows Task Scheduler ===" -ForegroundColor Cyan
Write-Host "Task Name : $TASK_NAME"
Write-Host "Script    : $SCRIPT_PATH"
Write-Host ""

# Kiểm tra file tồn tại
if (-not (Test-Path $SCRIPT_PATH)) {
    Write-Host "[ERROR] Không tìm thấy: $SCRIPT_PATH" -ForegroundColor Red
    exit 1
}

# Xóa task cũ nếu tồn tại
$existingTask = Get-ScheduledTask -TaskName $TASK_NAME -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "Xóa task cũ..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TASK_NAME -Confirm:$false
}

# Tạo action: chạy PowerShell ẩn
$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$SCRIPT_PATH`""

# Trigger: chạy khi user đăng nhập
$trigger = New-ScheduledTaskTrigger -AtLogOn

# Settings: không giới hạn thời gian chạy
$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Hours 0) `
    -MultipleInstances IgnoreNew

# Đăng ký task
try {
    Register-ScheduledTask `
        -TaskName $TASK_NAME `
        -Action   $action `
        -Trigger  $trigger `
        -Settings $settings `
        -RunLevel Highest `
        -Force | Out-Null

    Write-Host "[OK] Task '$TASK_NAME' đã được cài đặt!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Để chạy ngay (không cần khởi động lại):" -ForegroundColor Yellow
    Write-Host "  Start-ScheduledTask -TaskName '$TASK_NAME'"
    Write-Host ""
    Write-Host "Để xem log sync:" -ForegroundColor Yellow
    Write-Host "  notepad '$WATCH_DIR\scripts\sync-log.txt'"
    Write-Host ""
    Write-Host "Để gỡ cài đặt:" -ForegroundColor Yellow
    Write-Host "  Unregister-ScheduledTask -TaskName '$TASK_NAME' -Confirm:`$false"

} catch {
    Write-Host "[ERROR] Không thể đăng ký task: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Hãy thử chạy lại với quyền Administrator" -ForegroundColor Yellow
    exit 1
}
