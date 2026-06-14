-- Create residual_materials table
create table if not exists residual_materials (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid references users(id) on delete set null,
  bun_code                text not null,              -- Mã Bun (e.g. BDB-xxxxxx)
  material_name           text,                       -- Tên vật liệu (MATERIAL NAME)
  color                   text,                       -- Màu sắc
  density                 text,                       -- Density
  hardness                text,                       -- Độ cứng
  powder                  text,                       -- Loại bột (CSD, Nike, etc)
  length                  text,                       -- Chiều dài
  initial_quantity        decimal(10,2) default 0,    -- Số lượng bun ban đầu
  current_quantity        decimal(10,2) default 0,    -- Số lượng bun còn lại
  unit                    text default 'bun',         -- Đơn vị: luôn là 'bun'
  machine_id              text,                       -- Máy làm việc
  shift                   text,                       -- Ca làm việc
  manager_name            text,                       -- Quản lý
  entry_date              date default current_date,
  created_at              timestamptz default now()
);

-- Create residual_material_usage table
create table if not exists residual_material_usage (
  id                      uuid primary key default gen_random_uuid(),
  material_id             uuid references residual_materials(id) on delete cascade,
  user_id                 uuid references users(id) on delete set null,
  used_quantity           decimal(10,2) default 0,
  used_at                 timestamptz default now()
);

-- Enable RLS
alter table residual_materials enable row level security;
alter table residual_material_usage enable row level security;

-- Policies
create policy "Allow all for residual_materials" on residual_materials for all using (true) with check (true);
create policy "Allow all for residual_material_usage" on residual_material_usage for all using (true) with check (true);
