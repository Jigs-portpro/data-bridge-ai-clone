-- Database Seed File for Entity Management System
-- Based on exportEntities.json

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clear existing data
TRUNCATE TABLE entity_fields CASCADE;
TRUNCATE TABLE entities CASCADE;

-- Insert Entities
INSERT INTO entities (entity_key, name, api_endpoint) VALUES
('load', 'Load', '/tms/uploadLoad'),
('carrier', 'Carrier', '/createDrayosCarrier'),
('tariff', 'Tariff', 'rate-engine/rate-record/bulk-upload'),
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
('perdiem', 'PerDiem', '/tms/addFreeContainerReturn');

-- Insert Fields for Load Entity
INSERT INTO entity_fields (entity_id, field_name, display_name, source_column, field_type, is_required, min_length, max_length, pattern, sort_order)
SELECT 
    (SELECT id FROM entities WHERE entity_key = 'load'),
    field_name,
    display_name,
    source_column,
    field_type,
    is_required,
    min_length,
    max_length,
    pattern,
    sort_order
FROM (VALUES
    ('customer', 'Customer', 'caller', 'string', true, 2, 100, NULL, 1),
    ('load_type', 'Load Type', 'type_of_load', 'string', true, NULL, 50, '^(Import|Export|Road)$', 2),
    ('pick_up_location', 'Pick Up Location', 'shipper', 'string', true, NULL, 200, NULL, 3),
    ('container', 'Container', 'containerNo', 'string', false, NULL, 20, NULL, 4),
    ('delivery_city_state', 'Delivery City/State', 'consignee', 'string', true, NULL, 100, NULL, 5),
    ('container_size', 'Container Size', 'containerSize', 'string', false, NULL, 10, NULL, 6),
    ('container_type', 'Container Type', 'containerType', 'string', false, NULL, 10, NULL, 7),
    ('weight_lbs', 'Weight LBS', 'weightLBS', 'number', false, NULL, NULL, NULL, 8),
    ('weight_kgs', 'Weight KGS', 'weightKGS', 'number', false, NULL, NULL, NULL, 9),
    ('delivery_order', 'Delivery Order', 'documents', 'string', false, NULL, 50, NULL, 10),
    ('owner', 'Owner', 'containerOwner', 'string', false, NULL, 100, NULL, 11),
    ('booking_number', 'Booking #', 'bookingNo', 'string', false, NULL, 50, NULL, 12),
    ('master_bill_of_lading', 'Master Bill Of Lading', 'callerbillLandingNo', 'string', false, NULL, 50, NULL, 13),
    ('container_eta', 'Container ETA', 'vessel.eta', 'date', false, NULL, NULL, NULL, 14),
    ('last_free_day', 'Last Free Day', 'lastFreeDay', 'date', false, NULL, NULL, NULL, 15),
    ('container_return', 'Container Return', 'emptyOrigin', 'string', false, NULL, 200, NULL, 16),
    ('hook_chassis_location', 'Hook Chassis Location', 'chassisPick', 'string', false, NULL, 200, NULL, 17),
    ('terminate_chassis_location', 'Terminate Chassis Location', 'chassisTermination', 'string', false, NULL, 200, NULL, 18),
    ('reference_number', 'Reference #', 'secondaryReferenceNo', 'string', false, NULL, 50, NULL, 19),
    ('empty_date', 'Empty Date', 'emptyDay', 'date', false, NULL, NULL, NULL, 20),
    ('date_returned', 'Date Returned', 'return', 'date', false, NULL, NULL, NULL, 21),
    ('pick_up_apt_from', 'Pick Up Apt From', 'pickupTimes', 'date', false, NULL, NULL, NULL, 22),
    ('delivery_apt_from', 'Delivery Apt From', 'deliveryTimes', 'date', false, NULL, NULL, NULL, 23),
    ('erd', 'ERD', 'containerAvailableDay', 'date', false, NULL, NULL, NULL, 24),
    ('per_diem_free_day', 'Per Diem Free Day', 'freeReturnDate', 'date', false, NULL, NULL, NULL, 25),
    ('loaded_date', 'Loaded Date', 'loadTime', 'date', false, NULL, NULL, NULL, 26),
    ('billing_date', 'Billing Date', 'billingDate', 'date', false, NULL, NULL, NULL, 27),
    ('chassis_number', 'Chassis #', 'chassisNo', 'string', false, NULL, 20, NULL, 28),
    ('chassis_owner', 'Chassis Owner', 'chassisOwner', 'string', false, NULL, 100, NULL, 29),
    ('chassis_size', 'Chassis Size', 'chassisSize', 'string', false, NULL, 10, NULL, 30),
    ('chassis_type', 'Chassis Type', 'chassisType', 'string', false, NULL, 10, NULL, 31),
    ('cut_off_date', 'Cut Off Date', 'cutOff', 'date', false, NULL, NULL, NULL, 32),
    ('house_bill_of_lading', 'House Bill Of Lading', 'doNo', 'string', false, NULL, 50, NULL, 33),
    ('pick_up_number', 'Pick Up #', 'callerPONo', 'string', false, NULL, 50, NULL, 34),
    ('purchase_order_number', 'Purchase Order #', 'purchaseOrderNo', 'string', false, NULL, 50, NULL, 35),
    ('seal_number', 'Seal #', 'sealNo', 'string', false, NULL, 20, NULL, 36),
    ('shipment_number', 'Shipment #', 'shipmentNo', 'string', false, NULL, 50, NULL, 37),
    ('temperature', 'Temperature', 'temperature', 'number', false, NULL, NULL, NULL, 38),
    ('branch', 'Branch', 'terminal', 'string', false, NULL, 100, NULL, 39),
    ('vessel_name', 'Vessel Name', 'deliveryOrderNo', 'string', false, NULL, 100, NULL, 40),
    ('voyage', 'Voyage', 'releaseNo', 'string', false, NULL, 50, NULL, 41),
    ('commodity', 'Commodity', 'commodity', 'string', false, NULL, 100, NULL, 42),
    ('pieces', 'Pieces', 'pieces', 'number', false, NULL, NULL, NULL, 43),
    ('hazmat', 'Hazmat', 'hazmat', 'boolean', false, NULL, NULL, '^(?i)(true|false)$', 44),
    ('hot', 'Hot', 'hot', 'boolean', false, NULL, NULL, '^(?i)(true|false)$', 45),
    ('overweight', 'Overweight', 'overweight', 'boolean', false, NULL, NULL, '^(?i)(true|false)$', 46),
    ('routes', 'Routes', 'routes', 'string', false, NULL, 100, '^(Pick And Run \+ Live|Pick And Run \+ Drop & Hook|Prepull \+ Drop & Hook|Prepull \+ Live|One Way Move|Pick And Run \+ Gray Pool|Prepull \+ Gray Pool|Shunt|Pick and Lift \+ Deliver and Lift \+ Return|Pick and Lift \+ Live)$', 47),
    ('genset', 'Genset', 'isGenset', 'boolean', false, NULL, NULL, '^(?i)(true|false)$', 48),
    ('liquor', 'Liquor', 'liquor', 'boolean', false, NULL, NULL, '^(?i)(true|false)$', 49),
    ('overheight', 'Overheight', 'overheight', 'boolean', false, NULL, NULL, '^(?i)(true|false)$', 50),
    ('street_turn', 'Street Turn', 'isStreetTurn', 'boolean', false, NULL, NULL, '^(?i)(true|false)$', 51),
    ('scale', 'Scale', 'scale', 'boolean', false, NULL, NULL, '^(?i)(true|false)$', 52)
) AS t(field_name, display_name, source_column, field_type, is_required, min_length, max_length, pattern, sort_order);

