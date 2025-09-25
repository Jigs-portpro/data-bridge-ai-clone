-- Create base_urls table
CREATE TABLE IF NOT EXISTS base_urls (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  url VARCHAR(500) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create index on name for faster lookups
CREATE INDEX IF NOT EXISTS idx_base_urls_name ON base_urls(name);

-- Create index on is_active for filtering
CREATE INDEX IF NOT EXISTS idx_base_urls_active ON base_urls(is_active);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_base_urls_updated_at ON base_urls;
CREATE TRIGGER update_base_urls_updated_at
  BEFORE UPDATE ON base_urls
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();