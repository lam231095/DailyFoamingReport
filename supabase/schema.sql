-- =============================================
-- OVN Production Management - Supabase Schema
-- Chạy toàn bộ script này trong Supabase SQL Editor
-- =============================================

-- 1. Bảng người dùng (đăng nhập bằng MSNV)
create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  msnv        text unique not null,
  full_name   text not null,
  department  text,
  role        text default 'worker',
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- 2. Bảng Loại Sản Phẩm (Thay thế SKU)
create table if not exists skus (
  id              uuid primary key default gen_random_uuid(),
  product_type    text not null,              -- Loại sản phẩm
  target_per_hour numeric not null default 0, -- Target tấm/giờ
  unit            text default 'tấm',         -- Đơn vị
  is_active       boolean default true,
  updated_at      timestamptz default now()   -- Ngày cập nhật
);

-- 3. Bảng báo cáo sản lượng hàng ngày
create table if not exists production_reports (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references users(id) on delete cascade,
  sku_id              uuid references skus(id) on delete restrict,
  working_hours       numeric not null check (working_hours > 0 and working_hours <= 24),
  actual_quantity     numeric not null check (actual_quantity >= 0),
  productivity_points numeric not null check (productivity_points >= 0 and productivity_points <= 15),
  report_date         date not null default current_date,
  note                text,
  created_at          timestamptz default now()
);

-- 4. Bảng nhật ký biến động 4M
create table if not exists change_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references users(id) on delete cascade,
  machine_id      text not null,
  category        text not null check (category in ('Man','Machine','Material','Method')),
  description     text not null,
  affects_quality boolean default false,
  severity        text default 'low' check (severity in ('low','medium','high')),
  logged_at       timestamptz default now()
);

-- =============================================
-- Enable Row Level Security (RLS)
-- =============================================
alter table users             enable row level security;
alter table skus              enable row level security;
alter table production_reports enable row level security;
alter table change_logs       enable row level security;

-- Policy: Anon có thể đọc users (để validate MSNV khi đăng nhập)
create policy "Allow anon read users" on users
  for select using (true);

-- Policy: Anon có thể đọc SKUs
create policy "Allow anon read skus" on skus
  for select using (true);

-- Policy: Anon có thể insert production_reports
create policy "Allow anon insert production_reports" on production_reports
  for insert with check (true);

-- Policy: Anon có thể đọc production_reports
create policy "Allow anon read production_reports" on production_reports
  for select using (true);

-- Policy: Anon có thể insert change_logs
create policy "Allow anon insert change_logs" on change_logs
  for insert with check (true);

-- Policy: Anon có thể đọc change_logs
create policy "Allow anon read change_logs" on change_logs
  for select using (true);

-- =============================================
-- Dữ liệu mẫu - MSNV nhân viên
-- =============================================
insert into users (msnv, full_name, department) values
  ('NV001', 'Nguyễn Văn An',   'Chuyền 1'),
  ('NV002', 'Trần Thị Bình',   'Chuyền 2'),
  ('NV003', 'Lê Văn Cường',    'Chuyền 3'),
  ('NV004', 'Phạm Thị Dung',   'QC'),
  ('NV005', 'Hoàng Văn Em',    'Chuyền 1'),
  ('QL001', 'Lâm Supervisor',  'Giám Sát')
on conflict (msnv) do nothing;

-- =============================================
-- Dữ liệu mẫu - Loại sản phẩm
-- =============================================
insert into skus (product_type, target_per_hour, unit) values
  ('Bọt Xốp Loại A', 100, 'tấm'),
  ('Bọt Xốp Loại B', 80,  'tấm'),
  ('Tấm Lót Ortholite', 200, 'tấm'),
  ('Vật Liệu Tổng Hợp', 150, 'tấm')
on conflict do nothing;
