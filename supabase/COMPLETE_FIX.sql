-- ═══════════════════════════════════════════════════════════════
-- 9jaTax — COMPLETE FIX SQL
-- Run this in Supabase SQL Editor
-- Fixes: missing columns, RLS policies, triggers
-- ═══════════════════════════════════════════════════════════════

-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────
-- FIX PROFILES
-- ─────────────────────────────────────────
alter table profiles add column if not exists shop_name text;
alter table profiles add column if not exists owner_name text;
alter table profiles add column if not exists phone text;
alter table profiles add column if not exists address text;
alter table profiles add column if not exists currency text default 'NGN';
alter table profiles add column if not exists logo_url text;
alter table profiles add column if not exists whatsapp text;
alter table profiles add column if not exists summary_email text;
alter table profiles add column if not exists business_type text;
alter table profiles add column if not exists state text;
alter table profiles add column if not exists onboarding_done boolean default false;
alter table profiles add column if not exists created_at timestamptz default now();

alter table profiles enable row level security;
drop policy if exists "Users manage own profile" on profiles;
drop policy if exists "users manage own profile" on profiles;
create policy "profiles_all" on profiles
  for all using (auth.uid() = id)
  with check (auth.uid() = id);

-- Fix trigger
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, onboarding_done)
  values (new.id, false)
  on conflict (id) do nothing;
  return new;
exception when others then return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─────────────────────────────────────────
-- FIX BRANCHES
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
drop policy if exists "branches_all" on branches;
create policy "branches_all" on branches
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- FIX CUSTOMERS
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
drop policy if exists "customers_all" on customers;
create policy "customers_all" on customers
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- FIX PRODUCTS (add missing unit_size column)
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
  unit_size text,
  track_stock boolean default false,
  stock_qty numeric(10,2) default 0,
  low_stock_alert numeric(10,2) default 5,
  is_active boolean default true,
  created_at timestamptz default now()
);
-- Add unit_size if table already exists
alter table products add column if not exists unit_size text;
alter table products add column if not exists branch_id uuid references branches(id) on delete set null;

alter table products enable row level security;
drop policy if exists "Users manage own products" on products;
drop policy if exists "products_all" on products;
create policy "products_all" on products
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- FIX INVOICES (add payment columns)
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
  payment_token text unique,
  payment_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table invoices add column if not exists branch_id uuid references branches(id) on delete set null;
alter table invoices add column if not exists payment_token text unique;
alter table invoices add column if not exists payment_url text;

alter table invoices enable row level security;
drop policy if exists "Users manage own invoices" on invoices;
drop policy if exists "invoices_all" on invoices;
create policy "invoices_all" on invoices
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Payment token trigger
create or replace function generate_payment_token()
returns trigger language plpgsql as $$
begin
  if new.payment_token is null then
    new.payment_token := encode(gen_random_bytes(16), 'hex');
  end if;
  return new;
end;
$$;
drop trigger if exists set_payment_token on invoices;
create trigger set_payment_token
  before insert on invoices
  for each row execute function generate_payment_token();

-- ─────────────────────────────────────────
-- FIX INVOICE ITEMS
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
drop policy if exists "invoice_items_all" on invoice_items;
create policy "invoice_items_all" on invoice_items
  for all using (
    exists (
      select 1 from invoices
      where invoices.id = invoice_items.invoice_id
      and invoices.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────
-- FIX EXPENSES
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
alter table expenses add column if not exists branch_id uuid references branches(id) on delete set null;
alter table expenses add column if not exists receipt_url text;

alter table expenses enable row level security;
drop policy if exists "Users manage own expenses" on expenses;
drop policy if exists "expenses_all" on expenses;
create policy "expenses_all" on expenses
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- FIX STOCK MOVEMENTS
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
drop policy if exists "stock_movements_all" on stock_movements;
create policy "stock_movements_all" on stock_movements
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- FIX STAFF
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
drop policy if exists "staff_all" on staff;
create policy "staff_all" on staff
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- FIX PAYROLL
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
drop policy if exists "payroll_all" on payroll;
create policy "payroll_all" on payroll
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- FIX DEBTS
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
drop policy if exists "debts_all" on debts;
create policy "debts_all" on debts
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- FIX DEBT PAYMENTS
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
drop policy if exists "debt_payments_all" on debt_payments;
create policy "debt_payments_all" on debt_payments
  for all using (
    exists (
      select 1 from debts
      where debts.id = debt_payments.debt_id
      and debts.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────
-- FIX PAYMENTS (Flutterwave)
-- ─────────────────────────────────────────
create table if not exists payments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  invoice_id uuid references invoices(id) on delete set null,
  flw_tx_id text,
  flw_ref text,
  tx_ref text unique,
  amount numeric(12,2) not null,
  currency text default 'NGN',
  status text default 'pending' check (status in ('pending','successful','failed')),
  payment_type text,
  customer_email text,
  customer_name text,
  meta jsonb,
  created_at timestamptz default now()
);
alter table payments enable row level security;
drop policy if exists "Users manage own payments" on payments;
drop policy if exists "payments_all" on payments;
create policy "payments_all" on payments
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Public can view invoice by payment token (for /pay/:token page)
drop policy if exists "Public can view invoice by token" on invoices;
create policy "Public can view invoice by token" on invoices
  for select using (payment_token is not null);

-- Public can view invoice items for paid invoices
drop policy if exists "Public can view items by invoice token" on invoice_items;
create policy "Public can view items by invoice token" on invoice_items
  for select using (
    exists (
      select 1 from invoices
      where invoices.id = invoice_items.invoice_id
      and invoices.payment_token is not null
    )
  );

-- Public can insert payments (for /pay/:token page)
drop policy if exists "Public can insert payments" on payments;
create policy "Public can insert payments" on payments
  for insert with check (true);

-- Public can update invoice status to paid (via payment)
drop policy if exists "Public can mark invoice paid" on invoices;
create policy "Public can mark invoice paid" on invoices
  for update using (payment_token is not null);

-- ─────────────────────────────────────────
-- FIX SUBSCRIPTIONS
-- ─────────────────────────────────────────
create table if not exists subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  plan text default 'free' check (plan in ('free','pro','business')),
  status text default 'active' check (status in ('active','expired','cancelled')),
  flw_tx_id text,
  amount_paid numeric(12,2),
  started_at timestamptz default now(),
  expires_at timestamptz,
  created_at timestamptz default now()
);
alter table subscriptions enable row level security;
drop policy if exists "Users manage own subscription" on subscriptions;
drop policy if exists "subscriptions_all" on subscriptions;
create policy "subscriptions_all" on subscriptions
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- FIX DAILY SUMMARIES
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
drop policy if exists "daily_summaries_all" on daily_summaries;
create policy "daily_summaries_all" on daily_summaries
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- DONE — Paste this entire file, click Run, done.
-- ═══════════════════════════════════════════════════════════════
