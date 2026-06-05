-- =============================================
-- Migration: Thêm cột product_type_abbrev vào bảng foaming_separate_reports
-- Chạy script này trong Supabase SQL Editor
-- =============================================

ALTER TABLE foaming_separate_reports
  ADD COLUMN IF NOT EXISTS product_type_abbrev TEXT;

COMMENT ON COLUMN foaming_separate_reports.product_type_abbrev IS
  'Viết tắt loại hàng: A (Hàng thường) | T (test) | M (Đổ tay) | B (Hàng xấu)';