-- Insert Fields for Carrier Entity
INSERT INTO entity_fields (entity_id, field_name, display_name, source_column, field_type, is_required, min_length, max_length, pattern, sort_order)
SELECT 
    (SELECT id FROM entities WHERE entity_key = 'carrier'),
    field_name,
    display_name,
    source_column,
    field_type,
    is_required,
    min_length,
    max_length,
    pattern,
    sort_order
FROM (VALUES
    ('company_name', 'Company Name', 'company_name', 'string', true, 2, 100, NULL, 1),
    ('contact_name', 'Contact Name', 'contactName', 'string', true, 2, 100, NULL, 2),
    ('address', 'Address', 'address', 'string', true, 5, 200, NULL, 3),
    ('country', 'Country', 'country', 'string', true, NULL, NULL, '^[A-Z]{2}$', 4),
    ('state', 'State', 'state', 'string', true, NULL, NULL, '^[A-Z]{2}$', 5),
    ('city', 'City', 'city', 'string', true, 2, 50, NULL, 6),
    ('zip', 'ZIP', 'zip', 'string', true, NULL, NULL, '^[0-9]{5}(-[0-9]{4})?$', 7),
    ('email', 'Login Email Address', 'email', 'email', true, NULL, NULL, '^[a-zA-Z0-9]([a-zA-Z0-9._+-])*[a-zA-Z0-9+]@[a-zA-Z0-9]([a-zA-Z0-9-])*[a-zA-Z0-9]\.([a-zA-Z]{2,4})+$', 8),
    ('tender_email', 'Tender Email Address 1', 'tenderEmail', 'email', true, NULL, NULL, '^[a-zA-Z0-9]([a-zA-Z0-9._+-])*[a-zA-Z0-9+]@[a-zA-Z0-9]([a-zA-Z0-9-])*[a-zA-Z0-9]\.([a-zA-Z]{2,4})+$', 9),
    ('tender_email_2', 'Tender Email Address 2', NULL, 'email', false, NULL, NULL, '^[a-zA-Z0-9]([a-zA-Z0-9._+-])*[a-zA-Z0-9+]@[a-zA-Z0-9]([a-zA-Z0-9-])*[a-zA-Z0-9]\.([a-zA-Z]{2,4})+$', 10),
    ('tender_email_3', 'Tender Email Address 3', NULL, 'email', false, NULL, NULL, '^[a-zA-Z0-9]([a-zA-Z0-9._+-])*[a-zA-Z0-9+]@[a-zA-Z0-9]([a-zA-Z0-9-])*[a-zA-Z0-9]\.([a-zA-Z]{2,4})+$', 11),
    ('phone_number', 'Phone Number', 'mobile', 'string', true, NULL, NULL, '^\([0-9]{3}\) [0-9]{3}-[0-9]{4}$', 12),
    ('scac', 'SCAC', 'scac', 'string', false, NULL, NULL, '^[A-Z]{4}$', 13),
    ('mc_number', 'MC#', 'mcNumber', 'string', false, NULL, NULL, '^[a-zA-Z0-9 ]*$', 14),
    ('usdot_number', 'USDOT Number', 'USDOTNumber', 'string', false, NULL, NULL, '^[0-9]{7,8}$', 15),
    ('external_id', 'External ID', NULL, 'string', false, NULL, 50, NULL, 16),
    ('branch_1', 'Branch 1', 'terminals', 'string', false, NULL, 50, NULL, 17)
) AS t(field_name, display_name, source_column, field_type, is_required, min_length, max_length, pattern, sort_order);

