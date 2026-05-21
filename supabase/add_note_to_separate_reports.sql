-- Thêm cột note vào báo cáo công đoạn Tách (Separating)
-- Chạy trong Supabase SQL Editor

ALTER TABLE foaming_separate_reports 
ADD COLUMN IF NOT EXISTS note text;

-- Cập nhật chú thích
COMMENT ON COLUMN foaming_separate_reports.note IS 'Ghi chú thêm';
