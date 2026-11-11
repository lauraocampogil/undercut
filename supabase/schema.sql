-- Undercut — production schema (Supabase / Postgres). The MVP uses ./.data JSON files instead.
create table agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#C6F432',
  report_footer text,
  plan text not null default 'trial', -- trial | freelance | agency | studio
  created_at timestamptz default now()
);

create table agency_members (
  agency_id uuid references agencies on delete cascade,
  user_id uuid references auth.users on delete cascade,
  role text not null default 'owner', -- owner | member
  primary key (agency_id, user_id)
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies on delete cascade,
  name text not null,
  domain text not null,
  color text not null,
  ga4_property_id text,
  gsc_site_url text,
  gbp_location text,
  gtm_container text,
  report_token text unique default encode(gen_random_bytes(18), 'base64url'), -- public report link
  created_at timestamptz default now()
);

-- Google tokens: store the refresh token in Supabase Vault, keep only its id here.
create table google_connections (
  agency_id uuid primary key references agencies on delete cascade,
  email text,
  refresh_token_secret_id uuid, -- vault.secrets.id
  scopes text,
  connected_at timestamptz default now()
);

-- Daily snapshots filled by a cron job: dashboards read these, not Google directly.
create table snapshots (
  client_id uuid references clients on delete cascade,
  day date not null,
  source text not null, -- ga4 | gsc | gbp | gtm | sitemap
  data jsonb not null,
  primary key (client_id, day, source)
);

-- Client viewers: read-only access to one client's dashboard.
create table client_viewers (
  client_id uuid references clients on delete cascade,
  email text not null,
  primary key (client_id, email)
);

alter table agencies enable row level security;
alter table agency_members enable row level security;
alter table clients enable row level security;
alter table google_connections enable row level security;
alter table snapshots enable row level security;
alter table client_viewers enable row level security;

create policy "members read their agency" on agencies for select
  using (id in (select agency_id from agency_members where user_id = auth.uid()));
create policy "members manage their clients" on clients for all
  using (agency_id in (select agency_id from agency_members where user_id = auth.uid()));
create policy "members read snapshots" on snapshots for select
  using (client_id in (select c.id from clients c join agency_members m on m.agency_id = c.agency_id where m.user_id = auth.uid()));