-- Insert Fields for Trailers Entity
INSERT INTO entity_fields (entity_id, field_name, display_name, source_column, field_type, is_required, min_length, max_length, pattern, sort_order)
SELECT 
    (SELECT id FROM entities WHERE entity_key = 'trailers'),
    field_name,
    display_name,
    source_column,
    field_type,
    is_required,
    min_length,
    max_length,
    pattern,
    sort_order
FROM (VALUES
    ('trailer_number', 'Trailer #', 'equipmentID', 'string', true, NULL, NULL, NULL, 1),
    ('year', 'Year', 'year', 'string', false, NULL, NULL, '^[0-9]{4}$', 2),
    ('make', 'Make', 'make', 'string', false, NULL, 50, NULL, 3),
    ('model', 'Model', 'model', 'string', false, NULL, 50, NULL, 4),
    ('aid', 'AID', 'AID', 'date', false, NULL, NULL, NULL, 5),
    ('itd', 'ITD', 'ITD', 'date', false, NULL, NULL, NULL, 6),
    ('vin', 'VIN', 'vin', 'string', false, NULL, NULL, '^[A-Z0-9]{9,17}$', 7),
    ('registration_expiration', 'Registration Expiration', 'reg_expiration', 'date', false, NULL, NULL, NULL, 8),
    ('inspection_expiration', 'Inspection Expiration', 'inspection_exp', 'date', false, NULL, NULL, NULL, 9),
    ('license_plate_state', 'License Plate State', 'licence_plate_state', 'string', false, NULL, NULL, '^[A-Z]{2}$', 10),
    ('license_plate_number', 'License Plate #', 'licence_plate_number', 'string', false, NULL, NULL, '^[A-Z0-9]{1,10}$', 11),
    ('hut_expiration', 'HUT Expiration', 'hut_exp', 'date', false, NULL, NULL, NULL, 12),
    ('trailer_type', 'Trailer Type', 'trailerType', 'string', false, NULL, 50, '^(Dry Van|Reefer|Flat Bed|Drop Deck|Low Boy|Double Drop Deck)$', 13),
    ('trailer_size', 'Trailer Size', 'size', 'string', false, NULL, NULL, '^(26''|40''|45''|48''|53'')$', 14),
    ('branch', 'Branch', NULL, 'string', true, NULL, 100, NULL, 15)
) AS t(field_name, display_name, source_column, field_type, is_required, min_length, max_length, pattern, sort_order);

-- Insert Fields for Truck Owner Entity
INSERT INTO entity_fields (entity_id, field_name, display_name, source_column, field_type, is_required, min_length, max_length, pattern, sort_order)
SELECT 
    (SELECT id FROM entities WHERE entity_key = 'truck_owner'),
    field_name,
    display_name,
    source_column,
    field_type,
    is_required,
    min_length,
    max_length,
    pattern,
    sort_order
FROM (VALUES
    ('company_name', 'Company Name', 'company_name', 'string', true, 2, 100, NULL, 1),
    ('address', 'Address', 'address', 'string', true, 5, 200, NULL, 2),
    ('dot_number', 'DOT #', 'DOTNumber', 'string', false, 2, 15, NULL, 3),
    ('mc_number', 'MC #', 'MCNumber', 'string', false, NULL, NULL, '^[a-zA-Z0-9 ]*$', 4),
    ('main_contact_name', 'Main Contact Name', 'main_contact_name', 'string', false, 2, 100, NULL, 5),
    ('secondary_contact_name', 'Secondary Contact Name', 'secondary_contact_name', 'string', false, 2, 100, NULL, 6),
    ('mobile', 'Mobile', 'mobile', 'string', false, NULL, NULL, '^\([0-9]{3}\) [0-9]{3}-[0-9]{4}$', 7),
    ('email', 'Email', 'email', 'email', false, NULL, NULL, '^[a-zA-Z0-9]([a-zA-Z0-9._+-])*[a-zA-Z0-9+]@[a-zA-Z0-9]([a-zA-Z0-9-])*[a-zA-Z0-9]\.([a-zA-Z]{2,4})+$', 8),
    ('tax_id', 'Tax ID/EIN #', 'taxId', 'string', false, 2, 15, NULL, 9),
    ('ssn', 'SSN', 'ssn', 'string', false, 2, 15, NULL, 10)
) AS t(field_name, display_name, source_column, field_type, is_required, min_length, max_length, pattern, sort_order);

