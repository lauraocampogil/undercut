-- Undercut · database schema (Supabase / Postgres)
-- Run this file in Supabase → SQL Editor.

create table if not exists stores (
  id            uuid primary key default gen_random_uuid(),
  domain        text unique not null,
  name          text,
  currency      text,
  country       text,
  language      text,
  product_count int default 0,
  blocked       boolean default false,
  last_checked_at timestamptz,
  created_at    timestamptz default now()
);

create table if not exists products (
  id            text primary key,              -- "<store_id>:<shopify_id>"
  store_id      uuid not null references stores(id) on delete cascade,
  shopify_id    bigint not null,
  handle        text not null,
  title         text not null,
  product_type  text,
  vendor        text,
  tags          text[] default '{}',
  image         text,
  price         numeric not null,              -- lowest variant price
  compare_at    numeric,                       -- compare-at price (when on sale)
  available     boolean default true,
  shop_created_at timestamptz,
  first_seen_at timestamptz default now(),
  updated_at    timestamptz default now()
);
create index if not exists products_store_idx on products(store_id);

create table if not exists snapshots (
  product_id    text not null references products(id) on delete cascade,
  day           date not null,
  price         numeric not null,
  compare_at    numeric,
  available     boolean,
  primary key (product_id, day)
);

create table if not exists changes (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references stores(id) on delete cascade,
  product_id    text references products(id) on delete cascade,
  kind          text not null check (kind in
                  ('price_down','price_up','new_product','sale_start','sale_end','out_of_stock','restock')),
  old_value     numeric,
  new_value     numeric,
  pct           numeric,
  detected_at   timestamptz default now()
);
create index if not exists changes_store_time_idx on changes(store_id, detected_at desc);

create table if not exists analyses (
  id            uuid primary key default gen_random_uuid(),
  own_store_id  uuid references stores(id),
  candidates    jsonb not null default '[]',   -- [{store_id, score, reasons[]}]
  queries       text[] default '{}',
  created_at    timestamptz default now()
);

create table if not exists accounts (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  own_store_id  uuid references stores(id),
  reminder_day  int default 1 check (reminder_day between 0 and 6), -- 0 = domingo
  last_seen_at  timestamptz,
  created_at    timestamptz default now()
);

create table if not exists tracked (
  account_id    uuid not null references accounts(id) on delete cascade,
  store_id      uuid not null references stores(id) on delete cascade,
  score         numeric,
  reasons       text[] default '{}',
  added_at      timestamptz default now(),
  primary key (account_id, store_id)
);

-- The app always reads from the server with the service role key,
-- so RLS is on with no public policies: nothing is readable from the browser.
alter table stores    enable row level security;
alter table products  enable row level security;
alter table snapshots enable row level security;
alter table changes   enable row level security;
alter table analyses  enable row level security;
alter table accounts  enable row level security;
alter table tracked   enable row level security;
