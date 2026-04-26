create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  role text not null default 'all_access',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists executors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_app_user boolean not null default false,
  linked_user_id uuid references users(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  project_number text not null unique,
  name text not null,
  address text not null,
  opdrachtgever text,
  demolition_type text,
  building_type text,
  area_m2 integer,
  customer_contact text,
  start_date date,
  end_date date,
  work_days integer,
  notes text,
  status text not null default 'Concept',
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_executors (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  executor_id uuid not null references executors(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  task_type text not null,
  title text not null,
  location text,
  priority text not null default 'Middel',
  status text not null default 'Open',
  is_checked boolean not null default false,
  checked_by_user_id uuid references users(id) on delete set null,
  checked_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_containers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  waste_type text not null,
  container_size text not null,
  planned_quantity integer not null default 0,
  actual_quantity integer not null default 0,
  planned_delivery_date date,
  actual_delivery_date date,
  planned_pickup_date date,
  actual_pickup_date date,
  change_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  file_url text,
  category text not null,
  label text,
  title text not null,
  notes text,
  uploaded_by_user_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  old_value_json jsonb,
  new_value_json jsonb,
  created_at timestamptz not null default now()
);

alter table users enable row level security;
alter table executors enable row level security;
alter table projects enable row level security;
alter table project_executors enable row level security;
alter table project_tasks enable row level security;
alter table project_containers enable row level security;
alter table project_photos enable row level security;
alter table activity_log enable row level security;

create policy "authenticated read users" on users for select to authenticated using (true);
create policy "authenticated manage users" on users for all to authenticated using (true) with check (true);
create policy "authenticated read executors" on executors for select to authenticated using (true);
create policy "authenticated manage executors" on executors for all to authenticated using (true) with check (true);
create policy "authenticated read projects" on projects for select to authenticated using (true);
create policy "authenticated manage projects" on projects for all to authenticated using (true) with check (true);
create policy "authenticated read project_executors" on project_executors for select to authenticated using (true);
create policy "authenticated manage project_executors" on project_executors for all to authenticated using (true) with check (true);
create policy "authenticated read project_tasks" on project_tasks for select to authenticated using (true);
create policy "authenticated manage project_tasks" on project_tasks for all to authenticated using (true) with check (true);
create policy "authenticated read project_containers" on project_containers for select to authenticated using (true);
create policy "authenticated manage project_containers" on project_containers for all to authenticated using (true) with check (true);
create policy "authenticated read project_photos" on project_photos for select to authenticated using (true);
create policy "authenticated manage project_photos" on project_photos for all to authenticated using (true) with check (true);
create policy "authenticated read activity_log" on activity_log for select to authenticated using (true);
create policy "authenticated manage activity_log" on activity_log for all to authenticated using (true) with check (true);
