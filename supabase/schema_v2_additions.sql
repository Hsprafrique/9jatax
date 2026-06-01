-- ─────────────────────────────────────────
-- RUN THIS IN SUPABASE SQL EDITOR
-- These are additions to the original schema
-- ─────────────────────────────────────────

-- BRANCHES / MULTIPLE SHOPS
create table if not exists branches (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  address text,
  phone text,
  is_default boolean default false,
  created_at timestamptz default now()
);
alter table branches enable row level security;
create policy "Users manage own branches" on branches for all using (auth.uid() = user_id);

-- Add branch_id to key tables
alter table invoices add column if not exists branch_id uuid references branches(id) on delete set null;
alter table expenses add column if not exists branch_id uuid references branches(id) on delete set null;
alter table products add column if not exists branch_id uuid references branches(id) on delete set null;

-- STAFF / EMPLOYEES
create table if not exists staff (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  branch_id uuid references branches(id) on delete set null,
  name text not null,
  role text default 'staff',
  phone text,
  email text,
  salary numeric(12,2) default 0,
  salary_type text default 'monthly' check (salary_type in ('daily','weekly','monthly')),
  hire_date date default current_date,
  is_active boolean default true,
  created_at timestamptz default now()
);
alter table staff enable row level security;
create policy "Users manage own staff" on staff for all using (auth.uid() = user_id);

-- PAYROLL RECORDS
create table if not exists payroll (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  staff_id uuid references staff(id) on delete cascade not null,
  period_start date not null,
  period_end date not null,
  base_salary numeric(12,2) default 0,
  bonuses numeric(12,2) default 0,
  deductions numeric(12,2) default 0,
  net_pay numeric(12,2) default 0,
  status text default 'pending' check (status in ('pending','paid')),
  paid_at timestamptz,
  notes text,
  created_at timestamptz default now()
);
alter table payroll enable row level security;
create policy "Users manage own payroll" on payroll for all using (auth.uid() = user_id);

-- DEBT TRACKER
create table if not exists debts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('owed_to_me','i_owe')),
  party_name text not null,
  party_phone text,
  amount numeric(12,2) not null,
  amount_paid numeric(12,2) default 0,
  description text,
  due_date date,
  status text default 'active' check (status in ('active','partial','settled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table debts enable row level security;
create policy "Users manage own debts" on debts for all using (auth.uid() = user_id);

-- DEBT PAYMENTS LOG
create table if not exists debt_payments (
  id uuid default uuid_generate_v4() primary key,
  debt_id uuid references debts(id) on delete cascade not null,
  amount numeric(12,2) not null,
  note text,
  paid_at timestamptz default now()
);
alter table debt_payments enable row level security;
create policy "Users manage own debt payments" on debt_payments
  for all using (
    exists (select 1 from debts where debts.id = debt_payments.debt_id and debts.user_id = auth.uid())
  );

-- DAILY SALES LOG (for WhatsApp/email summary)
create table if not exists daily_summaries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  branch_id uuid references branches(id) on delete set null,
  date date default current_date,
  total_sales numeric(12,2) default 0,
  total_expenses numeric(12,2) default 0,
  net_profit numeric(12,2) default 0,
  invoice_count int default 0,
  sent_at timestamptz,
  created_at timestamptz default now(),
  unique(user_id, date)
);
alter table daily_summaries enable row level security;
create policy "Users manage own summaries" on daily_summaries for all using (auth.uid() = user_id);

-- Add receipt_url to expenses if not exists
alter table expenses add column if not exists receipt_url text;
