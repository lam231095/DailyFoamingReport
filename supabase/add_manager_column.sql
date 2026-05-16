-- Add manager column to foaming reports
ALTER TABLE foaming_pour_reports ADD COLUMN IF NOT EXISTS manager_name TEXT;
ALTER TABLE foaming_separate_reports ADD COLUMN IF NOT EXISTS manager_name TEXT;
