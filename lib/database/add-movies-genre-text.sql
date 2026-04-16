-- Widen `genre` to TEXT for comma-separated multi-genre values.
--
-- `search_vector` cannot be a GENERATED column if the expression uses `to_tsvector`
-- (it is STABLE, not IMMUTABLE). Use a normal `tsvector` column + trigger instead.
--
-- Re-run safe: drops trigger/function/index/column first, then rebuilds.

DROP TRIGGER IF EXISTS movies_search_vector_t ON movies;
DROP FUNCTION IF EXISTS movies_set_search_vector();

DROP INDEX IF EXISTS movies_search_vector_idx;
DROP INDEX IF EXISTS idx_movies_search_vector;

ALTER TABLE movies DROP COLUMN IF EXISTS search_vector;

ALTER TABLE movies ALTER COLUMN genre TYPE TEXT;

ALTER TABLE movies ADD COLUMN search_vector tsvector;

UPDATE movies
SET
  search_vector = to_tsvector(
    'simple',
    concat_ws(
      ' ',
      coalesce(title, ''),
      coalesce(description, ''),
      coalesce(genre, ''),
      coalesce("cast", '')
    )
  );

CREATE OR REPLACE FUNCTION movies_set_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := to_tsvector(
    'simple',
    concat_ws(
      ' ',
      coalesce(NEW.title, ''),
      coalesce(NEW.description, ''),
      coalesce(NEW.genre, ''),
      coalesce(NEW."cast", '')
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER movies_search_vector_t
  BEFORE INSERT OR UPDATE OF title, description, genre, "cast"
  ON movies
  FOR EACH ROW
  EXECUTE PROCEDURE movies_set_search_vector();

CREATE INDEX IF NOT EXISTS movies_search_vector_idx ON movies USING gin (search_vector);
