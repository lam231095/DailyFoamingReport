-- Bảng người dùng
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  msnv TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  department TEXT NOT NULL,
  role TEXT DEFAULT 'worker', -- 'worker', 'supervisor', 'qc'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng kế hoạch sản xuất (Import từ Excel)
CREATE TABLE IF NOT EXISTS production_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_info TEXT NOT NULL, -- Ví dụ: W19-2026
  firm_plan TEXT NOT NULL,
  bun_code TEXT,
  pu_code TEXT,
  product_name TEXT,
  target_sheets INTEGER DEFAULT 0,
  target_buns_tach INTEGER DEFAULT 0,
  target_buns_do INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng báo cáo sản lượng hàng ngày
CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES production_plan(id),
  worker_id UUID REFERENCES users(id),
  actual_sheets INTEGER DEFAULT 0,
  actual_buns INTEGER DEFAULT 0,
  shift TEXT, -- Ca làm việc
  report_date DATE DEFAULT CURRENT_DATE,
  kpi_score FLOAT,
  error_hardness_above INTEGER DEFAULT 0,
  error_hardness_below INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng biến động 4M (Man, Machine, Material, Method)
CREATE TABLE IF NOT EXISTS changelog_4m (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- 'Man', 'Machine', 'Material', 'Method'
  description TEXT NOT NULL,
  reported_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dữ liệu mẫu người dùng
INSERT INTO users (msnv, full_name, department, role) VALUES
('NV001', 'Nguyễn Văn An', 'Chuyền 1', 'worker'),
('NV002', 'Trần Thị Bình', 'Chuyền 2', 'worker'),
('NV003', 'Lê Văn Cường', 'Chuyền 3', 'worker'),
('NV004', 'Phạm Thị Dung', 'QC', 'qc'),
('QL001', 'Lâm Supervisor', 'Giám Sát', 'supervisor')
ON CONFLICT (msnv) DO NOTHING;
