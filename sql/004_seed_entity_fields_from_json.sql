-- 004_seed_entity_fields_from_json.sql
-- Generated from cleaned exportEntities.json (duplicates removed)
-- Maps: sourceColumn → field_name, name → display_name

-- First ensure entities exist
INSERT INTO entities (entity_key, name, api_endpoint)
VALUES ('load', 'Load', '/tms/uploadLoad')
ON CONFLICT (entity_key) DO UPDATE SET
  name = EXCLUDED.name,
  api_endpoint = EXCLUDED.api_endpoint;

INSERT INTO entities (entity_key, name, api_endpoint)
VALUES ('carrier', 'Carrier', '/createDrayosCarrier')
ON CONFLICT (entity_key) DO UPDATE SET
  name = EXCLUDED.name,
  api_endpoint = EXCLUDED.api_endpoint;

INSERT INTO entities (entity_key, name, api_endpoint)
VALUES ('tariff', 'Tariff', 'rate-engine/rate-record/bulk-upload')
ON CONFLICT (entity_key) DO UPDATE SET
  name = EXCLUDED.name,
  api_endpoint = EXCLUDED.api_endpoint;

INSERT INTO entities (entity_key, name, api_endpoint)
VALUES ('trailers', 'Trailers', '/bulkupload/equipments')
ON CONFLICT (entity_key) DO UPDATE SET
  name = EXCLUDED.name,
  api_endpoint = EXCLUDED.api_endpoint;

INSERT INTO entities (entity_key, name, api_endpoint)
VALUES ('truck_owner', 'Truck Owner', '/bulkupload/fleetTruckOwners')
ON CONFLICT (entity_key) DO UPDATE SET
  name = EXCLUDED.name,
  api_endpoint = EXCLUDED.api_endpoint;

INSERT INTO entities (entity_key, name, api_endpoint)
VALUES ('trucks', 'Trucks', '/bulkupload/equipments')
ON CONFLICT (entity_key) DO UPDATE SET
  name = EXCLUDED.name,
  api_endpoint = EXCLUDED.api_endpoint;

INSERT INTO entities (entity_key, name, api_endpoint)
VALUES ('users', 'Users', '/bulkupload/fleetManager')
ON CONFLICT (entity_key) DO UPDATE SET
  name = EXCLUDED.name,
  api_endpoint = EXCLUDED.api_endpoint;

INSERT INTO entities (entity_key, name, api_endpoint)
VALUES ('charge_profile', 'Charge Profile', '/rate-engine/charge-templates/bulk-upload')
ON CONFLICT (entity_key) DO UPDATE SET
  name = EXCLUDED.name,
  api_endpoint = EXCLUDED.api_endpoint;

INSERT INTO entities (entity_key, name, api_endpoint)
VALUES ('chassis_owner', 'Chassis Owner', '/bulkupload/chassisowner')
ON CONFLICT (entity_key) DO UPDATE SET
  name = EXCLUDED.name,
  api_endpoint = EXCLUDED.api_endpoint;

INSERT INTO entities (entity_key, name, api_endpoint)
VALUES ('chassis', 'Chassis', '/bulkupload/chassis')
ON CONFLICT (entity_key) DO UPDATE SET
  name = EXCLUDED.name,
  api_endpoint = EXCLUDED.api_endpoint;

INSERT INTO entities (entity_key, name, api_endpoint)
VALUES ('people', 'People', '/carrier/addFleetManager')
ON CONFLICT (entity_key) DO UPDATE SET
  name = EXCLUDED.name,
  api_endpoint = EXCLUDED.api_endpoint;

INSERT INTO entities (entity_key, name, api_endpoint)
VALUES ('organization', 'Organization', '/bulkupload/customer')
ON CONFLICT (entity_key) DO UPDATE SET
  name = EXCLUDED.name,
  api_endpoint = EXCLUDED.api_endpoint;

INSERT INTO entities (entity_key, name, api_endpoint)
VALUES ('drivers', 'Drivers', '/bulkupload/driver')
ON CONFLICT (entity_key) DO UPDATE SET
  name = EXCLUDED.name,
  api_endpoint = EXCLUDED.api_endpoint;

INSERT INTO entities (entity_key, name, api_endpoint)
VALUES ('perdiem', 'PerDiem', '/tms/addFreeContainerReturn')
ON CONFLICT (entity_key) DO UPDATE SET
  name = EXCLUDED.name,
  api_endpoint = EXCLUDED.api_endpoint;

