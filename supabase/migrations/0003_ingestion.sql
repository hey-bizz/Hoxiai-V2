-- Log Ingestion schema (connections, uploads, raw, normalized, aggregates)
-- Requires: 0002_tenancy.sql (is_org_member function)

-- OAuth connections per site
create table if not exists public.oauth_connections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  site_id uuid not null,
  provider text not null check (provider in ('vercel','netlify')),
  access_token_enc text not null,
  refresh_token_enc text,
  expires_at timestamptz,
  meta jsonb,
  created_at timestamptz not null default now()
);
alter table public.oauth_connections enable row level security;
drop policy if exists "read own org connections" on public.oauth_connections;
create policy "read own org connections" on public.oauth_connections for select using (public.is_org_member(org_id));
create index if not exists oauth_connections_org_site_idx on public.oauth_connections(org_id, site_id);

-- Uploads
do $$ begin
  create type public.upload_status as enum ('pending','validating','parsing','done','error');
exception when duplicate_object then null; end $$;

create table if not exists public.ingest_uploads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  site_id uuid not null,
  status public.upload_status not null default 'pending',
  storage_key text not null,
  bytes bigint,
  file_ext text,
  provider_hint text,
  error_text text,
  created_at timestamptz not null default now()
);
alter table public.ingest_uploads enable row level security;
drop policy if exists "read own org uploads" on public.ingest_uploads;
create policy "read own org uploads" on public.ingest_uploads for select using (public.is_org_member(org_id));
create index if not exists ingest_uploads_org_site_idx on public.ingest_uploads(org_id, site_id);

-- Raw objects (oauth or upload)
do $$ begin
  create type public.ingest_source as enum ('oauth','upload');
exception when duplicate_object then null; end $$;

create table if not exists public.ingest_raw (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  site_id uuid not null,
  source public.ingest_source not null,
  storage_key text not null,
  created_at timestamptz not null default now()
);
alter table public.ingest_raw enable row level security;
drop policy if exists "read own org raw" on public.ingest_raw;
create policy "read own org raw" on public.ingest_raw for select using (public.is_org_member(org_id));
create index if not exists ingest_raw_org_site_idx on public.ingest_raw(org_id, site_id);

-- Normalized entries (wide table for queries)
create table if not exists public.normalized_entries (
  id bigserial primary key,
  org_id uuid not null,
  site_id uuid not null,
  ts timestamptz not null,
  ip text,
  ua text,
  method text,
  path text,
  status int,
  bytes bigint,
  referer text,
  provider jsonb,
  created_at timestamptz not null default now()
);
alter table public.normalized_entries enable row level security;
drop policy if exists "read own org normalized" on public.normalized_entries;
create policy "read own org normalized" on public.normalized_entries for select using (public.is_org_member(org_id));
create index if not exists nrm_org_site_ts_idx on public.normalized_entries(org_id, site_id, ts);

-- Aggregates (precomputed blobs by window)
create table if not exists public.aggregates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  site_id uuid not null,
  window_start timestamptz not null,
  window_end timestamptz not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.aggregates enable row level security;
drop policy if exists "read own org aggregates" on public.aggregates;
create policy "read own org aggregates" on public.aggregates for select using (public.is_org_member(org_id));
create unique index if not exists agg_unique_window on public.aggregates(org_id, site_id, window_start, window_end);

