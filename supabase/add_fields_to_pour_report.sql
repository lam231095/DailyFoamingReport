-- Thêm các trường mới vào báo cáo công đoạn Đổ
-- Chạy trong Supabase SQL Editor

ALTER TABLE foaming_pour_reports 
ADD COLUMN IF NOT EXISTS cleaning_agent_kg numeric default 0,
ADD COLUMN IF NOT EXISTS waste_kg numeric default 0,
ADD COLUMN IF NOT EXISTS note text;

-- Cập nhật chú thích
COMMENT ON COLUMN foaming_pour_reports.cleaning_agent_kg IS 'Chất rửa đầu súng (kg)';
COMMENT ON COLUMN foaming_pour_reports.waste_kg IS 'Rác (kg)';
COMMENT ON COLUMN foaming_pour_reports.note IS 'Ghi chú thêm';