-- Insert Fields for Trucks Entity  
INSERT INTO entity_fields (entity_id, field_name, display_name, source_column, field_type, is_required, min_length, max_length, pattern, sort_order)
SELECT 
    (SELECT id FROM entities WHERE entity_key = 'trucks'),
    field_name,
    display_name,
    source_column,
    field_type,
    is_required,
    min_length,
    max_length,
    pattern,
    sort_order
FROM (VALUES
    ('equipment_id', 'Equipment ID', 'equipmentID', 'string', true, NULL, NULL, NULL, 1),
    ('license_state', 'License State', 'licence_plate_state', 'string', false, NULL, NULL, '^[A-Z]{2}$', 2),
    ('license_plate_number', 'License Plate #', 'licence_plate_number', 'string', false, NULL, NULL, '^[A-Z0-9]{1,10}$', 3),
    ('year', 'Year', 'year', 'string', false, NULL, NULL, '^[0-9]{4}$', 4),
    ('make', 'Make', 'make', 'string', false, NULL, 50, NULL, 5),
    ('model', 'Model', 'model', 'string', false, NULL, 50, NULL, 6),
    ('aid', 'AID', 'AID', 'date', false, NULL, NULL, NULL, 7),
    ('itd', 'ITD', 'ITD', 'date', false, NULL, NULL, NULL, 8),
    ('vin', 'VIN', 'vin', 'string', false, NULL, NULL, NULL, 9),
    ('registration_expiration', 'Registration Expiration', 'reg_expiration', 'date', false, NULL, NULL, NULL, 10),
    ('inspection_expiration', 'Inspection Expiration', 'inspection_exp', 'date', false, NULL, NULL, NULL, 11),
    ('hut_expiration', 'HUT Expiration', 'hut_exp', 'date', false, NULL, NULL, NULL, 12),
    ('annual_inspection', 'Annual Inspection', 'annual_inspection', 'date', false, NULL, NULL, NULL, 13),
    ('bobtail_insurance', 'Bobtail Insurance', 'bobtail_insurance', 'date', false, NULL, NULL, NULL, 14),
    ('diesel_emission', 'Diesel Emission', 'diesel_emission', 'date', false, NULL, NULL, NULL, 15),
    ('truck_owner', 'Truck Owner', 'fleetTruckOwner', 'string', false, NULL, 100, NULL, 16),
    ('branch', 'Branch', 'newTerminal', 'string', false, NULL, 100, NULL, 17)
) AS t(field_name, display_name, source_column, field_type, is_required, min_length, max_length, pattern, sort_order);

-- Insert Fields for Users Entity
INSERT INTO entity_fields (entity_id, field_name, display_name, source_column, field_type, is_required, min_length, max_length, pattern, sort_order)
SELECT 
    (SELECT id FROM entities WHERE entity_key = 'users'),
    field_name,
    display_name,
    source_column,
    field_type,
    is_required,
    min_length,
    max_length,
    pattern,
    sort_order
FROM (VALUES
    ('first_name', 'First Name*', 'firstName', 'string', true, 2, 50, NULL, 1),
    ('last_name', 'Last Name*', 'lastName', 'string', true, 2, 50, NULL, 2),
    ('phone', 'Phone', 'mobile', 'string', false, NULL, NULL, '^\([0-9]{3}\) [0-9]{3}-[0-9]{4}$', 3),
    ('email', 'Email*', 'email', 'email', true, NULL, NULL, '^[a-zA-Z0-9]([a-zA-Z0-9._+-])*[a-zA-Z0-9+]@[a-zA-Z0-9]([a-zA-Z0-9-])*[a-zA-Z0-9]\.([a-zA-Z]{2,4})+$', 4),
    ('password', 'Password*', 'password', 'string', true, 10, 50, '^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{10,})', 5),
    ('system_roles', 'System Roles*', 'role', 'string', true, NULL, 200, '^(?:\s*(?:Admin|CSR|Sales\sAgent|Mechanics)\s*)(?:,\s*(?:Admin|CSR|Sales\sAgent|Mechanics)\s*)*$', 6),
    ('terminal', 'Terminal*', 'terminals', 'string', true, NULL, 100, NULL, 7),
    ('custom_role', 'Custom Role', 'customRole', 'string', true, NULL, 100, NULL, 8)
) AS t(field_name, display_name, source_column, field_type, is_required, min_length, max_length, pattern, sort_order);

-- Insert Fields for Chassis Owner Entity
INSERT INTO entity_fields (entity_id, field_name, display_name, source_column, field_type, is_required, min_length, max_length, pattern, sort_order)
SELECT 
    (SELECT id FROM entities WHERE entity_key = 'chassis_owner'),
    field_name,
    display_name,
    source_column,
    field_type,
    is_required,
    min_length,
    max_length,
    pattern,
    sort_order
FROM (VALUES
    ('company_name', 'Company Name', 'company_name', 'string', true, 2, 100, NULL, 1),
    ('contact_name', 'Contact Name', 'contact_name', 'string', true, 2, 100, NULL, 2),
    ('phone', 'Phone', 'mobile', 'string', true, NULL, NULL, '^\([0-9]{3}\) [0-9]{3}-[0-9]{4}$', 3),
    ('address', 'Address', 'address', 'string', true, 5, 200, NULL, 4),
    ('city', 'City', 'city', 'string', true, 2, 50, NULL, 5),
    ('state', 'State', 'state', 'string', true, 2, 50, NULL, 6),
    ('zip_code', 'Zip Code', 'zip_code', 'string', true, NULL, NULL, '^[0-9]{5}(-[0-9]{4})?$', 7),
    ('country', 'Country', 'country', 'string', true, 2, 100, NULL, 8)
) AS t(field_name, display_name, source_column, field_type, is_required, min_length, max_length, pattern, sort_order);

