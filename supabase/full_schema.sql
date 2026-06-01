-- ═══════════════════════════════════════════════════════════════
-- 9jaTax — COMPLETE DATABASE SCHEMA
-- Paste this entire file into Supabase SQL Editor and click Run
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- PROFILES (extends auth.users)
-- ─────────────────────────────────────────
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  shop_name text,
  owner_name text,
  phone text,
  address text,
  currency text default 'NGN',
  logo_url text,
  whatsapp text,
  summary_email text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

drop policy if exists "Users manage own profile" on profiles;
create policy "Users manage own profile" on profiles
  for all using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─────────────────────────────────────────
-- BRANCHES / MULTIPLE SHOPS
-- ─────────────────────────────────────────
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

drop policy if exists "Users manage own branches" on branches;
create policy "Users manage own branches" on branches
  for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- CUSTOMERS
-- ─────────────────────────────────────────
create table if not exists customers (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  phone text,
  email text,
  address text,
  created_at timestamptz default now()
);

alter table customers enable row level security;

drop policy if exists "Users manage own customers" on customers;
create policy "Users manage own customers" on customers
  for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- PRODUCTS / INVENTORY
-- ─────────────────────────────────────────
create table if not exists products (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  branch_id uuid references branches(id) on delete set null,
  name text not null,
  description text,
  selling_price numeric(12,2) default 0,
  cost_price numeric(12,2) default 0,
  sku text,
  unit text default 'piece',
  track_stock boolean default false,
  stock_qty numeric(10,2) default 0,
  low_stock_alert numeric(10,2) default 5,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table products enable row level security;

drop policy if exists "Users manage own products" on products;
create policy "Users manage own products" on products
  for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- INVOICES (Sales)
-- ─────────────────────────────────────────
create table if not exists invoices (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  branch_id uuid references branches(id) on delete set null,
  invoice_number text not null,
  customer_id uuid references customers(id) on delete set null,
  customer_name text,
  status text default 'draft' check (status in ('draft','sent','paid','overdue','cancelled')),
  issue_date date default current_date,
  due_date date,
  subtotal numeric(12,2) default 0,
  tax_rate numeric(5,2) default 0,
  tax_amount numeric(12,2) default 0,
  total numeric(12,2) default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table invoices enable row level security;

drop policy if exists "Users manage own invoices" on invoices;
create policy "Users manage own invoices" on invoices
  for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- INVOICE LINE ITEMS
-- ─────────────────────────────────────────
create table if not exists invoice_items (
  id uuid default uuid_generate_v4() primary key,
  invoice_id uuid references invoices(id) on delete cascade not null,
  product_id uuid references products(id) on delete set null,
  description text not null,
  qty numeric(10,2) default 1,
  unit_price numeric(12,2) default 0,
  total numeric(12,2) default 0
);

alter table invoice_items enable row level security;

drop policy if exists "Users manage own invoice items" on invoice_items;
create policy "Users manage own invoice items" on invoice_items
  for all using (
    exists (
      select 1 from invoices
      where invoices.id = invoice_items.invoice_id
      and invoices.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────
-- EXPENSES
-- ─────────────────────────────────────────
create table if not exists expenses (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  branch_id uuid references branches(id) on delete set null,
  description text not null,
  category text default 'other',
  amount numeric(12,2) not null,
  date date default current_date,
  vendor text,
  receipt_url text,
  notes text,
  created_at timestamptz default now()
);

alter table expenses enable row level security;

drop policy if exists "Users manage own expenses" on expenses;
create policy "Users manage own expenses" on expenses
  for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- STOCK MOVEMENTS
-- ─────────────────────────────────────────
create table if not exists stock_movements (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  product_id uuid references products(id) on delete cascade not null,
  type text check (type in ('in','out','adjustment')),
  qty numeric(10,2) not null,
  note text,
  created_at timestamptz default now()
);

alter table stock_movements enable row level security;

drop policy if exists "Users manage own stock movements" on stock_movements;
create policy "Users manage own stock movements" on stock_movements
  for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- STAFF / EMPLOYEES
-- ─────────────────────────────────────────
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

drop policy if exists "Users manage own staff" on staff;
create policy "Users manage own staff" on staff
  for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- PAYROLL RECORDS
-- ─────────────────────────────────────────
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

drop policy if exists "Users manage own payroll" on payroll;
create policy "Users manage own payroll" on payroll
  for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- DEBT TRACKER
-- ─────────────────────────────────────────
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

drop policy if exists "Users manage own debts" on debts;
create policy "Users manage own debts" on debts
  for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- DEBT PAYMENTS LOG
-- ─────────────────────────────────────────
create table if not exists debt_payments (
  id uuid default uuid_generate_v4() primary key,
  debt_id uuid references debts(id) on delete cascade not null,
  amount numeric(12,2) not null,
  note text,
  paid_at timestamptz default now()
);

alter table debt_payments enable row level security;

drop policy if exists "Users manage own debt payments" on debt_payments;
create policy "Users manage own debt payments" on debt_payments
  for all using (
    exists (
      select 1 from debts
      where debts.id = debt_payments.debt_id
      and debts.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────
-- DAILY SUMMARIES
-- ─────────────────────────────────────────
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

drop policy if exists "Users manage own summaries" on daily_summaries;
create policy "Users manage own summaries" on daily_summaries
  for all using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- DONE — All 13 tables created with Row Level Security enabled
-- Tables: profiles, branches, customers, products, invoices,
--         invoice_items, expenses, stock_movements, staff,
--         payroll, debts, debt_payments, daily_summaries
-- ═══════════════════════════════════════════════════════════════
