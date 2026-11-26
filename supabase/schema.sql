-- Undercut — multi-agency database (Supabase / Postgres)
-- Paste this whole file in Supabase → SQL Editor → Run. Safe to run again.
-- Undercut talks to these tables from the server only, with the service role key.
-- Row Level Security is ON with no policies: the public anon key cannot read anything.

create extension if not exists pgcrypto;

-- One row per agency
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'beta',
  created_at timestamptz not null default now()
);

-- Which workspace an email logs into (owner, team member or client login)
create table if not exists logins (
  email text primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- The agency's data: clients, settings, Google connection, alerts, fixes, campaigns, keywords…
-- (one JSON document per key, e.g. "clients.json", "agency.json", "fixes/<client>.json")
create table if not exists kv (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  key text not null,
  value jsonb,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, key)
);

-- Tracking snippet: which workspace a site (client id) belongs to
create table if not exists sites (
  site_id text primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Private beta: requests from the landing page and invitations
create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null default '',
  agency text not null default '',
  kind text not null default 'web',
  website text not null default '',
  note text not null default '',
  status text not null default 'waiting' check (status in ('waiting','invited','joined')),
  code text unique,
  workspace_id uuid references workspaces(id) on delete set null,
  created_at timestamptz not null default now(),
  invited_at timestamptz
);

create index if not exists logins_ws on logins(workspace_id);
create index if not exists sites_ws on sites(workspace_id);

alter table workspaces enable row level security;
alter table logins enable row level security;
alter table kv enable row level security;
alter table sites enable row level security;
alter table waitlist enable row level security;

-- Undercut public database: products their owner published (one row per product page /p/<slug>)
create table if not exists public_products (
  slug text primary key,
  workspace_id uuid references workspaces(id) on delete cascade,
  score int not null default 0,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists public_products_score on public_products (score desc);
