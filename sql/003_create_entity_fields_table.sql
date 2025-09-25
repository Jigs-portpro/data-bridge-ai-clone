-- 003_create_entity_fields_table.sql
-- Create entity_fields table for managing dynamic field definitions per entity

CREATE TABLE entity_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    field_name VARCHAR(200) NOT NULL,           -- API field name (e.g., 'caller', 'shipper')
    display_name VARCHAR(200) NOT NULL,         -- UI display name (e.g., 'Customer', 'Pick Up Location')
    field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('string', 'number', 'date', 'boolean', 'email', 'time', 'array')),
    is_required BOOLEAN DEFAULT false,
    min_length INTEGER,
    max_length INTEGER,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(entity_id, field_name)               -- Ensure unique field names per entity
);

-- Add indexes for performance
CREATE INDEX idx_entity_fields_entity_id ON entity_fields(entity_id);
CREATE INDEX idx_entity_fields_field_name ON entity_fields(field_name);
CREATE INDEX idx_entity_fields_sort_order ON entity_fields(entity_id, sort_order);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_entity_fields_updated_at BEFORE UPDATE
    ON entity_fields FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();