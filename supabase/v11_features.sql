-- ═══════════════════════════════════════════════════════════════
-- 9jaTax v11 — NEW FEATURES SQL
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ACCOUNTANT PORTAL
create table if not exists accountant_invites (
  id uuid default uuid_generate_v4() primary key,
  owner_user_id uuid references auth.users(id) on delete cascade not null,
  accountant_email text not null,
  access_level text default 'read' check (access_level in ('read','reports','full')),
  token text unique default encode(gen_random_bytes(24), 'hex'),
  status text default 'pending' check (status in ('pending','accepted','revoked')),
  accepted_at timestamptz,
  created_at timestamptz default now()
);
alter table accountant_invites enable row level security;
drop policy if exists "accountant_invites_all" on accountant_invites;
create policy "accountant_invites_all" on accountant_invites
  for all using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

-- BANK STATEMENT IMPORTS
create table if not exists bank_statement_rows (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  import_id uuid not null,
  date date,
  description text,
  debit numeric(12,2) default 0,
  credit numeric(12,2) default 0,
  balance numeric(12,2),
  matched boolean default false,
  matched_to uuid,
  matched_type text,
  created_at timestamptz default now()
);
alter table bank_statement_rows enable row level security;
drop policy if exists "bank_rows_all" on bank_statement_rows;
create policy "bank_rows_all" on bank_statement_rows
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- RECEIPT SCANS
create table if not exists receipt_scans (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  image_url text,
  extracted_amount numeric(12,2),
  extracted_vendor text,
  extracted_date date,
  raw_text text,
  expense_id uuid references expenses(id) on delete set null,
  status text default 'pending' check (status in ('pending','confirmed','rejected')),
  created_at timestamptz default now()
);
alter table receipt_scans enable row level security;
drop policy if exists "receipt_scans_all" on receipt_scans;
create policy "receipt_scans_all" on receipt_scans
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- PAYROLL V2 with PAYE
create table if not exists payroll_runs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  period_month int not null,
  period_year int not null,
  total_gross numeric(12,2) default 0,
  total_paye numeric(12,2) default 0,
  total_pension numeric(12,2) default 0,
  total_net numeric(12,2) default 0,
  status text default 'draft' check (status in ('draft','processed','filed')),
  created_at timestamptz default now()
);
alter table payroll_runs enable row level security;
drop policy if exists "payroll_runs_all" on payroll_runs;
create policy "payroll_runs_all" on payroll_runs
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- CREDIT SCORE SNAPSHOTS
create table if not exists credit_scores (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  score int not null,
  grade text not null,
  revenue_score int default 0,
  consistency_score int default 0,
  expense_score int default 0,
  tax_score int default 0,
  growth_score int default 0,
  summary text,
  recommendations jsonb,
  computed_at timestamptz default now()
);
alter table credit_scores enable row level security;
drop policy if exists "credit_scores_all" on credit_scores;
create policy "credit_scores_all" on credit_scores
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- WHATSAPP MESSAGE LOG
create table if not exists whatsapp_sends (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  invoice_id uuid references invoices(id) on delete set null,
  phone text not null,
  message text,
  status text default 'sent',
  sent_at timestamptz default now()
);
alter table whatsapp_sends enable row level security;
drop policy if exists "whatsapp_sends_all" on whatsapp_sends;
create policy "whatsapp_sends_all" on whatsapp_sends
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Add QR / e-invoice fields to invoices
alter table invoices add column if not exists qr_code text;
alter table invoices add column if not exists e_invoice_ref text;
alter table invoices add column if not exists whatsapp_sent boolean default false;
alter table invoices add column if not exists currency text default 'NGN';
alter table invoices add column if not exists exchange_rate numeric(10,4) default 1;

-- Add pension/paye fields to staff
alter table staff add column if not exists pension_number text;
alter table staff add column if not exists bank_name text;
alter table staff add column if not exists account_number text;
alter table staff add column if not exists tax_id text;

-- ═══════════════════════════════════════════════════════════════
-- DONE
-- ═══════════════════════════════════════════════════════════════
