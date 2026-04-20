-- =============================================
-- OVN Residual Material Management
-- =============================================

-- 1. Table for Residual Materials (Stock)
create table if not exists residual_materials (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references users(id) on delete set null,
  stage             text not null check (stage in ('Foaming Đổ', 'Foaming Tách')),
  material_name     text not null,
  initial_quantity  numeric not null check (initial_quantity >= 0),
  current_quantity  numeric not null check (current_quantity >= 0),
  unit              text not null check (unit in ('tấm', 'bun')),
  entry_date        date not null default current_date,
  created_at        timestamptz default now()
);

-- 2. Table for Material Usage
create table if not exists residual_material_usage (
  id              uuid primary key default gen_random_uuid(),
  material_id     uuid references residual_materials(id) on delete cascade,
  user_id         uuid references users(id) on delete set null,
  used_quantity   numeric not null check (used_quantity > 0),
  used_at         timestamptz default now()
);

-- =============================================
-- Enable RLS
-- =============================================
alter table residual_materials enable row level security;
alter table residual_material_usage enable row level security;

create policy "Allow anon access residual_materials" on residual_materials
  for all using (true) with check (true);

create policy "Allow anon access residual_material_usage" on residual_material_usage
  for all using (true) with check (true);

-- =============================================
-- Trigger to update current_quantity
-- =============================================
create or replace function update_residual_material_quantity()
returns trigger as $$
begin
  update residual_materials
  set current_quantity = initial_quantity - (
    select coalesce(sum(used_quantity), 0)
    from residual_material_usage
    where material_id = residual_materials.id
  )
  where id = (case 
                when TG_OP = 'DELETE' then OLD.material_id 
                else NEW.material_id 
              end);
  return null;
end;
$$ language plpgsql;

create trigger trg_update_residual_quantity
after insert or update or delete on residual_material_usage
for each row execute function update_residual_material_quantity();
