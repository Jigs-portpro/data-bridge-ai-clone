-- Migration: Add Missing Zod Patterns to PostgreSQL
-- Generated: 2025-01-08
-- Purpose: Migrate 18 missing Zod validation patterns to PostgreSQL for complete validation coverage

-- This script adds the validation rules that exist in Zod schema but are missing from PostgreSQL
-- Run this on your production database to ensure complete validation coverage when using ValidationService

BEGIN;

-- =============================================================================
-- MISSING ZOD PATTERNS - ADD TO POSTGRESQL
-- =============================================================================

-- Get the entity field IDs for the patterns we need to add
-- Note: You may need to adjust the entity_field_id values based on your actual database

-- 1. Email Pattern - For email validation
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message, is_active)
SELECT ef.id, 'regex', '^([^@]+@[^@]+\s*,\s*)*[^@]+@[^@]+$', 'Invalid email format. Please use a valid email address like ''user@example.com''.', true
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE ef.field_name IN ('email', 'billingEmail', 'Email', 'Login Email Address', 'Tender Email Address 1', 'Tender Email Address 2', 'Tender Email Address 3', 'Billing Email', 'Receiver email')
AND NOT EXISTS (
    SELECT 1 FROM entity_validations ev
    WHERE ev.entity_field_id = ef.id
    AND ev.pattern = '^([^@]+@[^@]+\s*,\s*)*[^@]+@[^@]+$'
);

-- 2. Username Pattern - For alphanumeric usernames
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message, is_active)
SELECT ef.id, 'regex', '^[a-z0-9]{3,50}$', 'Username must be 3-50 alphanumeric characters.', true
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE ef.field_name IN ('username', 'Username')
AND NOT EXISTS (
    SELECT 1 FROM entity_validations ev
    WHERE ev.entity_field_id = ef.id
    AND ev.pattern = '^[a-z0-9]{3,50}$'
);

-- 3. US State Pattern - For 2-letter state codes
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message, is_active)
SELECT ef.id, 'regex', '^[A-Z]{2}$', 'State must be a 2-letter code.', true
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE ef.field_name IN ('state', 'State', 'License State', 'License Plate State')
AND NOT EXISTS (
    SELECT 1 FROM entity_validations ev
    WHERE ev.entity_field_id = ef.id
    AND ev.pattern = '^[A-Z]{2}$'
);

-- 4. Country Code Pattern - For 2-letter country codes
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message, is_active)
SELECT ef.id, 'regex', '^[A-Z]{2}$', 'Country must be a 2-letter code.', true
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE ef.field_name IN ('country', 'Country')
AND NOT EXISTS (
    SELECT 1 FROM entity_validations ev
    WHERE ev.entity_field_id = ef.id
    AND ev.pattern = '^[A-Z]{2}$'
);

-- 5. Phone Formatted Pattern - For XXX-XXX-XXXX format
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message, is_active)
SELECT ef.id, 'regex', '^\d{3}-\d{3}-\d{4}$', 'Phone number must be in XXX-XXX-XXXX format.', true
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE ef.field_name IN ('phone', 'Phone', 'Phone Number', 'Mobile', 'Secondary Phone')
AND NOT EXISTS (
    SELECT 1 FROM entity_validations ev
    WHERE ev.entity_field_id = ef.id
    AND ev.pattern = '^\d{3}-\d{3}-\d{4}$'
);


-- 6. Chassis Number Pattern - For chassis identification
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message, is_active)
SELECT ef.id, 'regex', '^[A-Z0-9]{1,50}$', 'Chassis Number must be 1-50 alphanumeric characters.', true
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE ef.field_name IN ('Chassis #', 'chassisNo')
AND NOT EXISTS (
    SELECT 1 FROM entity_validations ev
    WHERE ev.entity_field_id = ef.id
    AND ev.pattern = '^[A-Z0-9]{1,50}$'
);

-- 7. Chassis License Pattern - For chassis license plates
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message, is_active)
SELECT ef.id, 'regex', '^[A-Z]{2,}$', 'Chassis License must be at least 2 letters.', true
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE ef.field_name IN ('License State', 'License Plate State')
AND NOT EXISTS (
    SELECT 1 FROM entity_validations ev
    WHERE ev.entity_field_id = ef.id
    AND ev.pattern = '^[A-Z]{2,}$'
);

