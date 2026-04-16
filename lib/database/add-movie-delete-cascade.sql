-- Run once in Supabase SQL Editor to ensure deleting a movie also deletes related sales/payments.
-- Safe for environments where payments.movie_id may not exist yet.

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS movie_id UUID;

ALTER TABLE payments
DROP CONSTRAINT IF EXISTS payments_movie_id_fkey;

ALTER TABLE payments
ADD CONSTRAINT payments_movie_id_fkey
FOREIGN KEY (movie_id)
REFERENCES movies(id)
ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_payments_movie_id ON payments(movie_id);
