-- Add residual material columns to foaming_pour_reports table
ALTER TABLE foaming_pour_reports ADD COLUMN IF NOT EXISTS bun_code TEXT;
ALTER TABLE foaming_pour_reports ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE foaming_pour_reports ADD COLUMN IF NOT EXISTS density TEXT;
ALTER TABLE foaming_pour_reports ADD COLUMN IF NOT EXISTS hardness TEXT;
ALTER TABLE foaming_pour_reports ADD COLUMN IF NOT EXISTS powder TEXT;
ALTER TABLE foaming_pour_reports ADD COLUMN IF NOT EXISTS length TEXT;
ALTER TABLE foaming_pour_reports ADD COLUMN IF NOT EXISTS material_name TEXT;
ALTER TABLE foaming_pour_reports ADD COLUMN IF NOT EXISTS is_pc_confirmed BOOLEAN DEFAULT TRUE;
ALTER TABLE foaming_pour_reports ADD COLUMN IF NOT EXISTS pc_confirmed_at TIMESTAMPTZ;
ALTER TABLE foaming_pour_reports ADD COLUMN IF NOT EXISTS pc_confirmed_by UUID REFERENCES users(id);
