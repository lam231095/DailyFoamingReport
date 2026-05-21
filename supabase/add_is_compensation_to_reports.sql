-- Add is_compensation column to foaming_pour_reports and foaming_separate_reports
ALTER TABLE foaming_pour_reports ADD COLUMN IF NOT EXISTS is_compensation boolean DEFAULT false;
ALTER TABLE foaming_separate_reports ADD COLUMN IF NOT EXISTS is_compensation boolean DEFAULT false;