-- 8. License Plate Pattern - For general license plates
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message, is_active)
SELECT ef.id, 'regex', '^[A-Z0-9]{1,10}$', 'License Plate must be 1-10 alphanumeric characters.', true
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE ef.field_name IN ('License Plate #', 'licence_plate_number')
AND NOT EXISTS (
    SELECT 1 FROM entity_validations ev
    WHERE ev.entity_field_id = ef.id
    AND ev.pattern = '^[A-Z0-9]{1,10}$'
);

-- 9. License Number Pattern - For license numbers
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message, is_active)
SELECT ef.id, 'regex', '^[A-Z0-9]{1,15}$', 'License Number must be 1-15 alphanumeric characters.', true
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE ef.field_name IN ('License Number', 'licenceNumber')
AND NOT EXISTS (
    SELECT 1 FROM entity_validations ev
    WHERE ev.entity_field_id = ef.id
    AND ev.pattern = '^[A-Z0-9]{1,15}$'
);

-- 10. VIN Pattern - For vehicle identification numbers
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message, is_active)
SELECT ef.id, 'regex', '^[A-Z0-9]{9,17}$', 'VIN must be 9-17 alphanumeric characters.', true
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE ef.field_name IN ('VIN', 'vin')
AND NOT EXISTS (
    SELECT 1 FROM entity_validations ev
    WHERE ev.entity_field_id = ef.id
    AND ev.pattern = '^[A-Z0-9]{9,17}$'
);

-- 11. VIN Pattern Strict - For stricter VIN validation
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message, is_active)
SELECT ef.id, 'regex', '^[A-Z0-9]{10,17}$', 'VIN must be 10-17 alphanumeric characters.', true
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE ef.field_name IN ('VIN', 'vin')
AND ef.field_name NOT IN (
    SELECT ef2.field_name FROM entity_validations ev2
    JOIN entity_fields ef2 ON ev2.entity_field_id = ef2.id
    WHERE ev2.pattern = '^[A-Z0-9]{9,17}$'
)
AND NOT EXISTS (
    SELECT 1 FROM entity_validations ev
    WHERE ev.entity_field_id = ef.id
    AND ev.pattern = '^[A-Z0-9]{10,17}$'
);

-- 12. SCAC Pattern - For Standard Carrier Alpha Code
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message, is_active)
SELECT ef.id, 'regex', '^[A-Z]{4}$', 'SCAC must be 4 uppercase letters.', true
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE ef.field_name IN ('SCAC', 'scac')
AND NOT EXISTS (
    SELECT 1 FROM entity_validations ev
    WHERE ev.entity_field_id = ef.id
    AND ev.pattern = '^[A-Z]{4}$'
);

-- 13. MC Number Pattern - For Motor Carrier numbers
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message, is_active)
SELECT ef.id, 'regex', '^.{2,}$', 'MC Number must be at least 2 characters.', true
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE ef.field_name IN ('MC#', 'MC #', 'Mc number', 'mcNumber')
AND NOT EXISTS (
    SELECT 1 FROM entity_validations ev
    WHERE ev.entity_field_id = ef.id
    AND ev.pattern = '^.{2,}$'
);

-- 14. License State Pattern - For license state names
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message, is_active)
SELECT ef.id, 'regex', '^[A-Za-z\s]{2,50}$', 'License State must be 2-50 characters with letters and spaces.', true
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE ef.field_name IN ('License State', 'licence')
AND NOT EXISTS (
    SELECT 1 FROM entity_validations ev
    WHERE ev.entity_field_id = ef.id
    AND ev.pattern = '^[A-Za-z\s]{2,50}$'
);

-- 15. Sealink Pattern - For sealink numbers
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message, is_active)
SELECT ef.id, 'regex', '^[A-Z0-9]{1,20}$', 'Sealink must be 1-20 alphanumeric characters.', true
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE ef.field_name IN ('Sealink #', 'seaLinkNumber')
AND NOT EXISTS (
    SELECT 1 FROM entity_validations ev
    WHERE ev.entity_field_id = ef.id
    AND ev.pattern = '^[A-Z0-9]{1,20}$'
);

