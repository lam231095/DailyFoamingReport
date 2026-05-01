-- =============================================
-- Migration: Thêm cột product_type vào bảng foaming_separate_reports
-- Chạy script này trong Supabase SQL Editor
-- =============================================

ALTER TABLE foaming_separate_reports
  ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'thanh_pham'
    CHECK (product_type IN ('thanh_pham', 'ban_thanh_pham'));

COMMENT ON COLUMN foaming_separate_reports.product_type IS
  'Loại sản phẩm: thanh_pham (Thành phẩm) | ban_thanh_pham (Bán thành phẩm)';
