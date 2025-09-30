-- Entity Validations Table for Advanced Validation Rules
-- Basic validation (required, min_length, max_length) stays in entity_fields table
-- Advanced validation (regex, enum, lookup) goes in this separate table
CREATE TABLE entity_validations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_field_id UUID NOT NULL REFERENCES entity_fields(id) ON DELETE CASCADE,
    validation_type VARCHAR(50) NOT NULL CHECK (validation_type IN ('regex', 'enum', 'lookup')),
    pattern VARCHAR(1000), -- Regex pattern for validation (when validation_type = 'regex')
    enum_values JSONB, -- Array of allowed values (when validation_type = 'enum')
    lookup_id VARCHAR(100), -- Lookup data source ID (when validation_type = 'lookup')
    lookup_field VARCHAR(200), -- Field name in lookup data (when validation_type = 'lookup')
    error_message VARCHAR(500), -- Custom error message for validation failures
    is_active BOOLEAN DEFAULT true, -- Enable/disable validation rule
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure only ONE validation rule per field (no mixing validation types)
    UNIQUE(entity_field_id),

    -- Ensure appropriate fields are set based on validation type
    CHECK (
        (validation_type = 'regex' AND pattern IS NOT NULL) OR
        (validation_type = 'enum' AND enum_values IS NOT NULL) OR
        (validation_type = 'lookup' AND lookup_id IS NOT NULL AND lookup_field IS NOT NULL)
    )
);

-- Indexes for performance
CREATE INDEX idx_entity_validations_entity_field_id ON entity_validations(entity_field_id);
CREATE INDEX idx_entity_validations_validation_type ON entity_validations(validation_type);
CREATE INDEX idx_entity_validations_active ON entity_validations(is_active);
CREATE INDEX idx_entity_validations_lookup_id ON entity_validations(lookup_id) WHERE lookup_id IS NOT NULL;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_entity_validations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_entity_validations_updated_at
    BEFORE UPDATE ON entity_validations
    FOR EACH ROW
    EXECUTE FUNCTION update_entity_validations_updated_at();

-- Comments for documentation
COMMENT ON TABLE entity_validations IS 'Advanced validation rules for entity fields (regex, enum, lookup)';
COMMENT ON COLUMN entity_validations.validation_type IS 'Type of validation: regex, enum, lookup';
COMMENT ON COLUMN entity_validations.pattern IS 'Regex pattern for string validation (when validation_type = regex)';
COMMENT ON COLUMN entity_validations.enum_values IS 'JSON array of allowed values (when validation_type = enum)';
COMMENT ON COLUMN entity_validations.lookup_id IS 'Lookup data source ID (when validation_type = lookup)';
COMMENT ON COLUMN entity_validations.lookup_field IS 'Field name within lookup data (when validation_type = lookup)';