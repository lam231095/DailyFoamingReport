-- =============================================
-- Drop foreign key constraint on foaming_pour_reports
-- to allow saving combined orders (e.g. FPRO-123 | FPRO-456)
-- Run this script in the Supabase SQL Editor
-- =============================================

ALTER TABLE foaming_pour_reports 
  DROP CONSTRAINT IF EXISTS foaming_pour_reports_firm_plan_fkey;
