-- Tenancy & Auth (orgs, user_orgs, sites) with RLS
-- Run in Supabase SQL editor or migration pipeline.

-- Extensions
create extension if not exists pgcrypto;

-- ORGS (tenants)
create table if not exists public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null,
  created_at timestamptz not null default now()
);
alter table public.orgs enable row level security;

-- Roles
do $$ begin
  create type public.org_role as enum ('owner','admin','viewer');
exception when duplicate_object then null; end $$;

-- USER ↔ ORG membership
create table if not exists public.user_orgs (
  user_id uuid not null,
  org_id uuid not null references public.orgs(id) on delete cascade,
  role public.org_role not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (user_id, org_id)
);
alter table public.user_orgs enable row level security;

-- SITES
create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  domain text,
  created_at timestamptz not null default now()
);
alter table public.sites enable row level security;

-- Helper fn: is_org_member
create or replace function public.is_org_member(target uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.user_orgs uo
    where uo.org_id = target and uo.user_id = auth.uid()
  );
$$;

-- Policies: orgs
drop policy if exists "orgs: members can select" on public.orgs;
create policy "orgs: members can select"
on public.orgs for select using (public.is_org_member(id));

drop policy if exists "orgs: creator can insert" on public.orgs;
create policy "orgs: creator can insert"
on public.orgs for insert with check (auth.uid() = created_by);

drop policy if exists "orgs: members can update" on public.orgs;
create policy "orgs: members can update"
on public.orgs for update using (public.is_org_member(id));

-- Policies: user_orgs
drop policy if exists "user_orgs: user can select memberships" on public.user_orgs;
create policy "user_orgs: user can select memberships"
on public.user_orgs for select using (auth.uid() = user_id or public.is_org_member(org_id));

drop policy if exists "user_orgs: members can insert" on public.user_orgs;
create policy "user_orgs: members can insert"
on public.user_orgs for insert with check (auth.uid() = user_id and public.is_org_member(org_id));

drop policy if exists "user_orgs: members can update" on public.user_orgs;
create policy "user_orgs: members can update"
on public.user_orgs for update using (public.is_org_member(org_id));

-- Policies: sites
drop policy if exists "sites: members can select" on public.sites;
create policy "sites: members can select"
on public.sites for select using (public.is_org_member(org_id));

drop policy if exists "sites: members can insert" on public.sites;
create policy "sites: members can insert"
on public.sites for insert with check (public.is_org_member(org_id));

drop policy if exists "sites: members can update" on public.sites;
create policy "sites: members can update"
on public.sites for update using (public.is_org_member(org_id));

-- Indexes
create index if not exists user_orgs_user_org on public.user_orgs (user_id, org_id);
create index if not exists sites_org on public.sites (org_id);

