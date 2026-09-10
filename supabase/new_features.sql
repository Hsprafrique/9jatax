-- ═══════════════════════════════════════════════════════════════
-- 9jaTax — NEW FEATURES SQL
-- Run in Supabase SQL Editor AFTER COMPLETE_FIX.sql
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────
-- TRANSACTIONS (unified money movement ledger)
-- ─────────────────────────────────────────
create table if not exists transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('income','expense','transfer')),
  category text,
  description text not null,
  amount numeric(12,2) not null,
  date date default current_date,
  reference_id uuid,        -- links to invoice or expense id
  reference_type text,      -- 'invoice' or 'expense'
  payment_method text default 'cash' check (payment_method in ('cash','transfer','card','cheque','pos','other')),
  notes text,
  created_at timestamptz default now()
);
alter table transactions enable row level security;
drop policy if exists "transactions_all" on transactions;
create policy "transactions_all" on transactions
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- TAX RECORDS — VAT, WHT, PAYE tracking
-- ─────────────────────────────────────────
create table if not exists tax_records (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  tax_type text not null check (tax_type in ('vat','wht','paye','cit','business_levy','other')),
  period_start date not null,
  period_end date not null,
  taxable_amount numeric(12,2) default 0,
  tax_rate numeric(5,2) default 0,
  tax_amount numeric(12,2) default 0,
  status text default 'pending' check (status in ('pending','filed','paid','overdue')),
  filing_deadline date,
  filed_at timestamptz,
  payment_ref text,
  notes text,
  created_at timestamptz default now()
);
alter table tax_records enable row level security;
drop policy if exists "tax_records_all" on tax_records;
create policy "tax_records_all" on tax_records
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- TAX SETTINGS per user
-- ─────────────────────────────────────────
alter table profiles add column if not exists tin text;               -- Tax Identification Number
alter table profiles add column if not exists rc_number text;         -- CAC Registration Number
alter table profiles add column if not exists vat_registered boolean default false;
alter table profiles add column if not exists vat_rate numeric(5,2) default 7.5;
alter table profiles add column if not exists tax_year_start text default '01-01'; -- MM-DD
alter table profiles add column if not exists firs_email text;

-- ═══════════════════════════════════════════════════════════════
-- DONE
-- ═══════════════════════════════════════════════════════════════