-- Insert entity fields
-- Fields for Load (Load → load)
INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'caller', 'Customer', 'string', true, 2, 100, 1
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'type_of_load', 'Load Type', 'string', true, null, 50, 2
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'shipper', 'Pick Up Location', 'string', true, null, 200, 3
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'containerNo', 'Container', 'string', false, null, 20, 4
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'consignee', 'Delivery City/State', 'string', true, null, 100, 5
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'containerSize', 'Container Size', 'string', false, null, 10, 6
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'containerType', 'Container Type', 'string', false, null, 10, 7
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'weightLBS', 'Weight LBS', 'number', false, 1, 50, 8
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'weightKGS', 'Weight KGS', 'number', false, 1, 50, 9
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'documents', 'Delivery Order', 'string', false, null, 50, 10
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'containerOwner', 'Owner', 'string', false, null, 100, 11
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'bookingNo', 'Booking #', 'string', false, null, 50, 12
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'callerbillLandingNo', 'Master Bill Of Lading', 'string', false, null, 50, 13
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'vessel.eta', 'Container ETA', 'date', false, null, null, 14
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'lastFreeDay', 'Last Free Day', 'date', false, null, null, 15
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'emptyOrigin', 'Container Return', 'string', false, null, 200, 16
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'chassisPick', 'Hook Chassis Location', 'string', false, null, 200, 17
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'chassisTermination', 'Terminate Chassis Location', 'string', false, null, 200, 18
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'secondaryReferenceNo', 'Reference #', 'string', false, null, 50, 19
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'emptyDay', 'Empty Date', 'date', false, null, null, 20
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'return', 'Date Returned', 'date', false, null, null, 21
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'pickupTimes', 'Pick Up Apt From', 'date', false, null, null, 22
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'deliveryTimes', 'Delivery Apt From', 'date', false, null, null, 23
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'containerAvailableDay', 'ERD', 'date', false, null, null, 24
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'freeReturnDate', 'Per Diem Free Day', 'date', false, null, null, 25
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'loadTime', 'Loaded Date', 'date', false, null, null, 26
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'billingDate', 'Billing Date', 'date', false, null, null, 27
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'chassisNo', 'Chassis #', 'string', false, null, 20, 28
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'chassisOwner', 'Chassis Owner', 'string', false, null, 100, 29
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'chassisSize', 'Chassis Size', 'string', false, null, 10, 30
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'chassisType', 'Chassis Type', 'string', false, null, 10, 31
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'cutOff', 'Cut Off Date', 'date', false, null, null, 32
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'doNo', 'House Bill Of Lading', 'string', false, null, 50, 33
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'callerPONo', 'Pick Up #', 'string', false, null, 50, 34
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'purchaseOrderNo', 'Purchase Order #', 'string', false, null, 50, 35
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'sealNo', 'Seal #', 'string', false, null, 20, 36
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'shipmentNo', 'Shipment #', 'string', false, null, 50, 37
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'temperature', 'Temperature', 'number', false, null, null, 38
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'terminal', 'Branch', 'string', false, null, 100, 39
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'deliveryOrderNo', 'Vessel Name', 'string', false, null, 100, 40
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'releaseNo', 'Voyage', 'string', false, null, 50, 41
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'commodity', 'Commodity', 'string', false, null, 100, 42
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'pieces', 'Pieces', 'number', false, null, null, 43
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'hazmat', 'Hazmat', 'boolean', false, null, null, 44
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'hot', 'Hot', 'boolean', false, null, null, 45
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'overweight', 'Overweight', 'boolean', false, null, null, 46
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'routes', 'Routes', 'string', false, null, 100, 47
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'isGenset', 'Genset', 'boolean', false, null, null, 48
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'liquor', 'Liquor', 'boolean', false, null, null, 49
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'overheight', 'Overheight', 'boolean', false, null, null, 50
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'isStreetTurn', 'Street Turn', 'boolean', false, null, null, 51
FROM entities e WHERE e.entity_key = 'load';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'scale', 'Scale', 'boolean', false, null, null, 52
FROM entities e WHERE e.entity_key = 'load';


-- Fields for Carrier (Carrier → carrier)
INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'company_name', 'Company Name', 'string', true, 2, 100, 1
FROM entities e WHERE e.entity_key = 'carrier';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'contactName', 'Contact Name', 'string', true, 2, 100, 2
FROM entities e WHERE e.entity_key = 'carrier';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'address', 'Address', 'string', true, 5, 200, 3
FROM entities e WHERE e.entity_key = 'carrier';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'country', 'Country', 'string', true, null, null, 4
FROM entities e WHERE e.entity_key = 'carrier';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'state', 'State', 'string', true, null, null, 5
FROM entities e WHERE e.entity_key = 'carrier';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'city', 'City', 'string', true, 2, 50, 6
FROM entities e WHERE e.entity_key = 'carrier';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'zip', 'ZIP', 'string', true, null, null, 7
FROM entities e WHERE e.entity_key = 'carrier';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'email', 'Login Email Address', 'string', true, null, null, 8
FROM entities e WHERE e.entity_key = 'carrier';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'tenderEmail', 'Tender Email Address 1', 'string', true, null, null, 9
FROM entities e WHERE e.entity_key = 'carrier';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Tender Email Address 2', 'Tender Email Address 2', 'string', false, null, null, 10
FROM entities e WHERE e.entity_key = 'carrier';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Tender Email Address 3', 'Tender Email Address 3', 'string', false, null, null, 11
FROM entities e WHERE e.entity_key = 'carrier';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'mobile', 'Phone Number', 'string', true, null, null, 12
FROM entities e WHERE e.entity_key = 'carrier';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'scac', 'SCAC', 'string', false, null, null, 13
FROM entities e WHERE e.entity_key = 'carrier';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'mcNumber', 'MC#', 'string', false, null, null, 14
FROM entities e WHERE e.entity_key = 'carrier';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'USDOTNumber', 'USDOT Number', 'string', false, null, null, 15
FROM entities e WHERE e.entity_key = 'carrier';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'External ID', 'External ID', 'string', false, null, 50, 16
FROM entities e WHERE e.entity_key = 'carrier';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'terminals', 'Branch 1', 'string', false, null, 50, 17
FROM entities e WHERE e.entity_key = 'carrier';


