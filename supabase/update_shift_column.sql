-- Cập nhật cơ sở dữ liệu để thêm trường Ca làm việc
-- Chạy script này trong Supabase SQL Editor

-- 1. Thêm cột shift vào bảng báo cáo sản lượng
ALTER TABLE production_reports 
ADD COLUMN IF NOT EXISTS shift text;

-- 2. Thêm cột shift vào bảng nhật ký biến động 4M
ALTER TABLE change_logs 
ADD COLUMN IF NOT EXISTS shift text;

-- 3. Cập nhật chú thích (tùy chọn)
COMMENT ON COLUMN production_reports.shift IS 'Ca làm việc (Ca 1, Ca 2, Ca 3)';
COMMENT ON COLUMN change_logs.shift IS 'Ca làm việc của sự cố (Ca 1, Ca 2, Ca 3)';
