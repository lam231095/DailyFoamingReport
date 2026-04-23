-- =============================================
-- Bảng Production Plan (từ Excel W16)
-- Chạy script này trong Supabase SQL Editor
-- =============================================

-- Tạo bảng production_plan
create table if not exists production_plan (
  id              uuid primary key default gen_random_uuid(),
  firm_plan       text unique not null,       -- Mã kế hoạch (RPRO/FPRO) - unique key để UPSERT
  bun_code        text,                       -- Mã bun (BDB-XXXXXX)
  pu_code         text,                       -- Mã sản phẩm PU (PVN-XXXXXX)
  ten_san_pham    text,                       -- Tên sản phẩm OrthoLite đầy đủ
  sl_sheet        integer,                    -- Số lượng Sheet (tờ)
  sl_bun_can_tach integer,                    -- SL bun cần Tách (cột C9)
  sl_bun_can_do   integer,                    -- SL bun cần Đổ / Qty need to pour (cột C14)
  week_label      text default 'W16-2026',    -- Tuần sản xuất
  synced_at       timestamptz default now()   -- Lần sync cuối từ Excel
);

-- Enable RLS
alter table production_plan enable row level security;

-- Policy: Anon có thể đọc
create policy "Allow anon read production_plan" on production_plan
  for select using (true);

-- Policy: Anon có thể insert
create policy "Allow anon insert production_plan" on production_plan
  for insert with check (true);

-- Policy: Anon có thể update (cần cho UPSERT)
create policy "Allow anon update production_plan" on production_plan
  for update using (true);

-- Policy: Anon có thể delete (để sync xóa dòng cũ nếu cần)
create policy "Allow anon delete production_plan" on production_plan
  for delete using (true);