-- Fields for Tariff (Tariff → tariff)
INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Tariff Name', 'Tariff Name', 'string', true, 2, 100, 1
FROM entities e WHERE e.entity_key = 'tariff';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Effective Start Date', 'Effective Start Date', 'date', false, null, null, 2
FROM entities e WHERE e.entity_key = 'tariff';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Effective End Date', 'Effective End Date', 'date', false, null, null, 3
FROM entities e WHERE e.entity_key = 'tariff';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Load Type', 'Load Type', 'string', false, null, null, 4
FROM entities e WHERE e.entity_key = 'tariff';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Branch', 'Branch', 'string', false, null, null, 5
FROM entities e WHERE e.entity_key = 'tariff';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Customer', 'Customer', 'string', false, 2, 100, 6
FROM entities e WHERE e.entity_key = 'tariff';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Pick Up Location', 'Pick Up Location', 'string', false, 2, 100, 7
FROM entities e WHERE e.entity_key = 'tariff';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Delivery Location', 'Delivery Location', 'string', false, 2, 100, 8
FROM entities e WHERE e.entity_key = 'tariff';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Return Location', 'Return Location', 'string', false, 2, 100, 9
FROM entities e WHERE e.entity_key = 'tariff';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Charge Profile', 'Charge Profile', 'string', false, 2, 100, 10
FROM entities e WHERE e.entity_key = 'tariff';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'vendorType', 'Vendor', 'string', false, null, null, 11
FROM entities e WHERE e.entity_key = 'tariff';


-- Fields for Trailers (Trailers → trailers)
INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'equipmentID', 'Trailer #', 'string', true, null, null, 1
FROM entities e WHERE e.entity_key = 'trailers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'year', 'Year', 'string', false, null, null, 2
FROM entities e WHERE e.entity_key = 'trailers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'make', 'Make', 'string', false, null, 50, 3
FROM entities e WHERE e.entity_key = 'trailers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'model', 'Model', 'string', false, null, 50, 4
FROM entities e WHERE e.entity_key = 'trailers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'AID', 'AID', 'date', false, null, null, 5
FROM entities e WHERE e.entity_key = 'trailers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'ITD', 'ITD', 'date', false, null, null, 6
FROM entities e WHERE e.entity_key = 'trailers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'vin', 'VIN', 'string', false, null, null, 7
FROM entities e WHERE e.entity_key = 'trailers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'reg_expiration', 'Registration Expiration', 'date', false, null, null, 8
FROM entities e WHERE e.entity_key = 'trailers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'inspection_exp', 'Inspection Expiration', 'date', false, null, null, 9
FROM entities e WHERE e.entity_key = 'trailers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'licence_plate_state', 'License Plate State', 'string', false, null, null, 10
FROM entities e WHERE e.entity_key = 'trailers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'licence_plate_number', 'License Plate #', 'string', false, null, null, 11
FROM entities e WHERE e.entity_key = 'trailers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'hut_exp', 'HUT Expiration', 'date', false, null, null, 12
FROM entities e WHERE e.entity_key = 'trailers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'trailerType', 'Trailer Type', 'string', false, null, 50, 13
FROM entities e WHERE e.entity_key = 'trailers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'size', 'Trailer Size', 'string', false, null, null, 14
FROM entities e WHERE e.entity_key = 'trailers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Branch', 'Branch', 'string', true, null, 100, 15
FROM entities e WHERE e.entity_key = 'trailers';


-- Fields for Truck Owner (Truck Owner → truck_owner)
INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'company_name', 'Company Name', 'string', true, 2, 100, 1
FROM entities e WHERE e.entity_key = 'truck_owner';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'address', 'Address', 'string', true, 5, 200, 2
FROM entities e WHERE e.entity_key = 'truck_owner';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'DOTNumber', 'DOT #', 'string', false, 2, 15, 3
FROM entities e WHERE e.entity_key = 'truck_owner';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'MCNumber', 'MC #', 'string', false, null, null, 4
FROM entities e WHERE e.entity_key = 'truck_owner';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'main_contact_name', 'Main Contact Name', 'string', false, 2, 100, 5
FROM entities e WHERE e.entity_key = 'truck_owner';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'secondary_contact_name', 'Secondary Contact Name', 'string', false, 2, 100, 6
FROM entities e WHERE e.entity_key = 'truck_owner';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'mobile', 'Mobile', 'string', false, null, null, 7
FROM entities e WHERE e.entity_key = 'truck_owner';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'email', 'Email', 'string', false, null, null, 8
FROM entities e WHERE e.entity_key = 'truck_owner';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'taxId', 'Tax ID/EIN #', 'string', false, 2, 15, 9
FROM entities e WHERE e.entity_key = 'truck_owner';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'ssn', 'SSN', 'string', false, 2, 15, 10
FROM entities e WHERE e.entity_key = 'truck_owner';


