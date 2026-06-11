-- =============================================
-- Bảng báo cáo bổ sung (Supplementary Reports)
-- Chỉ dành cho admin (MSNV: 04127)
-- =============================================

create table if not exists foaming_supplementary_reports (
  id                  uuid primary key default gen_random_uuid(),
  firm_plan           text references production_plan(firm_plan) on delete cascade,
  shift               text not null,                 -- Ca làm việc (Ca 1, Ca 2, Ca 3, Ca HC)
  machine_id          text,                          -- Máy làm việc
  actual_bun_poured   integer not null check (actual_bun_poured >= 0), -- Số bun thực tế đổ
  working_date        date not null default current_date,              -- Ngày làm việc
  cleaning_agent_kg   numeric default 0,             -- Chất rửa đầu súng (kg)
  waste_kg            numeric default 0,             -- Rác (kg)
  is_compensation     boolean default false,         -- Đơn bù
  note                text,                          -- Ghi chú
  recorder_id         uuid references users(id),     -- Người nhập
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- Bật RLS
alter table foaming_supplementary_reports enable row level security;

-- Policy: Cho phép Anon thực hiện CRUD (theo mô hình hiện tại của dự án)
create policy "Allow anon access supplementary_reports" on foaming_supplementary_reports for all using (true) with check (true);

-- Trigger cập nhật updated_at
create or replace function update_supplementary_reports_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trigger_update_supplementary_reports_updated_at
  before update on foaming_supplementary_reports
  for each row execute procedure update_supplementary_reports_updated_at();
