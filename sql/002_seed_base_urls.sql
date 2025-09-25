-- Seed base_urls table with initial data
-- URLs based on PortPro API endpoints from /setup page (src/app/setup/page.tsx)

-- Insert seed data (use ON CONFLICT to avoid duplicates)
INSERT INTO base_urls (name, url, description, is_active) VALUES
  ('Development API', 'https://new-api.dev.portpro.io', 'PortPro Development API environment', true),
  ('Production API', 'https://api.axle.network', 'Production API (Axle Network)', false),
  ('MedLog API', 'https://api.medlog.portpro.io', 'PortPro MedLog API endpoint', false),
  ('Forward Intermodal API', 'https://api.forwardintermodal.portpro.io', 'PortPro Forward Intermodal API endpoint', false),
  ('Local Development', 'http://localhost:3000', 'Local development server', false)
ON CONFLICT (name) DO UPDATE SET
  url = EXCLUDED.url,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Verify the data was inserted
SELECT * FROM base_urls ORDER BY id;