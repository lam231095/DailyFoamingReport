-- Create table bun_properties
create table if not exists bun_properties (
  id                      uuid primary key default gen_random_uuid(),
  ma_bun                  text,                       -- Suffix number (e.g. 190)
  bun_code                text unique not null,       -- Full Bun code (e.g. BDB-000190)
  sheet_code              text,                       -- Sheet code (e.g. PVN-xxxxx)
  material_name           text,                       -- Material name
  dong_hang               text,                       -- Product line
  mau                     text,                       -- Color
  density                 text,                       -- Density
  do_cung                 text,                       -- Hardness
  bot                     text,                       -- Powder type
  chieu_dai               text,                       -- Length
  do_day                  text,                       -- Thickness
  dong_sp                 text,                       -- Spec line
  updated_at              timestamptz default now()
);

-- Enable RLS
alter table bun_properties enable row level security;

-- Policy to allow all operations
create policy "Allow all for bun_properties" on bun_properties for all using (true) with check (true);
