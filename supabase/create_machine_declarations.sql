-- =============================================
-- Hệ thống khai báo máy móc đổ và tách
-- Chạy script này trong Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS foaming_machine_declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  declaration_date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift TEXT NOT NULL, -- 'Ca 1', 'Ca 2', 'Ca 3', 'Ca HC'
  manager_name TEXT NOT NULL, -- 'Linh', 'Thảo', 'Tuấn Anh'
  pour_active_qty INTEGER DEFAULT 0 CHECK (pour_active_qty >= 0),
  separate_auto_qty INTEGER DEFAULT 0 CHECK (separate_auto_qty >= 0),
  separate_semi_auto_qty INTEGER DEFAULT 0 CHECK (separate_semi_auto_qty >= 0),
  separate_mechanical_qty INTEGER DEFAULT 0 CHECK (separate_mechanical_qty >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (declaration_date, shift, manager_name)
);

-- Bật RLS
ALTER TABLE foaming_machine_declarations ENABLE ROW LEVEL SECURITY;

-- Policies (Cho phép Anon thực hiện CRUD - theo mô hình hiện tại của dự án)
DROP POLICY IF EXISTS "Allow anon access machine_declarations" ON foaming_machine_declarations;
CREATE POLICY "Allow anon access machine_declarations" 
ON foaming_machine_declarations FOR ALL USING (true) WITH CHECK (true);