-- 16. Currency Code Pattern - For 3-letter currency codes
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message, is_active)
SELECT ef.id, 'regex', '^[A-Z]{3}$', 'Currency Code must be 3 uppercase letters.', true
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE ef.field_name IN ('Currency Type', 'invoiceCurrencyWithCarrier')
AND NOT EXISTS (
    SELECT 1 FROM entity_validations ev
    WHERE ev.entity_field_id = ef.id
    AND ev.pattern = '^[A-Z]{3}$'
);

-- 17. Chassis Pattern 20 - For chassis size in XX' or XXX' format
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message, is_active)
SELECT ef.id, 'regex', '^[0-9]{2,3}''$', 'Chassis size must be in the format XX'' or XXX''.', true
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE ef.field_name IN ('Chassis Size', 'size')
AND NOT EXISTS (
    SELECT 1 FROM entity_validations ev
    WHERE ev.entity_field_id = ef.id
    AND ev.pattern = '^[0-9]{2,3}''$'
);

-- 18. Social Security Pattern - For social security numbers (flexible pattern)
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message, is_active)
SELECT ef.id, 'regex', '^.*$', 'Social Security Number can contain any characters.', true
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE ef.field_name IN ('Social Security #', 'SSN', 'ssn')
AND NOT EXISTS (
    SELECT 1 FROM entity_validations ev
    WHERE ev.entity_field_id = ef.id
    AND ev.pattern = '^.*$'
);

-- =============================================================================
-- ENUM VALIDATIONS - Add missing Zod enum patterns
-- =============================================================================

-- Yes/No Pattern for boolean-like fields
INSERT INTO entity_validations (entity_field_id, validation_type, enum_values, error_message, is_active)
SELECT ef.id, 'enum', ARRAY['Yes', 'No'], 'Value must be ''Yes'' or ''No''.', true
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE ef.field_name IN ('Hazmat', 'Hot', 'Overweight', 'Liquor', 'Genset', 'Scale', 'Street Turn', 'Domestic', 'EV', 'Waste', 'GDP', 'Rail', 'OOG', 'Bonded', 'Overheight')
AND ef.field_type = 'string'
AND NOT EXISTS (
    SELECT 1 FROM entity_validations ev
    WHERE ev.entity_field_id = ef.id
    AND ev.validation_type = 'enum'
    AND 'Yes' = ANY(ev.enum_values)
);

-- Load Type Pattern
INSERT INTO entity_validations (entity_field_id, validation_type, enum_values, error_message, is_active)
SELECT ef.id, 'enum', ARRAY['Import', 'Export', 'Road'], 'Invalid Load Type.', true
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE ef.field_name IN ('Load Type')
AND NOT EXISTS (
    SELECT 1 FROM entity_validations ev
    WHERE ev.entity_field_id = ef.id
    AND ev.validation_type = 'enum'
    AND 'Import' = ANY(ev.enum_values)
);

-- Trailer Type Pattern
INSERT INTO entity_validations (entity_field_id, validation_type, enum_values, error_message, is_active)
SELECT ef.id, 'enum', ARRAY['Dry Van', 'Reefer', 'Flat Bed', 'Drop Deck', 'Low Boy', 'Double Drop Deck'], 'Invalid Trailer Type.', true
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE ef.field_name IN ('Trailer Type')
AND NOT EXISTS (
    SELECT 1 FROM entity_validations ev
    WHERE ev.entity_field_id = ef.id
    AND ev.validation_type = 'enum'
    AND 'Dry Van' = ANY(ev.enum_values)
);

-- Trailer Size Pattern
INSERT INTO entity_validations (entity_field_id, validation_type, enum_values, error_message, is_active)
SELECT ef.id, 'enum', ARRAY['26''', '40''', '45''', '48''', '53'''], 'Invalid Trailer Size.', true
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE ef.field_name IN ('Trailer Size')
AND NOT EXISTS (
    SELECT 1 FROM entity_validations ev
    WHERE ev.entity_field_id = ef.id
    AND ev.validation_type = 'enum'
    AND '26''' = ANY(ev.enum_values)
);

