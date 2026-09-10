-- ═══════════════════════════════════════════════════════════════
-- 9jaTax — FLUTTERWAVE ADDITIONS
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- PAYMENTS TABLE — all Flutterwave transactions
create table if not exists payments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  invoice_id uuid references invoices(id) on delete set null,
  flw_tx_id text,           -- Flutterwave transaction ID
  flw_ref text,             -- Flutterwave reference
  tx_ref text unique,       -- Our own reference (used for matching)
  amount numeric(12,2) not null,
  currency text default 'NGN',
  status text default 'pending' check (status in ('pending','successful','failed')),
  payment_type text,        -- card, bank_transfer, ussd, etc.
  customer_email text,
  customer_name text,
  meta jsonb,               -- full Flutterwave response
  created_at timestamptz default now()
);
alter table payments enable row level security;
drop policy if exists "Users manage own payments" on payments;
create policy "Users manage own payments" on payments
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- SUBSCRIPTIONS TABLE
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
create policy "Users manage own subscription" on subscriptions
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Add payment_link_token to invoices for shareable links
alter table invoices add column if not exists payment_token text unique;
alter table invoices add column if not exists payment_url text;

-- Auto-generate payment token when invoice is created/updated
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

-- ═══════════════════════════════════════════════════════════════
-- DONE
-- ═══════════════════════════════════════════════════════════════
