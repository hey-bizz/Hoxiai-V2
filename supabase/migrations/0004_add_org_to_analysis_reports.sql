-- Add org_id to analysis_reports for multi-tenancy
-- This migration adds org_id column and RLS policies

-- Add org_id column
alter table public.analysis_reports
  add column if not exists org_id uuid;

-- Add index for faster queries
create index if not exists analysis_reports_org_site_idx
  on public.analysis_reports(org_id, site_id);

-- Enable RLS
alter table public.analysis_reports enable row level security;

-- Add RLS policy
drop policy if exists "read own org reports" on public.analysis_reports;
create policy "read own org reports"
  on public.analysis_reports for select
  using (public.is_org_member(org_id));

-- Allow service role to insert/update (for analyzer)
drop policy if exists "service can write reports" on public.analysis_reports;
create policy "service can write reports"
  on public.analysis_reports for all
  using (true)
  with check (true);