-- Fields for Trucks (Trucks → trucks)
INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'equipmentID', 'Equipment ID', 'string', true, null, null, 1
FROM entities e WHERE e.entity_key = 'trucks';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'licence_plate_state', 'License State', 'string', false, null, null, 2
FROM entities e WHERE e.entity_key = 'trucks';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'licence_plate_number', 'License Plate #', 'string', false, null, null, 3
FROM entities e WHERE e.entity_key = 'trucks';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'year', 'Year', 'string', false, null, null, 4
FROM entities e WHERE e.entity_key = 'trucks';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'make', 'Make', 'string', false, null, 50, 5
FROM entities e WHERE e.entity_key = 'trucks';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'model', 'Model', 'string', false, null, 50, 6
FROM entities e WHERE e.entity_key = 'trucks';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'AID', 'AID', 'date', false, null, null, 7
FROM entities e WHERE e.entity_key = 'trucks';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'ITD', 'ITD', 'date', false, null, null, 8
FROM entities e WHERE e.entity_key = 'trucks';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'vin', 'VIN', 'string', false, null, null, 9
FROM entities e WHERE e.entity_key = 'trucks';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'reg_expiration', 'Registration Expiration', 'date', false, null, null, 10
FROM entities e WHERE e.entity_key = 'trucks';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'inspection_exp', 'Inspection Expiration', 'date', false, null, null, 11
FROM entities e WHERE e.entity_key = 'trucks';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'hut_exp', 'HUT Expiration', 'date', false, null, null, 12
FROM entities e WHERE e.entity_key = 'trucks';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'annual_inspection', 'Annual Inspection', 'date', false, null, null, 13
FROM entities e WHERE e.entity_key = 'trucks';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'bobtail_insurance', 'Bobtail Insurance', 'date', false, null, null, 14
FROM entities e WHERE e.entity_key = 'trucks';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'diesel_emission', 'Diesel Emission', 'date', false, null, null, 15
FROM entities e WHERE e.entity_key = 'trucks';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'fleetTruckOwner', 'Truck Owner', 'string', false, null, 100, 16
FROM entities e WHERE e.entity_key = 'trucks';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'newTerminal', 'Branch', 'string', false, null, 100, 17
FROM entities e WHERE e.entity_key = 'trucks';


-- Fields for Users (Users → users)
INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'firstName', 'First Name*', 'string', true, 2, 50, 1
FROM entities e WHERE e.entity_key = 'users';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'lastName', 'Last Name*', 'string', true, 2, 50, 2
FROM entities e WHERE e.entity_key = 'users';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'mobile', 'Phone', 'string', false, null, null, 3
FROM entities e WHERE e.entity_key = 'users';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'email', 'Email*', 'string', true, null, null, 4
FROM entities e WHERE e.entity_key = 'users';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'password', 'Password*', 'string', true, 10, 50, 5
FROM entities e WHERE e.entity_key = 'users';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'role', 'System Roles*', 'string', true, null, 200, 6
FROM entities e WHERE e.entity_key = 'users';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'terminals', 'Terminal*', 'string', true, null, 100, 7
FROM entities e WHERE e.entity_key = 'users';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'customRole', 'Custom Role', 'string', true, null, 100, 8
FROM entities e WHERE e.entity_key = 'users';


