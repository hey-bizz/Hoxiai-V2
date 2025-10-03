-- Create table for analysis reports (idempotent)
create table if not exists public.analysis_reports (
  report_id text primary key,
  site_id text not null,
  window_start timestamp not null,
  window_end timestamp not null,
  provider text not null,
  report_json jsonb not null,
  created_at timestamp not null default now(),
  unique (site_id, window_start, window_end)
);

