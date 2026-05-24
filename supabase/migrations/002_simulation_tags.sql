-- Add tags array column to simulations table
ALTER TABLE simulations
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- Optional: index for faster filtering by tag
CREATE INDEX IF NOT EXISTS simulations_tags_gin_idx
  ON simulations USING gin(tags);