-- Fields for Charge Profile (Charge Profile → charge_profile)
INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'name', 'Charge Profile Name', 'string', true, 2, 100, 1
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'chargeName', 'Charge Name', 'string', true, 2, 100, 2
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'description', 'Charge Description', 'string', false, null, 500, 3
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'unitOfMeasure', 'Unit of Measure', 'string', true, null, 50, 4
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'effectiveDateBasedOn', 'Effective date based on', 'string', false, null, 50, 5
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'effectiveStartDate', 'Charge Effective Start Date', 'date', false, null, null, 6
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'effectiveEndDate', 'Charge Effective End Date', 'date', false, null, null, 7
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'autoAdd', 'Auto Add', 'string', false, null, null, 8
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'driverGroup', 'Driver Pay Group', 'string', false, null, null, 9
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'vendorGroup', 'Vendor / Vendor Group', 'string', false, null, null, 10
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'fromEvent', 'Calculate From This', 'string', false, null, 200, 11
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'toEvent', 'Calculate To This', 'string', false, null, 200, 12
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'inEvent', 'Calculate In This Event', 'string', false, null, 200, 13
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Calculate For Exact Events', 'Calculate For Exact Events', 'string', false, null, null, 14
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'fromLegs', 'From Legs', 'string', false, null, null, 15
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'toLegs', 'To Legs', 'string', false, null, null, 16
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'fromLegEventLocation', 'From Leg Event Location', 'string', false, null, 200, 17
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'toLegEventLocation', 'To Leg Event Location', 'string', false, null, 200, 18
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Zip Code Rule (any in)', 'Zip Code Rule (any in)', 'string', false, null, 500, 19
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Zip Code Rule (not in)', 'Zip Code Rule (not in)', 'string', false, null, 500, 20
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Load Type Rule (any in)', 'Load Type Rule (any in)', 'string', false, null, 200, 21
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Load Type Rule (not in)', 'Load Type Rule (not in)', 'string', false, null, 200, 22
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'City State Rule (any in)', 'City State Rule (any in)', 'string', false, null, 500, 23
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'minimumAmount', 'Minimum Amount', 'number', false, null, null, 24
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'freeUnits', 'Free Units', 'number', false, null, null, 25
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'amount', 'Amount', 'number', false, null, null, 26
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'radiusRateType', 'Radius Rate', 'string', false, null, null, 27
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'startValue', 'Start Distance', 'number', false, null, null, 28
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'endValue', 'End Distance', 'number', false, null, null, 29
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'ifEvent', 'If Event', 'string', false, null, null, 30
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'eventLocation', 'Event Location', 'string', false, null, null, 31
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'eventTime', 'Event Time', 'string', false, null, null, 32
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'City State Rule (any in)', 'City State Rule (any in)', 'string', false, null, 500, 33
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'City State Rule (not in)', 'City State Rule (not in)', 'string', false, null, 500, 34
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Customer(any in)', 'Customer(any in)', 'string', false, null, null, 35
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Customer(not in)', 'Customer(not in)', 'string', false, null, null, 36
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Warehouse(any in)', 'Warehouse(any in)', 'string', false, null, null, 37
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Warehouse(not in)', 'Warehouse(not in)', 'string', false, null, null, 38
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Chassis Pick Up(any in)', 'Chassis Pick Up(any in)', 'string', false, null, null, 39
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Chassis Pick Up(not in)', 'Chassis Pick Up(not in)', 'string', false, null, null, 40
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Container Return(any in)', 'Container Return(any in)', 'string', false, null, null, 41
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Container Return(not in)', 'Container Return(not in)', 'string', false, null, null, 42
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Chassis Term(any in)', 'Chassis Term(any in)', 'string', false, null, null, 43
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Chassis Term(not in)', 'Chassis Term(not in)', 'string', false, null, null, 44
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Container Type(any in)', 'Container Type(any in)', 'string', false, null, null, 45
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Container Type(not in)', 'Container Type(not in)', 'string', false, null, null, 46
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Container Size(any in)', 'Container Size(any in)', 'string', false, null, null, 47
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Container Size(not in)', 'Container Size(not in)', 'string', false, null, null, 48
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Container Owner(any in)', 'Container Owner(any in)', 'string', false, null, null, 49
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Container Owner(not in)', 'Container Owner(not in)', 'string', false, null, null, 50
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Chassis Type(any in)', 'Chassis Type(any in)', 'string', false, null, null, 51
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Chassis Type(not in)', 'Chassis Type(not in)', 'string', false, null, null, 52
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Chassis Size(any in)', 'Chassis Size(any in)', 'string', false, null, null, 53
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Chassis Size(not in)', 'Chassis Size(not in)', 'string', false, null, null, 54
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Chassis Owner(any in)', 'Chassis Owner(any in)', 'string', false, null, null, 55
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Chassis Owner(not in)', 'Chassis Owner(not in)', 'string', false, null, null, 56
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Branch(any in)', 'Branch(any in)', 'string', false, null, null, 57
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Branch(not in)', 'Branch(not in)', 'string', false, null, null, 58
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Commodity(any in)', 'Commodity(any in)', 'string', false, null, null, 59
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Commodity(not in)', 'Commodity(not in)', 'string', false, null, null, 60
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Hot(any in)', 'Hot(any in)', 'string', false, null, null, 61
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Hot(not in)', 'Hot(not in)', 'string', false, null, null, 62
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Hazmat(any in)', 'Hazmat(any in)', 'string', false, null, null, 63
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Hazmat(not in)', 'Hazmat(not in)', 'string', false, null, null, 64
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Temperature(any in)', 'Temperature(any in)', 'string', false, null, 500, 65
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Temperature(not in)', 'Temperature(not in)', 'string', false, null, 500, 66
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Reefer(any in)', 'Reefer(any in)', 'number', false, null, null, 67
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Reefer(not in)', 'Reefer(not in)', 'number', false, null, null, 68
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Liquor(any in)', 'Liquor(any in)', 'string', false, null, null, 69
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Liquor(not in)', 'Liquor(not in)', 'string', false, null, null, 70
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'City-State(any in)', 'City-State(any in)', 'string', false, null, 500, 71
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'City-State(not in)', 'City-State(not in)', 'string', false, null, 500, 72
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'State(any in)', 'State(any in)', 'string', false, null, null, 73
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'State(not in)', 'State(not in)', 'string', false, null, null, 74
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Delivery Day(any in)', 'Delivery Day(any in)', 'string', false, null, null, 75
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Delivery Day(not in)', 'Delivery Day(not in)', 'string', false, null, null, 76
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Delivery Time(any in)', 'Delivery Time(any in)', 'string', false, null, null, 77
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Delivery Time(not in)', 'Delivery Time(not in)', 'string', false, null, null, 78
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'City Groups(any in)', 'City Groups(any in)', 'string', false, null, null, 79
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'City Groups(not in)', 'City Groups(not in)', 'string', false, null, null, 80
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Overweight(any in)', 'Overweight(any in)', 'string', false, null, null, 81
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Overweight(not in)', 'Overweight(not in)', 'string', false, null, null, 82
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Overheight(any in)', 'Overheight(any in)', 'string', false, null, null, 83
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Overheight(not in)', 'Overheight(not in)', 'string', false, null, null, 84
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Drop Location(any in)', 'Drop Location(any in)', 'string', false, null, null, 85
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Drop Location(not in)', 'Drop Location(not in)', 'string', false, null, null, 86
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Dropped(any in)', 'Dropped(any in)', 'string', false, null, null, 87
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Dropped(not in)', 'Dropped(not in)', 'string', false, null, null, 88
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Genset(any in)', 'Genset(any in)', 'string', false, null, null, 89
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Genset(not in)', 'Genset(not in)', 'string', false, null, null, 90
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'CSR(any in)', 'CSR(any in)', 'string', false, null, null, 91
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'CSR(not in)', 'CSR(not in)', 'string', false, null, null, 92
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Stop Off(any in)', 'Stop Off(any in)', 'string', false, null, 500, 93
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Stop Off(not in)', 'Stop Off(not in)', 'string', false, null, 500, 94
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Delivery Country(any in)', 'Delivery Country(any in)', 'string', false, null, null, 95
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Delivery Country(not in)', 'Delivery Country(not in)', 'string', false, null, null, 96
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Postal/Zip Code Groups(any in)', 'Postal/Zip Code Groups(any in)', 'string', false, null, null, 97
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Postal/Zip Code Groups(not in)', 'Postal/Zip Code Groups(not in)', 'string', false, null, null, 98
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Street Turn Type(any in)', 'Street Turn Type(any in)', 'string', false, null, null, 99
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Street Turn Type(not in)', 'Street Turn Type(not in)', 'string', false, null, null, 100
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Trip Type(any in)', 'Trip Type(any in)', 'string', false, null, null, 101
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Trip Type(not in)', 'Trip Type(not in)', 'string', false, null, null, 102
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Scale(any in)', 'Scale(any in)', 'string', false, null, null, 103
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Scale(not in)', 'Scale(not in)', 'string', false, null, null, 104
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Dual Transaction(any in)', 'Dual Transaction(any in)', 'string', false, null, null, 105
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Dual Transaction(not in)', 'Dual Transaction(not in)', 'string', false, null, null, 106
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Street Turn(any in)', 'Street Turn(any in)', 'string', false, null, null, 107
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Street Turn(not in)', 'Street Turn(not in)', 'string', false, null, null, 108
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'EV(any in)', 'EV(any in)', 'string', false, null, null, 109
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'EV(not in)', 'EV(not in)', 'string', false, null, null, 110
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Bonded(any in)', 'Bonded(any in)', 'string', false, null, null, 111
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Bonded(not in)', 'Bonded(not in)', 'string', false, null, null, 112
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'OOG(any in)', 'OOG(any in)', 'string', false, null, null, 113
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'OOG(not in)', 'OOG(not in)', 'string', false, null, null, 114
FROM entities e WHERE e.entity_key = 'charge_profile';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'vendorType', 'Vendor', 'string', false, null, null, 115
FROM entities e WHERE e.entity_key = 'charge_profile';


