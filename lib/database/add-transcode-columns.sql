-- Add transcoding fields to support FastAPI worker status updates.
-- Run this in Supabase SQL editor.

alter table if exists public.movies
  add column if not exists encoding_status text default 'pending',
  add column if not exists encoding_error text,
  add column if not exists hls_manifest_url text;

alter table if exists public.series_episodes
  add column if not exists encoding_status text default 'pending',
  add column if not exists encoding_error text,
  add column if not exists hls_manifest_url text;

create index if not exists idx_movies_encoding_status on public.movies (encoding_status);
create index if not exists idx_series_episodes_encoding_status on public.series_episodes (encoding_status);
