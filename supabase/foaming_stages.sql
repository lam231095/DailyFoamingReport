-- =============================================
-- Hệ thống báo cáo Foaming 3 công đoạn
-- Chạy script này trong Supabase SQL Editor
-- =============================================

-- 1. Công đoạn Đổ (Pouring)
create table if not exists foaming_pour_reports (
  id                  uuid primary key default gen_random_uuid(),
  firm_plan           text references production_plan(firm_plan) on delete cascade,
  shift               text not null,                -- Ca làm việc (Ca 1, Ca 2,...)
  machine_id          text,                         -- Máy làm việc (Máy 1, Máy 2, Máy 3)
  operator_name       text,                         -- Tên người đứng máy (Operator)
  actual_bun_poured   integer not null check (actual_bun_poured >= 0), -- Số bun thực tế đổ
  lot_no              text,                         -- Lot No
  recorder_id         uuid references users(id),    -- Người nhập
  created_at          timestamptz default now()
);

-- 2. Công đoạn Tách (Separating)
create table if not exists foaming_separate_reports (
  id                  uuid primary key default gen_random_uuid(),
  firm_plan           text references production_plan(firm_plan) on delete cascade,
  shift               text not null,                -- Ca làm việc
  actual_bun_separated integer not null check (actual_bun_separated >= 0), -- Số bun thực tế tách
  actual_sheet_received integer not null check (actual_sheet_received >= 0), -- Số sheet thực tế nhận
  lot_no              text,                         -- Lot No
  ng_qty              integer default 0 check (ng_qty >= 0), -- Số lượng NG
  error_type          text,                         -- Loại lỗi
  recorder_id         uuid references users(id),    -- Người nhập
  created_at          timestamptz default now()
);

-- 3. Công đoạn Nhập kho/Giao hàng (Warehouse)
create table if not exists foaming_warehouse_reports (
  id                  uuid primary key default gen_random_uuid(),
  firm_plan           text references production_plan(firm_plan) on delete cascade,
  qty_delivered_sheet integer not null check (qty_delivered_sheet >= 0), -- Số lượng giao (sheet)
  delivery_date       date not null default current_date,                -- Ngày giao
  deliverer_id        uuid references users(id),                         -- Người giao
  created_at          timestamptz default now()
);

-- Bật RLS
alter table foaming_pour_reports enable row level security;
alter table foaming_separate_reports enable row level security;
alter table foaming_warehouse_reports enable row level security;

-- Policies (Cho phép Anon thực hiện CRUD - theo mô hình hiện tại của dự án)
create policy "Allow anon access pour_reports"      on foaming_pour_reports      for all using (true) with check (true);
create policy "Allow anon access separate_reports"  on foaming_separate_reports  for all using (true) with check (true);
create policy "Allow anon access warehouse_reports" on foaming_warehouse_reports for all using (true) with check (true);
