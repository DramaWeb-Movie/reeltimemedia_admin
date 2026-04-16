-- Run once in Supabase SQL Editor if `movies` already exists without promotion_banner_url
ALTER TABLE movies ADD COLUMN IF NOT EXISTS promotion_banner_url TEXT;
