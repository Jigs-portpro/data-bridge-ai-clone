-- Add upload_type column to entities table for setup page compatibility
-- This column stores the upload type (BULK_UPLOAD or SINGLE_ROW_UPLOAD)

ALTER TABLE entities
ADD COLUMN upload_type VARCHAR(50) DEFAULT 'SINGLE_ROW_UPLOAD' CHECK (upload_type IN ('BULK_UPLOAD', 'SINGLE_ROW_UPLOAD'));

-- Add comment to document the new column
COMMENT ON COLUMN entities.upload_type IS 'Upload type for this entity (BULK_UPLOAD or SINGLE_ROW_UPLOAD)';

-- Update existing entities to have the default upload type
UPDATE entities SET upload_type = 'SINGLE_ROW_UPLOAD' WHERE upload_type IS NULL;