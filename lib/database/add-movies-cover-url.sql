-- Run once in Supabase SQL Editor if `movies` already exists without cover_url
ALTER TABLE movies ADD COLUMN IF NOT EXISTS cover_url TEXT;