-- Fields for Chassis Owner (Chassis Owner → chassis_owner)
INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'company_name', 'Company Name', 'string', true, 2, 100, 1
FROM entities e WHERE e.entity_key = 'chassis_owner';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'contact_name', 'Contact Name', 'string', true, 2, 100, 2
FROM entities e WHERE e.entity_key = 'chassis_owner';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'mobile', 'Phone', 'string', true, null, null, 3
FROM entities e WHERE e.entity_key = 'chassis_owner';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'address', 'Address', 'string', true, 5, 200, 4
FROM entities e WHERE e.entity_key = 'chassis_owner';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'city', 'City', 'string', true, 2, 50, 5
FROM entities e WHERE e.entity_key = 'chassis_owner';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'state', 'State', 'string', true, 2, 50, 6
FROM entities e WHERE e.entity_key = 'chassis_owner';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'zip_code', 'Zip Code', 'string', true, null, null, 7
FROM entities e WHERE e.entity_key = 'chassis_owner';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'country', 'Country', 'string', true, 2, 100, 8
FROM entities e WHERE e.entity_key = 'chassis_owner';


-- Fields for Chassis (Chassis → chassis)
INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'chassisNo', 'Chassis #', 'string', true, 1, 50, 1
FROM entities e WHERE e.entity_key = 'chassis';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'chassisType', 'Chassis Type', 'string', true, 2, 50, 2
FROM entities e WHERE e.entity_key = 'chassis';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'chassisSize', 'Chassis Size', 'string', true, 2, 100, 3
FROM entities e WHERE e.entity_key = 'chassis';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'chassisOwner', 'Chassis Owner', 'string', true, 2, 100, 4
FROM entities e WHERE e.entity_key = 'chassis';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'year', 'Year', 'string', false, null, null, 5
FROM entities e WHERE e.entity_key = 'chassis';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'make', 'Make', 'string', false, null, 50, 6
FROM entities e WHERE e.entity_key = 'chassis';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'model', 'Model', 'string', false, null, 50, 7
FROM entities e WHERE e.entity_key = 'chassis';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'AID', 'Annual Inspection Date', 'date', false, null, null, 8
FROM entities e WHERE e.entity_key = 'chassis';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'ITD', 'ITD', 'date', false, null, null, 9
FROM entities e WHERE e.entity_key = 'chassis';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'newTerminal', 'Branch', 'string', false, null, 100, 10
FROM entities e WHERE e.entity_key = 'chassis';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'licenceState', 'License State', 'string', false, null, null, 11
FROM entities e WHERE e.entity_key = 'chassis';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'licenceNumber', 'License Number', 'string', false, null, null, 12
FROM entities e WHERE e.entity_key = 'chassis';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'vin', 'VIN', 'string', false, null, null, 13
FROM entities e WHERE e.entity_key = 'chassis';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'registration', 'Registration', 'date', false, null, null, 14
FROM entities e WHERE e.entity_key = 'chassis';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'inspection', 'Inspection', 'date', false, null, null, 15
FROM entities e WHERE e.entity_key = 'chassis';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'insurance', 'Insurance', 'date', false, null, null, 16
FROM entities e WHERE e.entity_key = 'chassis';


