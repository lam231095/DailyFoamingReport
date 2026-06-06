-- Add firm_plan column to foaming_transfer_reports referencing production_plan(firm_plan)
-- Run this script in the Supabase SQL Editor

ALTER TABLE foaming_transfer_reports 
ADD COLUMN IF NOT EXISTS firm_plan TEXT REFERENCES production_plan(firm_plan) ON DELETE CASCADE;

-- Create index for faster querying
CREATE INDEX IF NOT EXISTS idx_transfer_reports_firm_plan ON foaming_transfer_reports(firm_plan);