-- Insert Fields for Chassis Entity
INSERT INTO entity_fields (entity_id, field_name, display_name, source_column, field_type, is_required, min_length, max_length, pattern, sort_order)
SELECT 
    (SELECT id FROM entities WHERE entity_key = 'chassis'),
    field_name,
    display_name,
    source_column,
    field_type,
    is_required,
    min_length,
    max_length,
    pattern,
    sort_order
FROM (VALUES
    ('chassis_number', 'Chassis #', 'chassisNo', 'string', true, 1, 50, NULL, 1),
    ('chassis_type', 'Chassis Type', 'chassisType', 'string', true, 2, 50, NULL, 2),
    ('chassis_size', 'Chassis Size', 'chassisSize', 'string', true, 2, 100, NULL, 3),
    ('chassis_owner', 'Chassis Owner', 'chassisOwner', 'string', true, 2, 100, NULL, 4),
    ('year', 'Year', 'year', 'string', false, NULL, NULL, '^[0-9]{4}$', 5),
    ('make', 'Make', 'make', 'string', false, NULL, 50, NULL, 6),
    ('model', 'Model', 'model', 'string', false, NULL, 50, NULL, 7),
    ('annual_inspection_date', 'Annual Inspection Date', 'AID', 'date', false, NULL, NULL, NULL, 8),
    ('itd', 'ITD', 'ITD', 'date', false, NULL, NULL, NULL, 9),
    ('branch', 'Branch', 'newTerminal', 'string', false, NULL, 100, NULL, 10),
    ('license_state', 'License State', 'licenceState', 'string', false, NULL, NULL, NULL, 11),
    ('license_number', 'License Number', 'licenceNumber', 'string', false, NULL, NULL, NULL, 12),
    ('vin', 'VIN', 'vin', 'string', false, NULL, NULL, NULL, 13),
    ('registration', 'Registration', 'registration', 'date', false, NULL, NULL, NULL, 14),
    ('inspection', 'Inspection', 'inspection', 'date', false, NULL, NULL, NULL, 15),
    ('insurance', 'Insurance', 'insurance', 'date', false, NULL, NULL, NULL, 16)
) AS t(field_name, display_name, source_column, field_type, is_required, min_length, max_length, pattern, sort_order);

-- Insert Fields for People Entity
INSERT INTO entity_fields (entity_id, field_name, display_name, source_column, field_type, is_required, min_length, max_length, pattern, sort_order)
SELECT 
    (SELECT id FROM entities WHERE entity_key = 'people'),
    field_name,
    display_name,
    source_column,
    field_type,
    is_required,
    min_length,
    max_length,
    pattern,
    sort_order
FROM (VALUES
    ('email', 'Email', 'email', 'email', true, NULL, NULL, '^[a-zA-Z0-9]([a-zA-Z0-9._+-])*[a-zA-Z0-9+]@[a-zA-Z0-9]([a-zA-Z0-9-])*[a-zA-Z0-9]\.([a-zA-Z]{2,4})+$', 1),
    ('first_name', 'First Name', 'firstName', 'string', true, 2, 50, NULL, 2),
    ('last_name', 'Last Name', 'lastName', 'string', true, 2, 50, NULL, 3),
    ('mobile', 'Mobile', 'mobileNumbers', 'string', true, NULL, NULL, '^\([0-9]{3}\) [0-9]{3}-[0-9]{4}$', 4),
    ('customer_id', 'Customer ID', 'CustomerID', 'string', true, 2, 100, NULL, 5),
    ('password', 'Password', 'password', 'string', true, 10, 50, '^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{10,})', 6),
    ('loads_permission', 'Loads Permission', 'customer_employee_load', 'boolean', false, NULL, NULL, NULL, 7),
    ('dropped_containers_permission', 'Dropped Containers Permission', 'dropped_containers', 'boolean', false, NULL, NULL, NULL, 8),
    ('account_payable_permission', 'Account Payable Permission', 'account_payable', 'boolean', false, NULL, NULL, NULL, 9),
    ('info_permission', 'Info Permission', 'customer_employee_load_info', 'boolean', false, NULL, NULL, NULL, 10),
    ('billing_permission', 'Billing Permission', 'customer_employee_load_billing', 'boolean', false, NULL, NULL, NULL, 11),
    ('documents_permission', 'Documents Permission', 'customer_employee_load_documents', 'boolean', false, NULL, NULL, NULL, 12),
    ('upload_documents_permission', 'Upload Documents Permission', 'customer_employee_load_upload_documents', 'boolean', false, NULL, NULL, NULL, 13),
    ('payments_permission', 'Payments Permission', 'customer_employee_load_payments', 'boolean', false, NULL, NULL, NULL, 14),
    ('tracking_permission', 'Tracking Permission', 'customer_employee_load_tracking', 'boolean', false, NULL, NULL, NULL, 15),
    ('service_messaging_permission', 'Service Messaging Permission', 'customer_employee_load_messaging', 'boolean', false, NULL, NULL, NULL, 16),
    ('summary_permission', 'Summary Permission', 'customer_employee_load_summary', 'boolean', false, NULL, NULL, NULL, 17),
    ('shipment_tracking_permission', 'Shipment Tracking Permission', 'customer_shipments', 'boolean', false, NULL, NULL, NULL, 18),
    ('customer_permission', 'Customer Permission', 'customer', 'boolean', false, NULL, NULL, NULL, 19)
) AS t(field_name, display_name, source_column, field_type, is_required, min_length, max_length, pattern, sort_order);

