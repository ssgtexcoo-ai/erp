-- Начальная схема базы данных для SAMRUQ ERP

create table roles (
  id serial primary key,
  name text not null unique,
  description text
);

create table users (
  id serial primary key,
  auth_id uuid not null unique,
  email text not null unique,
  full_name text not null,
  role_id int references roles(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table lead_sources (
  id serial primary key,
  name text not null unique,
  description text
);

create table clients (
  id serial primary key,
  name text not null,
  phone text,
  email text,
  address text,
  created_at timestamptz not null default now()
);

create table contacts (
  id serial primary key,
  client_id int references clients(id),
  full_name text not null,
  role text,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

create table leads (
  id serial primary key,
  lead_code text not null unique,
  source_id int references lead_sources(id),
  client_id int references clients(id),
  created_at timestamptz not null default now(),
  assigned_to int references users(id),
  status text not null,
  customer_name text,
  phone text,
  email text,
  comment text,
  sla_status text default 'green'
);

create table deal_stages (
  id serial primary key,
  name text not null unique,
  progress_percent int not null default 0,
  order_index int not null
);

create table deals (
  id serial primary key,
  lead_id int references leads(id),
  client_id int references clients(id),
  customer_name text,
  amount numeric(14,2) not null default 0,
  stage_id int references deal_stages(id),
  progress_percent int not null default 0,
  assigned_to int references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table projects (
  id serial primary key,
  deal_id int references deals(id),
  name text not null,
  client_name text,
  budget numeric(14,2) not null default 0,
  responsible_id int references users(id),
  start_date date,
  end_date date,
  status text not null,
  profit_estimate numeric(14,2)
);

create table project_stages (
  id serial primary key,
  project_id int references projects(id),
  name text not null,
  status text not null,
  start_date date,
  end_date date,
  progress_percent int not null default 0
);

create table tasks (
  id serial primary key,
  project_id int references projects(id),
  title text not null,
  description text,
  assigned_to int references users(id),
  due_date date,
  status text not null,
  priority text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table task_comments (
  id serial primary key,
  task_id int references tasks(id),
  user_id int references users(id),
  comment text not null,
  created_at timestamptz not null default now()
);

create table document_categories (
  id serial primary key,
  name text not null unique
);

create table documents (
  id serial primary key,
  project_id int references projects(id),
  deal_id int references deals(id),
  category_id int references document_categories(id),
  name text not null,
  file_url text,
  uploaded_by int references users(id),
  uploaded_at timestamptz not null default now()
);

create table notifications (
  id serial primary key,
  user_id int references users(id),
  event_type text not null,
  payload jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table employee_scores (
  id serial primary key,
  user_id int references users(id),
  event text not null,
  score int not null,
  created_at timestamptz not null default now()
);

create table employee_ratings (
  id serial primary key,
  user_id int references users(id),
  period text not null,
  total_score int not null,
  rank int not null,
  created_at timestamptz not null default now()
);

create table activity_logs (
  id serial primary key,
  user_id int references users(id),
  action text not null,
  entity text,
  entity_id int,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- Supabase Storage bucket for documents
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload to documents bucket
create policy "documents_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents');

-- Allow public read of documents bucket
create policy "documents_public_read" on storage.objects
  for select using (bucket_id = 'documents');

-- Allow owner to delete their uploads
create policy "documents_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents' and auth.uid() = owner::uuid);

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────

-- Helper: role_id of the current authenticated user
create or replace function current_user_role_id()
returns int language sql security definer stable as $$
  select role_id from users where auth_id = auth.uid();
$$;

-- Helper: users.id of the current authenticated user
create or replace function current_user_table_id()
returns int language sql security definer stable as $$
  select id from users where auth_id = auth.uid();
$$;

-- Enable RLS on every table
alter table roles              enable row level security;
alter table users              enable row level security;
alter table lead_sources       enable row level security;
alter table clients            enable row level security;
alter table contacts           enable row level security;
alter table leads              enable row level security;
alter table deal_stages        enable row level security;
alter table deals              enable row level security;
alter table projects           enable row level security;
alter table project_stages     enable row level security;
alter table tasks              enable row level security;
alter table task_comments      enable row level security;
alter table document_categories enable row level security;
alter table documents          enable row level security;
alter table notifications      enable row level security;
alter table employee_scores    enable row level security;
alter table employee_ratings   enable row level security;
alter table activity_logs      enable row level security;

-- ROLES — read-only for all authenticated
create policy "roles_read" on roles
  for select to authenticated using (true);

-- LEAD_SOURCES — read-only for all authenticated
create policy "lead_sources_read" on lead_sources
  for select to authenticated using (true);

-- DEAL_STAGES — read-only for all authenticated
create policy "deal_stages_read" on deal_stages
  for select to authenticated using (true);

-- DOCUMENT_CATEGORIES — read-only for all authenticated
create policy "document_categories_read" on document_categories
  for select to authenticated using (true);

-- USERS — all can read (needed for dropdowns); only director can write
create policy "users_select"  on users for select to authenticated using (true);
create policy "users_insert"  on users for insert to authenticated with check (current_user_role_id() = 1);
create policy "users_update"  on users for update to authenticated using (current_user_role_id() = 1);
create policy "users_delete"  on users for delete to authenticated using (current_user_role_id() = 1);

-- LEADS
--   director (1): full access
--   manager  (2): own leads (assigned_to = self)
create policy "leads_director" on leads for all to authenticated
  using    (current_user_role_id() = 1)
  with check (current_user_role_id() = 1);

create policy "leads_manager_select" on leads for select to authenticated
  using (current_user_role_id() = 2
     and assigned_to = current_user_table_id());

create policy "leads_manager_insert" on leads for insert to authenticated
  with check (current_user_role_id() = 2);

create policy "leads_manager_update" on leads for update to authenticated
  using (current_user_role_id() = 2
     and assigned_to = current_user_table_id());

-- DEALS
--   director (1) + accountant (4): full access
--   manager  (2): read/update own deals
create policy "deals_director_accountant" on deals for all to authenticated
  using    (current_user_role_id() in (1, 4))
  with check (current_user_role_id() in (1, 4));

create policy "deals_manager_select" on deals for select to authenticated
  using (current_user_role_id() = 2
     and assigned_to = current_user_table_id());

create policy "deals_manager_update" on deals for update to authenticated
  using (current_user_role_id() = 2
     and assigned_to = current_user_table_id());

-- PROJECTS
--   director (1) + project_manager (3): full access
--   others: read-only
create policy "projects_director_pm" on projects for all to authenticated
  using    (current_user_role_id() in (1, 3))
  with check (current_user_role_id() in (1, 3));

create policy "projects_others_select" on projects for select to authenticated
  using (current_user_role_id() not in (1, 3));

-- PROJECT_STAGES
create policy "project_stages_director_pm" on project_stages for all to authenticated
  using    (current_user_role_id() in (1, 3))
  with check (current_user_role_id() in (1, 3));

create policy "project_stages_others_select" on project_stages for select to authenticated
  using (current_user_role_id() not in (1, 3));

-- TASKS
--   director (1) + project_manager (3): full access
--   assignee: read + update own tasks
create policy "tasks_director_pm" on tasks for all to authenticated
  using    (current_user_role_id() in (1, 3))
  with check (current_user_role_id() in (1, 3));

create policy "tasks_assignee_select" on tasks for select to authenticated
  using (assigned_to = current_user_table_id());

create policy "tasks_assignee_update" on tasks for update to authenticated
  using (assigned_to = current_user_table_id());

-- TASK_COMMENTS — visible to task assignee and directors/PMs
create policy "task_comments_director_pm" on task_comments for all to authenticated
  using    (current_user_role_id() in (1, 3))
  with check (current_user_role_id() in (1, 3));

create policy "task_comments_own_write" on task_comments for insert to authenticated
  with check (user_id = current_user_table_id());

create policy "task_comments_read_all" on task_comments for select to authenticated
  using (true);

create policy "task_comments_delete_own" on task_comments for delete to authenticated
  using (user_id = current_user_table_id());

-- DOCUMENTS
--   director (1) + accountant (4): full access
--   project_manager (3): read-only
create policy "documents_director_accountant" on documents for all to authenticated
  using    (current_user_role_id() in (1, 4))
  with check (current_user_role_id() in (1, 4));

create policy "documents_pm_select" on documents for select to authenticated
  using (current_user_role_id() = 3);

-- NOTIFICATIONS — each user sees only their own; director sees all
create policy "notifications_own" on notifications for all to authenticated
  using    (user_id = current_user_table_id())
  with check (user_id = current_user_table_id());

create policy "notifications_director_select" on notifications for select to authenticated
  using (current_user_role_id() = 1);

-- EMPLOYEE_SCORES — director full; own read
create policy "scores_director" on employee_scores for all to authenticated
  using    (current_user_role_id() = 1)
  with check (current_user_role_id() = 1);

create policy "scores_own_select" on employee_scores for select to authenticated
  using (user_id = current_user_table_id());

-- EMPLOYEE_RATINGS — director full; own read
create policy "ratings_director" on employee_ratings for all to authenticated
  using    (current_user_role_id() = 1)
  with check (current_user_role_id() = 1);

create policy "ratings_own_select" on employee_ratings for select to authenticated
  using (user_id = current_user_table_id());

-- CLIENTS — all authenticated read; director + manager write
create policy "clients_select" on clients for select to authenticated using (true);
create policy "clients_write"  on clients for all to authenticated
  using    (current_user_role_id() in (1, 2))
  with check (current_user_role_id() in (1, 2));

-- CONTACTS — same as clients
create policy "contacts_select" on contacts for select to authenticated using (true);
create policy "contacts_write"  on contacts for all to authenticated
  using    (current_user_role_id() in (1, 2))
  with check (current_user_role_id() in (1, 2));

-- ACTIVITY_LOGS — director sees all; own for others
create policy "activity_director" on activity_logs for all to authenticated
  using    (current_user_role_id() = 1)
  with check (current_user_role_id() = 1);

create policy "activity_own_select" on activity_logs for select to authenticated
  using (user_id = current_user_table_id());

create policy "activity_insert_own" on activity_logs for insert to authenticated
  with check (user_id = current_user_table_id());

-- ── COMPANY SETTINGS ──────────────────────────────────────────────────────────
-- Run in Supabase Dashboard SQL editor to add this table
create table if not exists company_settings (
  id              int primary key default 1 check (id = 1),
  company_name    text not null default 'SAMRUQ Qurylys',
  company_phone   text,
  company_address text,
  updated_at      timestamptz not null default now()
);

alter table company_settings enable row level security;

-- Everyone can read
create policy "company_settings_read" on company_settings for select to authenticated
  using (true);

-- Only director can write
create policy "company_settings_write" on company_settings for all to authenticated
  using    (current_user_role_id() = 1)
  with check (current_user_role_id() = 1);

-- Seed default row
insert into company_settings (id, company_name) values (1, 'SAMRUQ Qurylys')
  on conflict (id) do nothing;