-- Run once in Supabase SQL Editor if `movies` exists without is_promotion_hero
ALTER TABLE movies
ADD COLUMN IF NOT EXISTS is_promotion_hero BOOLEAN NOT NULL DEFAULT FALSE;