-- Insert Fields for Organization Entity
INSERT INTO entity_fields (entity_id, field_name, display_name, source_column, field_type, is_required, min_length, max_length, pattern, sort_order)
SELECT 
    (SELECT id FROM entities WHERE entity_key = 'organization'),
    field_name,
    display_name,
    source_column,
    field_type,
    is_required,
    min_length,
    max_length,
    pattern,
    sort_order
FROM (VALUES
    ('company_name', 'Company Name', 'company_name', 'string', true, 2, 100, NULL, 1),
    ('address', 'Address', 'address', 'string', true, 5, 200, NULL, 2),
    ('building_suite', 'Building/Suite', NULL, 'string', false, 5, 200, NULL, 3),
    ('city', 'City', 'city', 'string', true, 2, 50, NULL, 4),
    ('state', 'State', 'state', 'string', true, NULL, NULL, NULL, 5),
    ('country', 'Country', 'country', 'string', true, NULL, NULL, '^[A-Z]{2}$', 6),
    ('zip_code', 'Zip Code', 'zip_code', 'string', true, NULL, NULL, '^(?=(.*\d)).{2,}$', 7),
    ('main_contact_name', 'Main Contact Name', 'main_contact_name', 'string', false, 2, 100, NULL, 8),
    ('secondary_contact_name', 'Secondary Contact Name', 'secondary_contact_name', 'string', false, 2, 100, NULL, 9),
    ('secondary_phone', 'Secondary Phone', 'secondaryPhoneNo', 'string', false, NULL, NULL, '^(\+?[1-9]{1}[0-9]{1,14}|\(?\d{1,4}\)?[\s\-]?\d{1,4}[\s\-]?\d{1,4}[\s\-]?\d{1,4})$', 10),
    ('mobile', 'Mobile', 'mobile', 'string', false, NULL, NULL, '^(\+?[1-9]{1}[0-9]{1,14}|\(?\d{1,4}\)?[\s\-]?\d{1,4}[\s\-]?\d{1,4}[\s\-]?\d{1,4})$', 11),
    ('email', 'Email', 'email', 'string', false, NULL, NULL, '^([^@]+@[^@]+\s*,\s*)*[^@]+@[^@]+$', 12),
    ('billing_email', 'Billing Email', 'billingEmail', 'string', false, NULL, NULL, '^([^@]+@[^@]+\s*,\s*)*[^@]+@[^@]+$', 13),
    ('password', 'Password', 'password', 'string', false, 10, 50, '^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{10,})', 14),
    ('payment_terms_method', 'Payment Terms Method', 'defaultPaymentTerms.paymentTermsMethod', 'string', false, NULL, 50, NULL, 15),
    ('payment_terms_days', 'Payment Terms + Days', 'defaultPaymentTerms.day', 'number', false, NULL, NULL, NULL, 16),
    ('credit_limit', 'Credit Limit', 'credit_limit', 'number', false, NULL, NULL, NULL, 17),
    ('branch', 'Branch', 'branch', 'string', false, NULL, NULL, NULL, 18),
    ('organization_type', 'Organization Type', 'customerType', 'string', true, NULL, NULL, '^(?:ALL|CUSTOMER|TERMINAL|WAREHOUSE|CONTAINERRETURN|CHASSISPICK|CHASSISTERMINATION)$', 19),
    ('receiver_email', 'Receiver email', 'receiverEmail', 'string', false, NULL, NULL, '^([^@]+@[^@]+\s*,\s*)*[^@]+@[^@]+$', 20),
    ('mc_number', 'Mc number', 'mcNumber', 'string', false, NULL, NULL, '^.{2,}$', 21),
    ('fleet_customer', 'Fleet customer', 'fleetCustomer', 'string', false, NULL, NULL, NULL, 22),
    ('pay_type', 'Pay type', 'payType', 'string', false, NULL, 50, NULL, 23),
    ('currency_type', 'Currency Type', 'invoiceCurrencyWithCarrier', 'string', false, NULL, NULL, '^[A-Z]{3}$', 24),
    ('external_id', 'External ID', 'externalId', 'string', false, NULL, NULL, '^[A-Za-z0-9&+]+$', 25),
    ('latitude', 'Latitude', 'latitude', 'number', false, NULL, NULL, NULL, 26),
    ('longitude', 'Longitude', 'longitude', 'number', false, NULL, NULL, NULL, 27),
    ('notes', 'notes', 'notes', 'string', false, NULL, NULL, NULL, 28),
    ('office_hour_start', 'Office Hour Start', 'officeHoursStart', 'time', false, NULL, NULL, NULL, 29),
    ('office_hour_end', 'Office Hour End', 'officeHoursEnd', 'time', false, NULL, NULL, NULL, 30)
) AS t(field_name, display_name, source_column, field_type, is_required, min_length, max_length, pattern, sort_order);