-- Fields for People (People → people)
INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'email', 'Email', 'string', true, null, null, 1
FROM entities e WHERE e.entity_key = 'people';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'firstName', 'First Name', 'string', true, 2, 50, 2
FROM entities e WHERE e.entity_key = 'people';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'lastName', 'Last Name', 'string', true, 2, 50, 3
FROM entities e WHERE e.entity_key = 'people';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'mobileNumbers', 'Mobile', 'string', true, null, null, 4
FROM entities e WHERE e.entity_key = 'people';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'CustomerID', 'Customer ID', 'string', true, 2, 100, 5
FROM entities e WHERE e.entity_key = 'people';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'password', 'Password', 'string', true, 10, 50, 6
FROM entities e WHERE e.entity_key = 'people';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'customer_employee_load', 'Loads Permission', 'boolean', false, null, null, 7
FROM entities e WHERE e.entity_key = 'people';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'dropped_containers', 'Dropped Containers Permission', 'boolean', false, null, null, 8
FROM entities e WHERE e.entity_key = 'people';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'account_payable', 'Account Payable Permission', 'boolean', false, null, null, 9
FROM entities e WHERE e.entity_key = 'people';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'customer_employee_load_info', 'Info Permission', 'boolean', false, null, null, 10
FROM entities e WHERE e.entity_key = 'people';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'customer_employee_load_billing', 'Billing Permission', 'boolean', false, null, null, 11
FROM entities e WHERE e.entity_key = 'people';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'customer_employee_load_documents', 'Documents Permission', 'boolean', false, null, null, 12
FROM entities e WHERE e.entity_key = 'people';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'customer_employee_load_upload_documents', 'Upload Documents Permission', 'boolean', false, null, null, 13
FROM entities e WHERE e.entity_key = 'people';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'customer_employee_load_payments', 'Payments Permission', 'boolean', false, null, null, 14
FROM entities e WHERE e.entity_key = 'people';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'customer_employee_load_tracking', 'Tracking Permission', 'boolean', false, null, null, 15
FROM entities e WHERE e.entity_key = 'people';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'customer_employee_load_messaging', 'Service Messaging Permission', 'boolean', false, null, null, 16
FROM entities e WHERE e.entity_key = 'people';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'customer_employee_load_summary', 'Summary Permission', 'boolean', false, null, null, 17
FROM entities e WHERE e.entity_key = 'people';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'customer_shipments', 'Shipment Tracking Permission', 'boolean', false, null, null, 18
FROM entities e WHERE e.entity_key = 'people';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'customer', 'Customer Permission', 'boolean', false, null, null, 19
FROM entities e WHERE e.entity_key = 'people';


-- Fields for Organization (Organization → organization)
INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'company_name', 'Company Name', 'string', true, 2, 100, 1
FROM entities e WHERE e.entity_key = 'organization';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'address', 'Address', 'string', true, 5, 200, 2
FROM entities e WHERE e.entity_key = 'organization';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Building/Stuite', 'Building/Stuite', 'string', false, 5, 200, 3
FROM entities e WHERE e.entity_key = 'organization';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'city', 'City', 'string', true, 2, 50, 4
FROM entities e WHERE e.entity_key = 'organization';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'state', 'State', 'string', true, null, null, 5
FROM entities e WHERE e.entity_key = 'organization';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'country', 'Country', 'string', true, null, null, 6
FROM entities e WHERE e.entity_key = 'organization';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'zip_code', 'Zip Code', 'string', true, null, null, 7
FROM entities e WHERE e.entity_key = 'organization';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'main_contact_name', 'Main Contact Name', 'string', false, 2, 100, 8
FROM entities e WHERE e.entity_key = 'organization';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'secondary_contact_name', 'Secondary Contact Name', 'string', false, 2, 100, 9
FROM entities e WHERE e.entity_key = 'organization';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'secondaryPhoneNo', 'Secondary Phone', 'string', false, null, null, 10
FROM entities e WHERE e.entity_key = 'organization';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'mobile', 'Mobile', 'string', false, null, null, 11
FROM entities e WHERE e.entity_key = 'organization';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'email', 'Email', 'string', false, null, null, 12
FROM entities e WHERE e.entity_key = 'organization';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'billingEmail', 'Billing Email', 'string', false, null, null, 13
FROM entities e WHERE e.entity_key = 'organization';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'password', 'Password', 'string', false, 10, 50, 14
FROM entities e WHERE e.entity_key = 'organization';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'defaultPaymentTerms.paymentTermsMethod', 'Payment Terms Method', 'string', false, null, 50, 15
FROM entities e WHERE e.entity_key = 'organization';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'defaultPaymentTerms.day', 'Payment Terms + Days', 'number', false, null, null, 16
FROM entities e WHERE e.entity_key = 'organization';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'credit_limit', 'Credit Limit', 'number', false, null, null, 17
FROM entities e WHERE e.entity_key = 'organization';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'branch', 'Branch', 'string', false, null, null, 18
FROM entities e WHERE e.entity_key = 'organization';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'customerType', 'Organization Type', 'string', true, null, null, 19
FROM entities e WHERE e.entity_key = 'organization';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'receiverEmail', 'Receiver email', 'string', false, null, null, 20
FROM entities e WHERE e.entity_key = 'organization';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'mcNumber', 'Mc number', 'string', false, null, null, 21
FROM entities e WHERE e.entity_key = 'organization';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'fleetCustomer', 'Fleet customer', 'string', false, null, null, 22
FROM entities e WHERE e.entity_key = 'organization';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'payType', 'Pay type', 'string', false, null, 50, 23
FROM entities e WHERE e.entity_key = 'organization';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'invoiceCurrencyWithCarrier', 'Currency Type', 'string', false, null, null, 24
FROM entities e WHERE e.entity_key = 'organization';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'externalId', 'External ID', 'string', false, null, null, 25
FROM entities e WHERE e.entity_key = 'organization';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'latitude', 'Latitude', 'number', false, null, null, 26
FROM entities e WHERE e.entity_key = 'organization';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'longitude', 'Longitude', 'number', false, null, null, 27
FROM entities e WHERE e.entity_key = 'organization';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'notes', 'notes', 'string', false, null, null, 28
FROM entities e WHERE e.entity_key = 'organization';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'officeHoursStart', 'Office Hour Start', 'time', false, null, null, 29
FROM entities e WHERE e.entity_key = 'organization';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'officeHoursEnd', 'Office Hour End', 'time', false, null, null, 30
FROM entities e WHERE e.entity_key = 'organization';


