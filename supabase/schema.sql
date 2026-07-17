-- YouCard schema
-- Run this in the Supabase SQL editor (or `supabase db push` if you use the CLI).
-- This matches the tables and RPCs currently wired in the app.

create extension if not exists "pgcrypto";

-- Core account table used by the home screen, currencies page, and add/sub flows.
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  currency text not null,
  balance numeric not null default 0,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (kind, currency)
);

alter table accounts drop constraint if exists accounts_kind_check;

alter table accounts
  add column if not exists sort_order integer not null default 0;

update accounts a
set sort_order = ranked.sort_order
from (
  select
    id,
    row_number() over (
      partition by kind
      order by is_primary desc, created_at asc, id asc
    ) - 1 as sort_order
  from accounts
) ranked
where a.id = ranked.id;

-- Shared people list used by gifts, spending, and reimbursements.
create table if not exists gift_people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  relation text,
  notes text,
  created_at timestamptz not null default now()
);

alter table gift_people
  add column if not exists email text;

-- Shared expense tracking for splitting one purchase across multiple people.
create table if not exists split_expenses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  account_id uuid not null references accounts (id) on delete cascade,
  amount numeric not null check (amount > 0),
  note text,
  split_type text not null default 'equal' check (split_type in ('equal')),
  transaction_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists split_expense_shares (
  id uuid primary key default gen_random_uuid(),
  split_expense_id uuid not null references split_expenses (id) on delete cascade,
  person_id uuid not null references gift_people (id) on delete cascade,
  share_amount numeric not null check (share_amount > 0),
  is_paid boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  unique (split_expense_id, person_id)
);

-- Transaction history used by the transactions list and transaction detail page.
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts (id) on delete cascade,
  kind text not null check (kind in ('add', 'sub', 'transfer')),
  amount numeric not null check (amount > 0),
  items jsonb not null default '[]'::jsonb,
  merchant text,
  note text,
  category text,
  person_id uuid references gift_people (id) on delete set null,
  person_role text check (person_role in ('for', 'from')),
  split_expense_id uuid references split_expenses (id) on delete set null,
  transfer_account_id uuid references accounts (id) on delete set null,
  receipt_path text,
  receipt_url text,
  created_at timestamptz not null default now()
);

-- Upgrade existing databases that already had the older transactions table.
alter table transactions
  add column if not exists merchant text;

alter table transactions
  add column if not exists category text;

alter table transactions
  add column if not exists person_id uuid references gift_people (id) on delete set null;

alter table transactions
  add column if not exists person_role text check (person_role in ('for', 'from'));

alter table transactions
  add column if not exists split_expense_id uuid references split_expenses (id) on delete set null;

alter table transactions
  add column if not exists transfer_account_id uuid references accounts (id) on delete set null;

alter table transactions
  add column if not exists receipt_path text;

alter table split_expenses
  drop constraint if exists split_expenses_transaction_id_fkey;

alter table split_expenses
  add constraint split_expenses_transaction_id_fkey
  foreign key (transaction_id) references transactions (id) on delete set null;

create index if not exists transactions_created_at_idx on transactions (created_at desc);
create index if not exists transactions_account_id_idx on transactions (account_id);
create index if not exists transactions_category_idx on transactions (category);
create index if not exists transactions_person_id_idx on transactions (person_id);
create index if not exists transactions_person_role_idx on transactions (person_role);
create index if not exists transactions_split_expense_id_idx on transactions (split_expense_id);
create index if not exists split_expenses_account_id_idx on split_expenses (account_id);
create index if not exists split_expense_shares_split_expense_id_idx on split_expense_shares (split_expense_id);
create index if not exists split_expense_shares_person_id_idx on split_expense_shares (person_id);

