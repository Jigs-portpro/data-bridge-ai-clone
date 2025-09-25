-- Create Entities Table Only (Feature 1)
-- This script creates ONLY the entities table per requirements document
-- Other tables will be created in separate features

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create entities table (matches requirements document exactly)
CREATE TABLE entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_key VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    api_endpoint VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_entities_entity_key ON entities(entity_key);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on changes
CREATE TRIGGER update_entities_updated_at BEFORE UPDATE ON entities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments to document the schema
COMMENT ON TABLE entities IS 'Stores entity definitions for the dynamic entity management system (Feature 1)';

COMMENT ON COLUMN entities.entity_key IS 'Unique identifier key for the entity (e.g., load, carrier)';
COMMENT ON COLUMN entities.name IS 'Human-readable display name for the entity';
COMMENT ON COLUMN entities.api_endpoint IS 'API endpoint path for this entity';