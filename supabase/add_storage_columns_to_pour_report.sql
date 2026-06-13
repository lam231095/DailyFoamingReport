-- ALTER TABLE to add missing storage and color tag columns to foaming_pour_reports
-- Run this script in the Supabase SQL Editor

ALTER TABLE foaming_pour_reports 
ADD COLUMN IF NOT EXISTS storage_location text,
ADD COLUMN IF NOT EXISTS storage_line text,
ADD COLUMN IF NOT EXISTS color_tag text,
ADD COLUMN IF NOT EXISTS storage_carts integer default 0;

-- Comments for the new columns
COMMENT ON COLUMN foaming_pour_reports.storage_location IS 'Nơi lưu trữ';
COMMENT ON COLUMN foaming_pour_reports.storage_line IS 'Line lưu trữ';
COMMENT ON COLUMN foaming_pour_reports.color_tag IS 'Thẻ màu';
COMMENT ON COLUMN foaming_pour_reports.storage_carts IS 'Số xe lưu trữ';
