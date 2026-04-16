-- Run this in Supabase SQL Editor to create the movies table (required for uploads)
-- If subscription_plans doesn't exist, create it first:

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  billing_period VARCHAR(20) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS movies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  genre TEXT,
  release_date DATE,
  duration INTEGER,
  thumbnail_url TEXT,
  cover_url TEXT,
  promotion_banner_url TEXT,
  is_promotion_hero BOOLEAN NOT NULL DEFAULT FALSE,
  video_url TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  type VARCHAR(50) NOT NULL DEFAULT 'single',
  price DECIMAL(10, 2),
  free_episodes_count INTEGER,
  subscription_plan_id UUID REFERENCES subscription_plans(id),
  total_episodes INTEGER,
  "cast" TEXT,
  trailer_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movies_status ON movies(status);
CREATE INDEX IF NOT EXISTS idx_movies_created_at ON movies(created_at);

-- Episodes for series (video per episode)
CREATE TABLE IF NOT EXISTS series_episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  episode_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL DEFAULT '',
  duration INTEGER,
  video_url TEXT,
  is_free_preview BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(movie_id, episode_number)
);

CREATE INDEX IF NOT EXISTS idx_series_episodes_movie_id ON series_episodes(movie_id);
