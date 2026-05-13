-- =============================================
-- Migration: Thêm cột report_date vào các bảng công đoạn Foaming
-- Để hỗ trợ logic báo cáo 6h sáng
-- Chạy script này trong Supabase SQL Editor
-- =============================================

-- 1. Thêm cho bảng Đổ (Pouring)
ALTER TABLE foaming_pour_reports 
  ADD COLUMN IF NOT EXISTS report_date DATE;

COMMENT ON COLUMN foaming_pour_reports.report_date IS 'Ngày báo cáo (theo logic 6h sáng)';

-- 2. Thêm cho bảng Tách (Separating)
ALTER TABLE foaming_separate_reports 
  ADD COLUMN IF NOT EXISTS report_date DATE;

COMMENT ON COLUMN foaming_separate_reports.report_date IS 'Ngày báo cáo (theo logic 6h sáng)';

-- 3. Thêm cho bảng Nhập kho (Warehouse)
ALTER TABLE foaming_warehouse_reports 
  ADD COLUMN IF NOT EXISTS report_date DATE;

COMMENT ON COLUMN foaming_warehouse_reports.report_date IS 'Ngày báo cáo (theo logic 6h sáng)';

-- Cập nhật dữ liệu cũ (nếu có) dựa trên created_at
UPDATE foaming_pour_reports SET report_date = (created_at AT TIME ZONE 'ICT' - INTERVAL '6 hours')::DATE WHERE report_date IS NULL;
UPDATE foaming_separate_reports SET report_date = (created_at AT TIME ZONE 'ICT' - INTERVAL '6 hours')::DATE WHERE report_date IS NULL;
UPDATE foaming_warehouse_reports SET report_date = (created_at AT TIME ZONE 'ICT' - INTERVAL '6 hours')::DATE WHERE report_date IS NULL;
