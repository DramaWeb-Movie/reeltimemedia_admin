-- Run this in Supabase SQL Editor to remove unused columns from public.movies
-- Columns removed: subtitle_url, director, producer, country, language, content_rating, tags

ALTER TABLE public.movies
  DROP COLUMN IF EXISTS subtitle_url,
  DROP COLUMN IF EXISTS director,
  DROP COLUMN IF EXISTS producer,
  DROP COLUMN IF EXISTS country,
  DROP COLUMN IF EXISTS language,
  DROP COLUMN IF EXISTS content_rating,
  DROP COLUMN IF EXISTS tags;