-- Fields for Drivers (Drivers → drivers)
INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'name', 'First Name', 'string', true, 2, 50, 1
FROM entities e WHERE e.entity_key = 'drivers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'lastName', 'Last Name', 'string', true, 2, 50, 2
FROM entities e WHERE e.entity_key = 'drivers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'email', 'Email', 'string', true, 7, 50, 3
FROM entities e WHERE e.entity_key = 'drivers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'mobile', 'Phone', 'string', true, null, null, 4
FROM entities e WHERE e.entity_key = 'drivers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'password', 'Password', 'string', true, 5, 20, 5
FROM entities e WHERE e.entity_key = 'drivers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'username', 'Username', 'string', false, 3, 50, 6
FROM entities e WHERE e.entity_key = 'drivers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'truck', 'Truck Number', 'string', false, null, 50, 7
FROM entities e WHERE e.entity_key = 'drivers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'country_code', 'Country Code', 'string', false, null, null, 8
FROM entities e WHERE e.entity_key = 'drivers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'licence', 'License State', 'string', false, null, null, 9
FROM entities e WHERE e.entity_key = 'drivers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'licenceNumber', 'License Number', 'string', false, null, null, 10
FROM entities e WHERE e.entity_key = 'drivers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'seaLinkNumber', 'Sealink #', 'string', false, null, null, 11
FROM entities e WHERE e.entity_key = 'drivers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'EmergencyContactName', 'Emergency Contact Name', 'string', false, null, 100, 12
FROM entities e WHERE e.entity_key = 'drivers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'EmergencyRelation', 'Emergency Relation', 'string', false, null, 50, 13
FROM entities e WHERE e.entity_key = 'drivers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'EmergencyContactNumber', 'Emergency Contact Number', 'string', false, null, null, 14
FROM entities e WHERE e.entity_key = 'drivers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'socialSecurity', 'Social Security #', 'string', false, null, null, 15
FROM entities e WHERE e.entity_key = 'drivers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'billingEmail', 'Billing Email', 'string', false, null, null, 16
FROM entities e WHERE e.entity_key = 'drivers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'profileType', 'Profile Type', 'array', false, null, null, 17
FROM entities e WHERE e.entity_key = 'drivers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'dlExp', 'License Expiration', 'date', false, null, null, 18
FROM entities e WHERE e.entity_key = 'drivers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'dob', 'Date of Birth', 'date', false, null, null, 19
FROM entities e WHERE e.entity_key = 'drivers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'doh', 'Date of Hire', 'date', false, null, null, 20
FROM entities e WHERE e.entity_key = 'drivers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'medicalExp', 'Medical Expiration', 'date', false, null, null, 21
FROM entities e WHERE e.entity_key = 'drivers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'twicExp', 'Twic Expiration', 'date', false, null, null, 22
FROM entities e WHERE e.entity_key = 'drivers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'seaLinkExp', 'Sea Link Expiration', 'date', false, null, null, 23
FROM entities e WHERE e.entity_key = 'drivers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'branch', 'Branch', 'string', false, null, 100, 24
FROM entities e WHERE e.entity_key = 'drivers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'externalSystemID', 'External Id', 'string', false, null, null, 25
FROM entities e WHERE e.entity_key = 'drivers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'hazmat', 'Hazmat', 'boolean', false, null, null, 26
FROM entities e WHERE e.entity_key = 'drivers';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'homeTerminalTimezone', 'Home Branch Time Zone', 'string', false, null, 100, 27
FROM entities e WHERE e.entity_key = 'drivers';


-- Fields for PerDiem (PerDiem → perdiem)
INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Customers', 'Customers', 'string', false, null, 100, 1
FROM entities e WHERE e.entity_key = 'perdiem';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Owner', 'Owner', 'string', true, null, 100, 2
FROM entities e WHERE e.entity_key = 'perdiem';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Size', 'Size', 'string', false, null, 10, 3
FROM entities e WHERE e.entity_key = 'perdiem';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Type', 'Type', 'string', true, null, 10, 4
FROM entities e WHERE e.entity_key = 'perdiem';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Tier #1', 'Tier #1', 'string', false, null, 50, 5
FROM entities e WHERE e.entity_key = 'perdiem';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Tier #2', 'Tier #2', 'string', false, null, 50, 6
FROM entities e WHERE e.entity_key = 'perdiem';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Tier #3', 'Tier #3', 'string', false, null, 50, 7
FROM entities e WHERE e.entity_key = 'perdiem';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Tier #4', 'Tier #4', 'string', false, null, 50, 8
FROM entities e WHERE e.entity_key = 'perdiem';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Import Freedays', 'Import Freedays', 'string', false, null, 50, 9
FROM entities e WHERE e.entity_key = 'perdiem';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Export Freedays', 'Export Freedays', 'string', false, null, 50, 10
FROM entities e WHERE e.entity_key = 'perdiem';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Holiday', 'Holiday', 'string', false, null, 10, 11
FROM entities e WHERE e.entity_key = 'perdiem';

INSERT INTO entity_fields (entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order)
SELECT e.id, 'Free Weekday', 'Free Weekday', 'string', false, null, 10, 12
FROM entities e WHERE e.entity_key = 'perdiem';


