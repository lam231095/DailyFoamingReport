-- Bảng tiêu chuẩn độ dày và số lượng sheet tối ưu
create table if not exists thickness_standards (
  id                      uuid primary key default gen_random_uuid(),
  thickness_mm            decimal(10,2) unique not null, -- Độ dày sheet (mm)
  total_bun_thickness_mm  decimal(10,2),                -- Tổng độ dày bun (mm)
  sheets_per_bun          integer,                      -- Số sheet/bun cơ bản
  optimal_sheets_per_bun  integer,                      -- Số sheet/bun tối ưu
  updated_at              timestamptz default now()
);

-- Bật RLS
alter table thickness_standards enable row level security;

-- Policy cho phép đọc/ghi dữ liệu
create policy "Allow all for thickness_standards" on thickness_standards for all using (true) with check (true);