-- System Roles Pattern (for Users entity)
INSERT INTO entity_validations (entity_field_id, validation_type, enum_values, error_message, is_active)
SELECT ef.id, 'enum', ARRAY['Admin', 'CSR', 'Sales Agent', 'Mechanics'], 'Invalid System Role.', true
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE ef.field_name IN ('System Roles*', 'role')
AND NOT EXISTS (
    SELECT 1 FROM entity_validations ev
    WHERE ev.entity_field_id = ef.id
    AND ev.validation_type = 'enum'
    AND 'Admin' = ANY(ev.enum_values)
);

-- Organization Type Pattern
INSERT INTO entity_validations (entity_field_id, validation_type, enum_values, error_message, is_active)
SELECT ef.id, 'enum', ARRAY['ALL', 'CUSTOMER', 'TERMINAL', 'WAREHOUSE', 'CONTAINERRETURN', 'CHASSISPICK', 'CHASSISTERMINATION'], 'Invalid Organization Type.', true
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE ef.field_name IN ('Organization Type')
AND NOT EXISTS (
    SELECT 1 FROM entity_validations ev
    WHERE ev.entity_field_id = ef.id
    AND ev.validation_type = 'enum'
    AND 'ALL' = ANY(ev.enum_values)
);

-- =============================================================================
-- COMMIT TRANSACTION
-- =============================================================================

COMMIT;

-- =============================================================================
-- VERIFICATION QUERIES (Run these after the migration)
-- =============================================================================

-- Check how many validation rules were added
SELECT
    'Total validation rules added' as description,
    COUNT(*) as count
FROM entity_validations
WHERE created_at >= CURRENT_DATE;

-- Check validation rules by type
SELECT
    validation_type,
    COUNT(*) as count
FROM entity_validations
WHERE created_at >= CURRENT_DATE
GROUP BY validation_type;

-- Check which entities now have validation rules
SELECT
    e.name as entity_name,
    COUNT(ev.*) as validation_rules_count
FROM entities e
LEFT JOIN entity_fields ef ON e.id = ef.entity_id
LEFT JOIN entity_validations ev ON ef.id = ev.entity_field_id
WHERE ev.created_at >= CURRENT_DATE
GROUP BY e.name
ORDER BY validation_rules_count DESC;

-- =============================================================================
-- NOTES FOR PRODUCTION DEPLOYMENT
-- =============================================================================

/*
DEPLOYMENT INSTRUCTIONS:

1. BACKUP YOUR DATABASE FIRST:
   pg_dump -h your-host -U your-user -d your-database > backup_before_validation_migration.sql

2. TEST IN STAGING ENVIRONMENT:
   - Run this script in your staging environment first
   - Test ValidationService to ensure all patterns work correctly
   - Verify that no existing validation behavior is broken

3. PRODUCTION DEPLOYMENT:
   - Run during maintenance window
   - Monitor for any validation errors after deployment
   - Have rollback plan ready if issues occur

4. POST-DEPLOYMENT VERIFICATION:
   - Run the verification queries at the end of this script
   - Test key entities (Load, Organization, Carrier) with ValidationService
   - Check application logs for any validation errors

5. PERFORMANCE MONITORING:
   - Monitor ValidationService response times
   - Ensure caching is working properly
   - Watch for any database performance impact

6. CLEANUP (After Successful Deployment):
   - Remove legacy Zod patterns from src/schema/index.ts
   - Update AI flows to use PostgreSQL validation
   - Archive this migration script

EXPECTED RESULTS:
- 18 new regex validation patterns added
- 6 new enum validation patterns added
- Complete validation coverage matching Zod schemas
- Zero validation functionality lost in migration
- Improved validation coverage with PostgreSQL-only patterns

ROLLBACK PROCEDURE (if needed):
- Restore from backup taken in step 1
- Revert ValidationService integration in application code
- Re-enable Zod schema validation temporarily

SUPPORT:
- Monitor console logs for validation source tracking
- Use cache management UI to clear validation caches if needed
- Check /admin/cache-management for cache status
*/