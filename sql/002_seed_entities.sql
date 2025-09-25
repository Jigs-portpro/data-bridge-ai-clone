-- Seed Data Migration for Entities (Feature 1)
-- This script seeds the entities table with basic entity data from exportEntities.json
-- Only includes core entity information (no fields yet - those will be in Feature 2)

-- Insert basic entity records from exportEntities.json
INSERT INTO entities (entity_key, name, api_endpoint) VALUES
    ('load', 'Load', '/tms/uploadLoad'),
    ('carrier', 'Carrier', '/createDrayosCarrier'),
    ('tariff', 'Tariff', '/rate-engine/rate-record/bulk-upload'),
    ('trailers', 'Trailers', '/bulkupload/equipments'),
    ('truck_owner', 'Truck Owner', '/bulkupload/fleetTruckOwners'),
    ('trucks', 'Trucks', '/bulkupload/equipments'),
    ('users', 'Users', '/bulkupload/fleetManager'),
    ('charge_profile', 'Charge Profile', '/rate-engine/charge-templates/bulk-upload'),
    ('chassis_owner', 'Chassis Owner', '/bulkupload/chassisowner'),
    ('chassis', 'Chassis', '/bulkupload/chassis'),
    ('people', 'People', '/carrier/addFleetManager'),
    ('organization', 'Organization', '/bulkupload/customer'),
    ('drivers', 'Drivers', '/bulkupload/driver'),
    ('perdiem', 'PerDiem', '/tms/addFreeContainerReturn')
ON CONFLICT (entity_key) DO UPDATE SET
    name = EXCLUDED.name,
    api_endpoint = EXCLUDED.api_endpoint,
    updated_at = CURRENT_TIMESTAMP;

-- Add comments to track migration status
COMMENT ON TABLE entities IS 'Entities table seeded with 14 basic entities from exportEntities.json (Feature 1 complete)';

-- Display success message
DO $$
BEGIN
    RAISE NOTICE 'Successfully seeded % entities from exportEntities.json', (SELECT COUNT(*) FROM entities);
    RAISE NOTICE 'Entity keys: %', (SELECT STRING_AGG(entity_key, ', ' ORDER BY entity_key) FROM entities);
END
$$;