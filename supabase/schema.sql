-- ShopTrack Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- PROFILES (extends auth.users)
-- ─────────────────────────────────────────
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  shop_name text,
  owner_name text,
  phone text,
  address text,
  currency text default 'NGN',
  logo_url text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Users manage own profile" on profiles
  for all using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id) values (new.id);
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─────────────────────────────────────────
-- CUSTOMERS
-- ─────────────────────────────────────────
create table customers (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  phone text,
  email text,
  address text,
  created_at timestamptz default now()
);

alter table customers enable row level security;
create policy "Users manage own customers" on customers
  for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- PRODUCTS / INVENTORY
-- ─────────────────────────────────────────
create table products (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
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
create policy "Users manage own products" on products
  for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- INVOICES (Sales)
-- ─────────────────────────────────────────
create table invoices (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  invoice_number text not null,
  customer_id uuid references customers(id) on delete set null,
  customer_name text,  -- denormalized for display
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
create policy "Users manage own invoices" on invoices
  for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- INVOICE LINE ITEMS
-- ─────────────────────────────────────────
create table invoice_items (
  id uuid default uuid_generate_v4() primary key,
  invoice_id uuid references invoices(id) on delete cascade not null,
  product_id uuid references products(id) on delete set null,
  description text not null,
  qty numeric(10,2) default 1,
  unit_price numeric(12,2) default 0,
  total numeric(12,2) default 0
);

alter table invoice_items enable row level security;
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
create table expenses (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
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
create policy "Users manage own expenses" on expenses
  for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- STOCK MOVEMENTS (inventory log)
-- ─────────────────────────────────────────
create table stock_movements (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  product_id uuid references products(id) on delete cascade not null,
  type text check (type in ('in','out','adjustment')),
  qty numeric(10,2) not null,
  note text,
  created_at timestamptz default now()
);

alter table stock_movements enable row level security;
create policy "Users manage own stock movements" on stock_movements
  for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- HELPFUL VIEWS
-- ─────────────────────────────────────────

-- Monthly summary view
create or replace view monthly_summary as
select
  user_id,
  date_trunc('month', issue_date) as month,
  sum(case when status = 'paid' then total else 0 end) as income,
  count(case when status = 'paid' then 1 end) as paid_count,
  count(case when status in ('sent','overdue') then 1 end) as pending_count
from invoices
group by user_id, date_trunc('month', issue_date);