-- Insert Fields for Drivers Entity
INSERT INTO entity_fields (entity_id, field_name, display_name, source_column, field_type, is_required, min_length, max_length, pattern, sort_order)
SELECT 
    (SELECT id FROM entities WHERE entity_key = 'drivers'),
    field_name,
    display_name,
    source_column,
    field_type,
    is_required,
    min_length,
    max_length,
    pattern,
    sort_order
FROM (VALUES
    ('first_name', 'First Name', 'name', 'string', true, 2, 50, NULL, 1),
    ('last_name', 'Last Name', 'lastName', 'string', true, 2, 50, NULL, 2),
    ('email', 'Email', 'email', 'email', true, 7, 50, '^[a-zA-Z0-9]([a-zA-Z0-9._+-])*[a-zA-Z0-9+]@[a-zA-Z0-9]([a-zA-Z0-9-])*[a-zA-Z0-9]\.([a-zA-Z]{2,4})+$', 3),
    ('phone', 'Phone', 'mobile', 'string', true, NULL, NULL, '^\d{3}-\d{3}-\d{4}$', 4),
    ('password', 'Password', 'password', 'string', true, 5, 20, '^[A-Za-z]+\d+!$', 5),
    ('username', 'Username', 'username', 'string', false, 3, 50, '^[a-z0-9]+$', 6),
    ('truck_number', 'Truck Number', 'truck', 'string', false, NULL, 50, NULL, 7),
    ('country_code', 'Country Code', 'country_code', 'string', false, NULL, NULL, '^[0-9]{1,3}$', 8),
    ('license_state', 'License State', 'licence', 'string', false, NULL, NULL, '^[A-Za-z\s]{2,50}$', 9),
    ('license_number', 'License Number', 'licenceNumber', 'string', false, NULL, NULL, '^[A-Z0-9]{1,15}$', 10),
    ('sealink_number', 'Sealink #', 'seaLinkNumber', 'string', false, NULL, NULL, '^[A-Z0-9]{1,20}$', 11),
    ('emergency_contact_name', 'Emergency Contact Name', 'EmergencyContactName', 'string', false, NULL, 100, NULL, 12),
    ('emergency_relation', 'Emergency Relation', 'EmergencyRelation', 'string', false, NULL, 50, NULL, 13),
    ('emergency_contact_number', 'Emergency Contact Number', 'EmergencyContactNumber', 'string', false, NULL, NULL, '^[0-9]{10}$', 14),
    ('social_security', 'Social Security #', 'socialSecurity', 'string', false, NULL, NULL, '^.*$', 15),
    ('billing_email', 'Billing Email', 'billingEmail', 'email', false, NULL, NULL, '^[a-zA-Z0-9]([a-zA-Z0-9._+-])*[a-zA-Z0-9+]@[a-zA-Z0-9]([a-zA-Z0-9-])*[a-zA-Z0-9]\.([a-zA-Z]{2,4})+$', 16),
    ('profile_type', 'Profile Type', 'profileType', 'array', false, NULL, NULL, NULL, 17),
    ('license_expiration', 'License Expiration', 'dlExp', 'date', false, NULL, NULL, NULL, 18),
    ('date_of_birth', 'Date of Birth', 'dob', 'date', false, NULL, NULL, NULL, 19),
    ('date_of_hire', 'Date of Hire', 'doh', 'date', false, NULL, NULL, NULL, 20),
    ('medical_expiration', 'Medical Expiration', 'medicalExp', 'date', false, NULL, NULL, NULL, 21),
    ('twic_expiration', 'Twic Expiration', 'twicExp', 'date', false, NULL, NULL, NULL, 22),
    ('sea_link_expiration', 'Sea Link Expiration', 'seaLinkExp', 'date', false, NULL, NULL, NULL, 23),
    ('branch', 'Branch', 'branch', 'string', false, NULL, 100, NULL, 24),
    ('external_id', 'External Id', 'externalSystemID', 'string', false, NULL, NULL, '^[0-9]+$', 25),
    ('hazmat', 'Hazmat', 'hazmat', 'boolean', false, NULL, NULL, '^(?i)(True|False|T|F|Yes|No)$', 26),
    ('home_branch_time_zone', 'Home Branch Time Zone', 'homeTerminalTimezone', 'string', false, NULL, 100, NULL, 27)
) AS t(field_name, display_name, source_column, field_type, is_required, min_length, max_length, pattern, sort_order);

-- Insert Fields for PerDiem Entity
INSERT INTO entity_fields (entity_id, field_name, display_name, source_column, field_type, is_required, min_length, max_length, pattern, sort_order)
SELECT 
    (SELECT id FROM entities WHERE entity_key = 'perdiem'),
    field_name,
    display_name,
    source_column,
    field_type,
    is_required,
    min_length,
    max_length,
    pattern,
    sort_order
