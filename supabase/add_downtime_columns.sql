-- Thêm các trường khai báo dừng máy vào bảng foaming_pour_reports và foaming_separate_reports
-- Chạy script này trong Supabase SQL Editor

ALTER TABLE foaming_pour_reports 
ADD COLUMN IF NOT EXISTS downtime_reason text,
ADD COLUMN IF NOT EXISTS downtime_start text,
ADD COLUMN IF NOT EXISTS downtime_end text,
ADD COLUMN IF NOT EXISTS downtime_duration integer;

COMMENT ON COLUMN foaming_pour_reports.downtime_reason IS 'Nguyên nhân dừng máy';
COMMENT ON COLUMN foaming_pour_reports.downtime_start IS 'Dừng từ lúc (HH:MM)';
COMMENT ON COLUMN foaming_pour_reports.downtime_end IS 'Dừng đến lúc (HH:MM)';
COMMENT ON COLUMN foaming_pour_reports.downtime_duration IS 'Tổng thời gian dừng máy (phút)';

ALTER TABLE foaming_separate_reports 
ADD COLUMN IF NOT EXISTS downtime_reason text,
ADD COLUMN IF NOT EXISTS downtime_start text,
ADD COLUMN IF NOT EXISTS downtime_end text,
ADD COLUMN IF NOT EXISTS downtime_duration integer;

COMMENT ON COLUMN foaming_separate_reports.downtime_reason IS 'Nguyên nhân dừng máy';
COMMENT ON COLUMN foaming_separate_reports.downtime_start IS 'Dừng từ lúc (HH:MM)';
COMMENT ON COLUMN foaming_separate_reports.downtime_end IS 'Dừng đến lúc (HH:MM)';
COMMENT ON COLUMN foaming_separate_reports.downtime_duration IS 'Tổng thời gian dừng máy (phút)';