-- Atomically adjusts a balance so add/subtract can't race against a second
-- device or a slow connection. Called from the client via supabase.rpc().
create or replace function adjust_balance(p_account_id uuid, p_delta numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update accounts
  set balance = balance + p_delta
  where id = p_account_id;
end;
$$;

-- Moves money between two accounts without creating two separate rows.
create or replace function transfer_balance(
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update accounts
  set balance = balance - p_amount
  where id = p_from_account_id;

  update accounts
  set balance = balance + p_amount
  where id = p_to_account_id;
end;
$$;

-- Makes exactly one account primary within a kind.
create or replace function set_primary_account(p_kind text, p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update accounts
  set is_primary = (id = p_account_id)
  where kind = p_kind;
end;
$$;

-- Persists a dragged currency order and marks the first currency as primary.
create or replace function reorder_accounts(p_kind text, p_account_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update accounts a
  set
    sort_order = ordered.sort_order,
    is_primary = (ordered.sort_order = 0)
  from (
    select
      id,
      ordinality - 1 as sort_order
    from unnest(p_account_ids) with ordinality as t(id, ordinality)
  ) ordered
  where a.id = ordered.id
    and a.kind = p_kind;
end;
$$;

-- Budgeting, goals, and recurring templates.
create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  amount numeric not null check (amount > 0),
  period text not null default 'monthly',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  target_amount numeric not null check (target_amount > 0),
  current_amount numeric not null default 0,
  wallet_kind text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists recurring_rules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null check (kind in ('add', 'sub', 'transfer')),
  account_id uuid not null references accounts (id) on delete cascade,
  transfer_account_id uuid references accounts (id) on delete set null,
  amount numeric not null check (amount > 0),
  category text,
  note text,
  cadence text not null default 'monthly',
  next_run_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists budgets_category_idx on budgets (category);
create index if not exists goals_wallet_kind_idx on goals (wallet_kind);
create index if not exists recurring_rules_next_run_at_idx on recurring_rules (next_run_at);

-- Gift planning tables. These are additive so they do not modify existing data.
create table if not exists gift_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'general',
  product_type text,
  brand text,
  notes text,
  link text,
  store text,
  created_at timestamptz not null default now()
);

create table if not exists gift_product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references gift_products (id) on delete cascade,
  name text not null,
  variant_code text,
  color text,
  size text,
  price numeric,
  notes text,
  created_at timestamptz not null default now(),
  unique (product_id, name)
);

create table if not exists gift_product_assignments (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references gift_products (id) on delete cascade,
  variant_id uuid references gift_product_variants (id) on delete set null,
  person_id uuid not null references gift_people (id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  status text not null default 'idea' check (status in ('idea', 'planned', 'ordered', 'wrapped', 'given')),
  note text,
  created_at timestamptz not null default now(),
  unique (product_id, variant_id, person_id)
);

create table if not exists gift_items (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references gift_people (id) on delete set null,
  title text not null,
  category text not null default 'general',
  product_type text,
  variant text,
  color text,
  size text,
  quantity integer not null default 1 check (quantity > 0),
  unit text not null default 'item',
  status text not null default 'idea' check (status in ('idea', 'planned', 'ordered', 'wrapped', 'given')),
  occasion text,
  price numeric,
  store text,
  link text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists gift_products_category_idx on gift_products (category);
create index if not exists gift_products_product_type_idx on gift_products (product_type);
create index if not exists gift_product_variants_product_id_idx on gift_product_variants (product_id);
create index if not exists gift_product_assignments_product_id_idx on gift_product_assignments (product_id);
create index if not exists gift_product_assignments_person_id_idx on gift_product_assignments (person_id);
create index if not exists gift_product_assignments_status_idx on gift_product_assignments (status);
create index if not exists gift_people_name_idx on gift_people (name);
create index if not exists gift_items_person_id_idx on gift_items (person_id);
create index if not exists gift_items_category_idx on gift_items (category);
create index if not exists gift_items_status_idx on gift_items (status);

-- Lightweight reusable templates for quick entry.
create table if not exists saved_templates (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('transaction', 'gift', 'split')),
  title text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists saved_templates_scope_idx on saved_templates (scope);

-- Row Level Security
-- This app has no login screen — it's meant for one person's own data,
-- accessed with the Supabase anon key. That means anyone with your anon key
-- and project URL could read/write this data, so:
--   1. Never commit your .env.local or share the anon key publicly.
--   2. If you want real protection, add Supabase Auth (even a single
--      passwordless email login) and swap these policies to check auth.uid().
-- For now, RLS is enabled with permissive policies scoped to anon so the
-- tables aren't wide open to the entire internet by default (PostgREST
-- requires RLS policies to allow any access at all).

alter table accounts enable row level security;
alter table transactions enable row level security;
alter table budgets enable row level security;
alter table goals enable row level security;
alter table recurring_rules enable row level security;
alter table gift_people enable row level security;
alter table gift_products enable row level security;
alter table gift_product_variants enable row level security;
alter table gift_product_assignments enable row level security;
alter table gift_items enable row level security;
alter table split_expenses enable row level security;
alter table split_expense_shares enable row level security;
alter table saved_templates enable row level security;

drop policy if exists "allow all on accounts" on accounts;
drop policy if exists "allow all on transactions" on transactions;
drop policy if exists "allow all on budgets" on budgets;
drop policy if exists "allow all on goals" on goals;
drop policy if exists "allow all on recurring_rules" on recurring_rules;
drop policy if exists "allow all on gift_people" on gift_people;
drop policy if exists "allow all on gift_products" on gift_products;
drop policy if exists "allow all on gift_product_variants" on gift_product_variants;
drop policy if exists "allow all on gift_product_assignments" on gift_product_assignments;
drop policy if exists "allow all on gift_items" on gift_items;
drop policy if exists "allow all on split_expenses" on split_expenses;
drop policy if exists "allow all on split_expense_shares" on split_expense_shares;
drop policy if exists "allow all on saved_templates" on saved_templates;

create policy "allow all on accounts" on accounts
  for all using (true) with check (true);

create policy "allow all on transactions" on transactions
  for all using (true) with check (true);

create policy "allow all on budgets" on budgets
  for all using (true) with check (true);

create policy "allow all on goals" on goals
  for all using (true) with check (true);

create policy "allow all on recurring_rules" on recurring_rules
  for all using (true) with check (true);

create policy "allow all on gift_people" on gift_people
  for all using (true) with check (true);

create policy "allow all on gift_products" on gift_products
  for all using (true) with check (true);

create policy "allow all on gift_product_variants" on gift_product_variants
  for all using (true) with check (true);

create policy "allow all on gift_product_assignments" on gift_product_assignments
  for all using (true) with check (true);

create policy "allow all on gift_items" on gift_items
  for all using (true) with check (true);

create policy "allow all on split_expenses" on split_expenses
  for all using (true) with check (true);

create policy "allow all on split_expense_shares" on split_expense_shares
  for all using (true) with check (true);

create policy "allow all on saved_templates" on saved_templates
  for all using (true) with check (true);

-- Storage policies for receipt uploads.
-- These allow the app to upload and read files in the `receipts` bucket
-- while still keeping other storage objects untouched.
drop policy if exists "allow all on receipts bucket objects" on storage.objects;

create policy "allow all on receipts bucket objects" on storage.objects
  for all using (bucket_id = 'receipts') with check (bucket_id = 'receipts');

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on accounts to anon, authenticated;
grant select, insert, update, delete on transactions to anon, authenticated;
grant select, insert, update, delete on budgets to anon, authenticated;
grant select, insert, update, delete on goals to anon, authenticated;
grant select, insert, update, delete on recurring_rules to anon, authenticated;
grant select, insert, update, delete on gift_people to anon, authenticated;
grant select, insert, update, delete on gift_products to anon, authenticated;
grant select, insert, update, delete on gift_product_variants to anon, authenticated;
grant select, insert, update, delete on gift_product_assignments to anon, authenticated;
grant select, insert, update, delete on gift_items to anon, authenticated;
grant select, insert, update, delete on split_expenses to anon, authenticated;
grant select, insert, update, delete on split_expense_shares to anon, authenticated;
grant select, insert, update, delete on saved_templates to anon, authenticated;
grant execute on function adjust_balance(uuid, numeric) to anon, authenticated;
grant execute on function transfer_balance(uuid, uuid, numeric) to anon, authenticated;
grant execute on function set_primary_account(text, uuid) to anon, authenticated;
grant execute on function reorder_accounts(text, uuid[]) to anon, authenticated;

-- Optional: storage bucket for receipt photos.
-- Create a bucket named "receipts" from the Supabase dashboard (Storage tab),
-- set it to public, and upload from the client with:
--   supabase.storage.from('receipts').upload(path, file)
-- then save the public URL on the transaction's receipt_url column.

-- Seed a starting Card (USD) and Cash (THB) account so the home screen has
-- something to show on first run. Edit the currencies/balances as needed.
insert into accounts (kind, currency, balance, is_primary, sort_order)
values
  ('card', 'USD', 0, true, 0),
  ('cash', 'THB', 0, true, 0)
on conflict (kind, currency) do nothing;
