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
