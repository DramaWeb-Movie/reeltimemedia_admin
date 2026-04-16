-- Run once in Supabase SQL Editor: simplify artwork to only two fields.
-- Final schema should keep ONLY: thumbnail_url, cover_url.

-- 1) Backfill the two canonical fields from any existing responsive columns if they still exist.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'thumbnail_laptop_url'
  ) THEN
    EXECUTE '
      UPDATE movies
      SET thumbnail_url = COALESCE(thumbnail_url, thumbnail_laptop_url, thumbnail_phone_url, cover_url)
      WHERE thumbnail_url IS NULL
    ';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'movies' AND column_name = 'cover_phone_url'
  ) THEN
    EXECUTE '
      UPDATE movies
      SET cover_url = COALESCE(cover_url, cover_phone_url, cover_laptop_url, thumbnail_url)
      WHERE cover_url IS NULL
    ';
  END IF;
END $$;

-- Drop any view that still references the old columns (e.g. from an earlier migration run).
DROP VIEW IF EXISTS movies_artwork_simple;

-- 2) Drop responsive columns.
ALTER TABLE movies DROP COLUMN IF EXISTS thumbnail_phone_url;
ALTER TABLE movies DROP COLUMN IF EXISTS thumbnail_laptop_url;
ALTER TABLE movies DROP COLUMN IF EXISTS cover_phone_url;
ALTER TABLE movies DROP COLUMN IF EXISTS cover_laptop_url;