FROM (VALUES
    ('customers', 'Customers', 'Customers', 'string', false, NULL, 100, NULL, 1),
    ('owner', 'Owner', 'Owner', 'string', true, NULL, 100, NULL, 2),
    ('size', 'Size', 'Size', 'string', false, NULL, 10, NULL, 3),
    ('type', 'Type', 'Type', 'string', true, NULL, 10, NULL, 4),
    ('tier_1', 'Tier #1', 'Tier #1', 'string', false, NULL, 50, NULL, 5),
    ('tier_2', 'Tier #2', 'Tier #2', 'string', false, NULL, 50, NULL, 6),
    ('tier_3', 'Tier #3', 'Tier #3', 'string', false, NULL, 50, NULL, 7),
    ('tier_4', 'Tier #4', 'Tier #4', 'string', false, NULL, 50, NULL, 8),
    ('import_freedays', 'Import Freedays', 'Import Freedays', 'string', false, NULL, 50, NULL, 9),
    ('export_freedays', 'Export Freedays', 'Export Freedays', 'string', false, NULL, 50, NULL, 10),
    ('holiday', 'Holiday', 'Holiday', 'string', false, NULL, 10, '^(true|false|True|False|TRUE|FALSE)$', 11),
    ('free_weekday', 'Free Weekday', 'Free Weekday', 'string', false, NULL, 10, '^(true|false|True|False|TRUE|FALSE)$', 12)
) AS t(field_name, display_name, source_column, field_type, is_required, min_length, max_length, pattern, sort_order);

-- Note: Tariff and Charge Profile entities have many fields (100+)
-- I'm including a subset here for brevity. You can expand these as needed.

-- Insert sample fields for Tariff Entity
INSERT INTO entity_fields (entity_id, field_name, display_name, source_column, field_type, is_required, min_length, max_length, sort_order)
SELECT 
    (SELECT id FROM entities WHERE entity_key = 'tariff'),
    field_name,
    display_name,
    source_column,
    field_type,
    is_required,
    min_length,
    max_length,
    sort_order
FROM (VALUES
    ('tariff_name', 'Tariff Name', NULL, 'string', true, 2, 100, 1),
    ('effective_start_date', 'Effective Start Date', NULL, 'date', false, NULL, NULL, 2),
    ('effective_end_date', 'Effective End Date', NULL, 'date', false, NULL, NULL, 3),
    ('load_type', 'Load Type', NULL, 'string', false, NULL, NULL, 4),
    ('branch', 'Branch', NULL, 'string', false, NULL, NULL, 5),
    ('customer', 'Customer', NULL, 'string', false, 2, 100, 6),
    ('pick_up_location', 'Pick Up Location', NULL, 'string', false, 2, 100, 7),
    ('delivery_location', 'Delivery Location', NULL, 'string', false, 2, 100, 8),
    ('return_location', 'Return Location', NULL, 'string', false, 2, 100, 9),
    ('charge_profile', 'Charge Profile', NULL, 'string', false, 2, 100, 10),
    ('vendor', 'Vendor', 'vendorType', 'string', false, NULL, NULL, 11)
) AS t(field_name, display_name, source_column, field_type, is_required, min_length, max_length, sort_order);

-- Insert sample fields for Charge Profile Entity  
INSERT INTO entity_fields (entity_id, field_name, display_name, source_column, field_type, is_required, min_length, max_length, sort_order)
SELECT 
    (SELECT id FROM entities WHERE entity_key = 'charge_profile'),
    field_name,
    display_name,
    source_column,
    field_type,
    is_required,
    min_length,
    max_length,
    sort_order
FROM (VALUES
    ('charge_profile_name', 'Charge Profile Name', 'name', 'string', true, 2, 100, 1),
    ('charge_name', 'Charge Name', 'chargeName', 'string', true, 2, 100, 2),
    ('charge_description', 'Charge Description', 'description', 'string', false, NULL, 500, 3),
    ('unit_of_measure', 'Unit of Measure', 'unitOfMeasure', 'string', true, NULL, 50, 4),
    ('effective_date_based_on', 'Effective date based on', 'effectiveDateBasedOn', 'string', false, NULL, 50, 5),
    ('charge_effective_start_date', 'Charge Effective Start Date', 'effectiveStartDate', 'date', false, NULL, NULL, 6),
    ('charge_effective_end_date', 'Charge Effective End Date', 'effectiveEndDate', 'date', false, NULL, NULL, 7),
    ('auto_add', 'Auto Add', 'autoAdd', 'string', false, NULL, NULL, 8),
    ('driver_pay_group', 'Driver Pay Group', 'driverGroup', 'string', false, NULL, NULL, 9),
    ('vendor_group', 'Vendor / Vendor Group', 'vendorGroup', 'string', false, NULL, NULL, 10),
    ('minimum_amount', 'Minimum Amount', 'minimumAmount', 'number', false, NULL, NULL, 11),
    ('free_units', 'Free Units', 'freeUnits', 'number', false, NULL, NULL, 12),
    ('amount', 'Amount', 'amount', 'number', false, NULL, NULL, 13),
    ('vendor', 'Vendor', 'vendorType', 'string', false, NULL, NULL, 14)
) AS t(field_name, display_name, source_column, field_type, is_required, min_length, max_length, sort_order);

-- Verify the data was inserted correctly
SELECT 
    e.name as entity_name,
    e.entity_key,
    e.api_endpoint,
    COUNT(ef.id) as field_count
FROM entities e
LEFT JOIN entity_fields ef ON e.id = ef.entity_id
GROUP BY e.id, e.name, e.entity_key, e.api_endpoint
ORDER BY e.name;