-- Auto-generated validation rules from MongoDB BulkuploadEntity collection
-- Extracted from actual working validation system
-- Generated on: 2025-09-26T01:13:30.912Z

-- IMPORTANT: Not modifying entity_fields table
-- field_name (PostgreSQL) = sourceColumn (MongoDB) - already populated
-- display_name (PostgreSQL) = name (MongoDB) - already populated
-- Only adding advanced validation rules to entity_validations table

-- Document 1: Base URL https://api.medlog.portpro.io
-- Contains 12 entities

-- ============================================
-- Entity: Load (Load)
-- Fields: 52
-- ============================================

-- Lookup validation: Load.Customer -> tmsCustomers.company_name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'tmsCustomers', 'company_name', 'Customer must be a valid tmsCustomers entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Load' AND ef.display_name = 'Customer';

-- Field Customer has 1 validation rule(s)

-- Enum validation (converted from regex): Load.Load Type
-- Original pattern: ^(Import|Export|Road)$
INSERT INTO entity_validations (entity_field_id, validation_type, enum_values, error_message)
SELECT ef.id, 'enum', '["Import","Export","Road"]', 'Load Type must be one of: Import, Export, Road'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Load' AND ef.display_name = 'Load Type';

-- Field Load Type has 1 validation rule(s)

-- Lookup validation: Load.Pick Up Location -> tmsCustomers.company_name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'tmsCustomers', 'company_name', 'Pick Up Location must be a valid tmsCustomers entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Load' AND ef.display_name = 'Pick Up Location';

-- Field Pick Up Location has 1 validation rule(s)

-- Lookup validation: Load.Delivery City/State -> tmsCustomers.company_name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'tmsCustomers', 'company_name', 'Delivery City/State must be a valid tmsCustomers entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Load' AND ef.display_name = 'Delivery City/State';

-- Field Delivery City/State has 1 validation rule(s)

-- Lookup validation: Load.Container Size -> containerSizes.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'containerSizes', 'name', 'Container Size must be a valid containerSizes entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Load' AND ef.display_name = 'Container Size';

-- Field Container Size has 1 validation rule(s)

-- Lookup validation: Load.Container Type -> containerTypes.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'containerTypes', 'name', 'Container Type must be a valid containerTypes entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Load' AND ef.display_name = 'Container Type';

-- Field Container Type has 1 validation rule(s)

-- Lookup validation: Load.Owner -> containerOwners.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'containerOwners', 'name', 'Owner must be a valid containerOwners entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Load' AND ef.display_name = 'Owner';

-- Field Owner has 1 validation rule(s)

-- Lookup validation: Load.Container Return -> tmsCustomers.company_name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'tmsCustomers', 'company_name', 'Container Return must be a valid tmsCustomers entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Load' AND ef.display_name = 'Container Return';

-- Field Container Return has 1 validation rule(s)

-- Lookup validation: Load.Hook Chassis Location -> tmsCustomers.company_name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'tmsCustomers', 'company_name', 'Hook Chassis Location must be a valid tmsCustomers entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Load' AND ef.display_name = 'Hook Chassis Location';

-- Field Hook Chassis Location has 1 validation rule(s)

-- Lookup validation: Load.Terminate Chassis Location -> tmsCustomers.company_name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'tmsCustomers', 'company_name', 'Terminate Chassis Location must be a valid tmsCustomers entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Load' AND ef.display_name = 'Terminate Chassis Location';

-- Field Terminate Chassis Location has 1 validation rule(s)

-- Lookup validation: Load.Chassis # -> chassis.chassis_no
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'chassis', 'chassis_no', 'Chassis # must be a valid chassis entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Load' AND ef.display_name = 'Chassis #';

-- Field Chassis # has 1 validation rule(s)

-- Lookup validation: Load.Chassis Owner -> chassisOwners.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'chassisOwners', 'name', 'Chassis Owner must be a valid chassisOwners entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Load' AND ef.display_name = 'Chassis Owner';

-- Field Chassis Owner has 1 validation rule(s)

-- Lookup validation: Load.Chassis Size -> chassisSizes.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'chassisSizes', 'name', 'Chassis Size must be a valid chassisSizes entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Load' AND ef.display_name = 'Chassis Size';

-- Field Chassis Size has 1 validation rule(s)

-- Lookup validation: Load.Chassis Type -> chassisTypes.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'chassisTypes', 'name', 'Chassis Type must be a valid chassisTypes entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Load' AND ef.display_name = 'Chassis Type';

-- Field Chassis Type has 1 validation rule(s)

-- Lookup validation: Load.Branch -> branches.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'branches', 'name', 'Branch must be a valid branches entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Load' AND ef.display_name = 'Branch';

-- Field Branch has 1 validation rule(s)

-- Lookup validation: Load.Commodity -> commodities.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'commodities', 'name', 'Commodity must be a valid commodities entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Load' AND ef.display_name = 'Commodity';

-- Field Commodity has 1 validation rule(s)

-- Enum validation (converted from regex): Load.Hazmat
-- Original pattern: ^(?i)(true|false)$
INSERT INTO entity_validations (entity_field_id, validation_type, enum_values, error_message)
SELECT ef.id, 'enum', '["true","false"]', 'Hazmat must be one of: true, false'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Load' AND ef.display_name = 'Hazmat';

-- Field Hazmat has 1 validation rule(s)

-- Enum validation (converted from regex): Load.Hot
-- Original pattern: ^(?i)(true|false)$
INSERT INTO entity_validations (entity_field_id, validation_type, enum_values, error_message)
SELECT ef.id, 'enum', '["true","false"]', 'Hot must be one of: true, false'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Load' AND ef.display_name = 'Hot';

-- Field Hot has 1 validation rule(s)

-- Enum validation (converted from regex): Load.Overweight
-- Original pattern: ^(?i)(true|false)$
INSERT INTO entity_validations (entity_field_id, validation_type, enum_values, error_message)
SELECT ef.id, 'enum', '["true","false"]', 'Overweight must be one of: true, false'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Load' AND ef.display_name = 'Overweight';

-- Field Overweight has 1 validation rule(s)

-- Enum validation (converted from regex): Load.Routes
-- Original pattern: ^(Pick And Run \+ Live|Pick And Run \+ Drop & Hook|Prepull \+ Drop & Hook|Prepull \+ Live|One Way Move|Pick And Run \+ Gray Pool|Prepull \+ Gray Pool|Shunt|Pick and Lift \+ Deliver and Lift \+ Return|Pick and Lift \+ Live)$
INSERT INTO entity_validations (entity_field_id, validation_type, enum_values, error_message)
SELECT ef.id, 'enum', '["Pick And Run + Live","Pick And Run + Drop & Hook","Prepull + Drop & Hook","Prepull + Live","One Way Move","Pick And Run + Gray Pool","Prepull + Gray Pool","Shunt","Pick and Lift + Deliver and Lift + Return","Pick and Lift + Live"]', 'Routes must be one of: Pick And Run + Live, Pick And Run + Drop & Hook, Prepull + Drop & Hook, Prepull + Live, One Way Move, Pick And Run + Gray Pool, Prepull + Gray Pool, Shunt, Pick and Lift + Deliver and Lift + Return, Pick and Lift + Live'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Load' AND ef.display_name = 'Routes';

-- Field Routes has 1 validation rule(s)

-- Enum validation (converted from regex): Load.Genset
-- Original pattern: ^(?i)(true|false)$
INSERT INTO entity_validations (entity_field_id, validation_type, enum_values, error_message)
SELECT ef.id, 'enum', '["true","false"]', 'Genset must be one of: true, false'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Load' AND ef.display_name = 'Genset';

-- Field Genset has 1 validation rule(s)

-- Enum validation (converted from regex): Load.Liquor
-- Original pattern: ^(?i)(true|false)$
INSERT INTO entity_validations (entity_field_id, validation_type, enum_values, error_message)
SELECT ef.id, 'enum', '["true","false"]', 'Liquor must be one of: true, false'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Load' AND ef.display_name = 'Liquor';

-- Field Liquor has 1 validation rule(s)

-- Enum validation (converted from regex): Load.Overheight
-- Original pattern: ^(?i)(true|false)$
INSERT INTO entity_validations (entity_field_id, validation_type, enum_values, error_message)
SELECT ef.id, 'enum', '["true","false"]', 'Overheight must be one of: true, false'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Load' AND ef.display_name = 'Overheight';

-- Field Overheight has 1 validation rule(s)

-- Enum validation (converted from regex): Load.Street Turn
-- Original pattern: ^(?i)(true|false)$
INSERT INTO entity_validations (entity_field_id, validation_type, enum_values, error_message)
SELECT ef.id, 'enum', '["true","false"]', 'Street Turn must be one of: true, false'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Load' AND ef.display_name = 'Street Turn';

-- Field Street Turn has 1 validation rule(s)

-- Enum validation (converted from regex): Load.Scale
-- Original pattern: ^(?i)(true|false)$
INSERT INTO entity_validations (entity_field_id, validation_type, enum_values, error_message)
SELECT ef.id, 'enum', '["true","false"]', 'Scale must be one of: true, false'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Load' AND ef.display_name = 'Scale';

-- Field Scale has 1 validation rule(s)

-- Entity Load completed: 52 fields processed

-- ============================================
-- Entity: Trailers (Trailers)
-- Fields: 15
-- ============================================

-- Regex validation: Trailers.Year
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^[0-9]{4}$', 'Invalid format for Year'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Trailers' AND ef.display_name = 'Year';

-- Field Year has 1 validation rule(s)

-- Regex validation: Trailers.VIN
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^[A-Z0-9]{9,17}$', 'Invalid format for VIN'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Trailers' AND ef.display_name = 'VIN';

-- Field VIN has 1 validation rule(s)

-- Regex validation: Trailers.License Plate State
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^[A-Z]{2}$', 'Invalid format for License Plate State'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Trailers' AND ef.display_name = 'License Plate State';

-- Field License Plate State has 1 validation rule(s)

-- Regex validation: Trailers.License Plate #
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^[A-Z0-9]{1,10}$', 'Invalid format for License Plate #'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Trailers' AND ef.display_name = 'License Plate #';

-- Field License Plate # has 1 validation rule(s)

-- Enum validation (converted from regex): Trailers.Trailer Type
-- Original pattern: ^(Dry Van|Reefer|Flat Bed|Drop Deck|Low Boy|Double Drop Deck)$
INSERT INTO entity_validations (entity_field_id, validation_type, enum_values, error_message)
SELECT ef.id, 'enum', '["Dry Van","Reefer","Flat Bed","Drop Deck","Low Boy","Double Drop Deck"]', 'Trailer Type must be one of: Dry Van, Reefer, Flat Bed, Drop Deck, Low Boy, Double Drop Deck'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Trailers' AND ef.display_name = 'Trailer Type';

-- Field Trailer Type has 1 validation rule(s)

-- Enum validation (converted from regex): Trailers.Trailer Size
-- Original pattern: ^(26'|40'|45'|48'|53')$
INSERT INTO entity_validations (entity_field_id, validation_type, enum_values, error_message)
SELECT ef.id, 'enum', '["26'","40'","45'","48'","53'"]', 'Trailer Size must be one of: 26', 40', 45', 48', 53''
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Trailers' AND ef.display_name = 'Trailer Size';

-- Field Trailer Size has 1 validation rule(s)

-- Lookup validation: Trailers.Branch -> branches.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'branches', 'name', 'Branch must be a valid branches entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Trailers' AND ef.display_name = 'Branch';

-- Field Branch has 1 validation rule(s)

-- Entity Trailers completed: 15 fields processed

-- ============================================
-- Entity: Truck Owner (Truck Owner)
-- Fields: 10
-- ============================================

-- Regex validation: Truck Owner.MC #
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^[a-zA-Z0-9 ]*$', 'Invalid format for MC #'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Truck Owner' AND ef.display_name = 'MC #';

-- Field MC # has 1 validation rule(s)

-- Regex validation: Truck Owner.Mobile
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^\([0-9]{3}\) [0-9]{3}-[0-9]{4}$', 'Invalid format for Mobile'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Truck Owner' AND ef.display_name = 'Mobile';

-- Field Mobile has 1 validation rule(s)

-- Regex validation: Truck Owner.Email
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^[a-zA-Z0-9]([a-zA-Z0-9._-])*[a-zA-Z0-9]@[a-zA-Z0-9]([a-zA-Z0-9-])*[a-zA-Z0-9]\.([a-zA-Z]{2,4})+$', 'Invalid format for Email'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Truck Owner' AND ef.display_name = 'Email';

-- Field Email has 1 validation rule(s)

-- Entity Truck Owner completed: 10 fields processed

-- ============================================
-- Entity: Trucks (Trucks)
-- Fields: 17
-- ============================================

-- Regex validation: Trucks.License State
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^[A-Z]{2}$', 'Invalid format for License State'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Trucks' AND ef.display_name = 'License State';

-- Field License State has 1 validation rule(s)

-- Regex validation: Trucks.License Plate #
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^[A-Z0-9]{1,10}$', 'Invalid format for License Plate #'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Trucks' AND ef.display_name = 'License Plate #';

-- Field License Plate # has 1 validation rule(s)

-- Regex validation: Trucks.Year
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^[0-9]{4}$', 'Invalid format for Year'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Trucks' AND ef.display_name = 'Year';

-- Field Year has 1 validation rule(s)

-- Lookup validation: Trucks.Truck Owner -> fleetOwners.company_name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'fleetOwners', 'company_name', 'Truck Owner must be a valid fleetOwners entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Trucks' AND ef.display_name = 'Truck Owner';

-- Field Truck Owner has 1 validation rule(s)

-- Lookup validation: Trucks.Branch -> branches.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'branches', 'name', 'Branch must be a valid branches entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Trucks' AND ef.display_name = 'Branch';

-- Field Branch has 1 validation rule(s)

-- Entity Trucks completed: 17 fields processed

-- ============================================
-- Entity: Users (Users)
-- Fields: 8
-- ============================================

-- Regex validation: Users.Phone
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^\([0-9]{3}\) [0-9]{3}-[0-9]{4}$', 'Invalid format for Phone'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Users' AND ef.display_name = 'Phone';

-- Field Phone has 1 validation rule(s)

-- Regex validation: Users.Email*
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^[a-zA-Z0-9]([a-zA-Z0-9._-])*[a-zA-Z0-9]@[a-zA-Z0-9]([a-zA-Z0-9-])*[a-zA-Z0-9]\.([a-zA-Z]{2,4})+$', 'Invalid format for Email*'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Users' AND ef.display_name = 'Email*';

-- Field Email* has 1 validation rule(s)

-- Regex validation: Users.Password*
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{10,})', 'Invalid format for Password*'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Users' AND ef.display_name = 'Password*';

-- Field Password* has 1 validation rule(s)

-- Regex validation: Users.System Roles*
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(?:\s*(?:Admin|CSR|Sales\sAgent|Mechanics)\s*)(?:,\s*(?:Admin|CSR|Sales\sAgent|Mechanics)\s*)*$', 'Invalid format for System Roles*'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Users' AND ef.display_name = 'System Roles*';

-- Field System Roles* has 1 validation rule(s)

-- Lookup validation: Users.Terminal* -> branches.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'branches', 'name', 'Terminal* must be a valid branches entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Users' AND ef.display_name = 'Terminal*';

-- Field Terminal* has 1 validation rule(s)

-- Lookup validation: Users.Custom Role -> getAllPermissionRoles.roleName
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'getAllPermissionRoles', 'roleName', 'Custom Role must be a valid getAllPermissionRoles entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Users' AND ef.display_name = 'Custom Role';

-- Field Custom Role has 1 validation rule(s)

-- Entity Users completed: 8 fields processed

-- ============================================
-- Entity: Charge Profile (Charge Profile)
-- Fields: 117
-- ============================================

-- Lookup validation: Charge Profile.Charge Name -> chargeCodes.value
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'chargeCodes', 'value', 'Charge Name must be a valid chargeCodes entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Charge Name';

-- Field Charge Name has 1 validation rule(s)

-- Enum validation (converted from regex): Charge Profile.Unit of Measure
-- Original pattern: ^(Per Kilograms|Per Pounds|Per Kilometers|Per Miles|Percentage|Per Day|Per Hour|Per Road Toll|Fixed|Per 15min|Per 30min|Per 45min|Radius Rate|Compounding Radius Rate|Per Move|Percentage By Leg|Percentage By Move|Per Hour Blocks)$
INSERT INTO entity_validations (entity_field_id, validation_type, enum_values, error_message)
SELECT ef.id, 'enum', '["Per Kilograms","Per Pounds","Per Kilometers","Per Miles","Percentage","Per Day","Per Hour","Per Road Toll","Fixed","Per 15min","Per 30min","Per 45min","Radius Rate","Compounding Radius Rate","Per Move","Percentage By Leg","Percentage By Move","Per Hour Blocks"]', 'Unit of Measure must be one of: Per Kilograms, Per Pounds, Per Kilometers, Per Miles, Percentage, Per Day, Per Hour, Per Road Toll, Fixed, Per 15min, Per 30min, Per 45min, Radius Rate, Compounding Radius Rate, Per Move, Percentage By Leg, Percentage By Move, Per Hour Blocks'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Unit of Measure';

-- Field Unit of Measure has 1 validation rule(s)

-- Regex validation: Charge Profile.Effective date based on
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(CURRENT DATE|CREATED AT|MOVE START DATE|DEPARTED FROM CHASSIS|ARRIVED TO CHASSIS|ARRIVED AT PULL CONTAINER|DEPARTED FROM PULL CONTAINER|ARRIVED AT DELIVER LOAD|DEPARTED FROM DELIVER LOAD|ARRIVED AT DROP CONTAINER|DEPARTED FROM DROP CONTAINER|ARRIVED AT HOOK CONTAINER|DEPARTED FROM HOOK CONTAINER|ARRIVED AT RETURN CONTAINER|DEPARTED FROM RETURN CONTAINER|ARRIVED AT CHASSIS TERMINATION|DEPARTED FROM CHASSIS TERMINATION|ARRIVED AT STOP OFF|DEPARTED FROM STOP OFF|COMPLETED|PICKUP APT|DELIVERY APT|RETURN APT)$', 'Invalid format for Effective date based on'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Effective date based on';

-- Field Effective date based on has 1 validation rule(s)

-- Enum validation (converted from regex): Charge Profile.Auto Add
-- Original pattern: ^(Yes|No)$
INSERT INTO entity_validations (entity_field_id, validation_type, enum_values, error_message)
SELECT ef.id, 'enum', '["Yes","No"]', 'Auto Add must be one of: Yes, No'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Auto Add';

-- Field Auto Add has 1 validation rule(s)

-- Lookup validation: Charge Profile.Driver Pay Group -> driverGroups.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'driverGroups', 'name', 'Driver Pay Group must be a valid driverGroups entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Driver Pay Group';

-- Field Driver Pay Group has 1 validation rule(s)

-- Lookup validation: Charge Profile.Vendor / Vendor Group -> carrierGroups.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'carrierGroups', 'name', 'Vendor / Vendor Group must be a valid carrierGroups entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Vendor / Vendor Group';

-- Field Vendor / Vendor Group has 1 validation rule(s)

-- Regex validation: Charge Profile.Calculate From This
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^\b(Enroute to Chassis|Arrived to Chassis|Enroute to Pick Container|Arrived at Pick Container|Enroute to Drop Container|Dropped|Enroute to Hook Container|Arrived to Hook Container|Enroute to Deliver Load|Arrived at Deliver Load|Enroute to Return Load|Arrived at Return Load|Enroute to Return Chassis|Arrived to Return Chassis|COMPLETED|PICKUP APT|DELIVERY APT|RETURN APT|READY TO RETURN|POD IN|POD OUT|Enroute to Lift Off|Arrived at Lift Off|Enroute to Lift On|Arrived at Lift On|Enroute to Stop Off|Arrived at Stop Off)\b(?:,\s*\b(Enroute to Chassis|Arrived to Chassis|Enroute to Pick Container|Arrived at Pick Container|Enroute to Drop Container|Dropped|Enroute to Hook Container|Arrived to Hook Container|Enroute to Deliver Load|Arrived at Deliver Load|Enroute to Return Load|Arrived at Return Load|Enroute to Return Chassis|Arrived to Return Chassis|COMPLETED|PICKUP APT|DELIVERY APT|RETURN APT|READY TO RETURN|POD IN|POD OUT|Enroute to Lift Off|Arrived at Lift Off|Enroute to Lift On|Arrived at Lift On|Enroute to Stop Off|Arrived at Stop Off)\b)*$', 'Invalid format for Calculate From This'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Calculate From This';

-- Field Calculate From This has 1 validation rule(s)

-- Regex validation: Charge Profile.Calculate From This Event
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^\b(Enroute to Chassis|Arrived to Chassis|Enroute to Pick Container|Arrived at Pick Container|Enroute to Drop Container|Dropped|Enroute to Hook Container|Arrived to Hook Container|Enroute to Deliver Load|Arrived at Deliver Load|Enroute to Return Load|Arrived at Return Load|Enroute to Return Chassis|Arrived to Return Chassis|COMPLETED|PICKUP APT|DELIVERY APT|RETURN APT|READY TO RETURN|POD IN|POD OUT|Enroute to Lift Off|Arrived at Lift Off|Enroute to Lift On|Arrived at Lift On|Enroute to Stop Off|Arrived at Stop Off)\b(?:,\s*\b(Enroute to Chassis|Arrived to Chassis|Enroute to Pick Container|Arrived at Pick Container|Enroute to Drop Container|Dropped|Enroute to Hook Container|Arrived to Hook Container|Enroute to Deliver Load|Arrived at Deliver Load|Enroute to Return Load|Arrived at Return Load|Enroute to Return Chassis|Arrived to Return Chassis|COMPLETED|PICKUP APT|DELIVERY APT|RETURN APT|READY TO RETURN|POD IN|POD OUT|Enroute to Lift Off|Arrived at Lift Off|Enroute to Lift On|Arrived at Lift On|Enroute to Stop Off|Arrived at Stop Off)\b)*$', 'Invalid format for Calculate From This Event'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Calculate From This Event';

-- Field Calculate From This Event has 1 validation rule(s)

-- Regex validation: Charge Profile.Calculate To This
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^\b(Enroute to Chassis|Arrived to Chassis|Enroute to Pick Container|Arrived at Pick Container|Enroute to Drop Container|Dropped|Enroute to Hook Container|Arrived to Hook Container|Enroute to Deliver Load|Arrived at Deliver Load|Enroute to Return Load|Arrived at Return Load|Enroute to Return Chassis|Arrived to Return Chassis|COMPLETED|PICKUP APT|DELIVERY APT|RETURN APT|READY TO RETURN|POD IN|POD OUT|Enroute to Lift Off|Arrived at Lift Off|Enroute to Lift On|Arrived at Lift On|Enroute to Stop Off|Arrived at Stop Off)\b(?:,\s*\b(Enroute to Chassis|Arrived to Chassis|Enroute to Pick Container|Arrived at Pick Container|Enroute to Drop Container|Dropped|Enroute to Hook Container|Arrived to Hook Container|Enroute to Deliver Load|Arrived at Deliver Load|Enroute to Return Load|Arrived at Return Load|Enroute to Return Chassis|Arrived to Return Chassis|COMPLETED|PICKUP APT|DELIVERY APT|RETURN APT|READY TO RETURN|POD IN|POD OUT|Enroute to Lift Off|Arrived at Lift Off|Enroute to Lift On|Arrived at Lift On|Enroute to Stop Off|Arrived at Stop Off)\b)*$', 'Invalid format for Calculate To This'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Calculate To This';

-- Field Calculate To This has 1 validation rule(s)

-- Regex validation: Charge Profile.Calculate To This Event
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^\b(Enroute to Chassis|Arrived to Chassis|Enroute to Pick Container|Arrived at Pick Container|Enroute to Drop Container|Dropped|Enroute to Hook Container|Arrived to Hook Container|Enroute to Deliver Load|Arrived at Deliver Load|Enroute to Return Load|Arrived at Return Load|Enroute to Return Chassis|Arrived to Return Chassis|COMPLETED|PICKUP APT|DELIVERY APT|RETURN APT|READY TO RETURN|POD IN|POD OUT|Enroute to Lift Off|Arrived at Lift Off|Enroute to Lift On|Arrived at Lift On|Enroute to Stop Off|Arrived at Stop Off)\b(?:,\s*\b(Enroute to Chassis|Arrived to Chassis|Enroute to Pick Container|Arrived at Pick Container|Enroute to Drop Container|Dropped|Enroute to Hook Container|Arrived to Hook Container|Enroute to Deliver Load|Arrived at Deliver Load|Enroute to Return Load|Arrived at Return Load|Enroute to Return Chassis|Arrived to Return Chassis|COMPLETED|PICKUP APT|DELIVERY APT|RETURN APT|READY TO RETURN|POD IN|POD OUT|Enroute to Lift Off|Arrived at Lift Off|Enroute to Lift On|Arrived at Lift On|Enroute to Stop Off|Arrived at Stop Off)\b)*$', 'Invalid format for Calculate To This Event'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Calculate To This Event';

-- Field Calculate To This Event has 1 validation rule(s)

-- Regex validation: Charge Profile.Calculate In This Event
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^\b(Enroute to Chassis|Arrived to Chassis|Enroute to Pick Container|Arrived at Pick Container|Enroute to Drop Container|Dropped|Enroute to Hook Container|Arrived to Hook Container|Enroute to Deliver Load|Arrived at Deliver Load|Enroute to Return Load|Arrived at Return Load|Enroute to Return Chassis|Arrived to Return Chassis|COMPLETED|PICKUP APT|DELIVERY APT|RETURN APT|READY TO RETURN|POD IN|POD OUT|Enroute to Lift Off|Arrived at Lift Off|Enroute to Lift On|Arrived at Lift On|Enroute to Stop Off|Arrived at Stop Off)\b(?:,\s*\b(Enroute to Chassis|Arrived to Chassis|Enroute to Pick Container|Arrived at Pick Container|Enroute to Drop Container|Dropped|Enroute to Hook Container|Arrived to Hook Container|Enroute to Deliver Load|Arrived at Deliver Load|Enroute to Return Load|Arrived at Return Load|Enroute to Return Chassis|Arrived to Return Chassis|COMPLETED|PICKUP APT|DELIVERY APT|RETURN APT|READY TO RETURN|POD IN|POD OUT|Enroute to Lift Off|Arrived at Lift Off|Enroute to Lift On|Arrived at Lift On|Enroute to Stop Off|Arrived at Stop Off)\b)*$', 'Invalid format for Calculate In This Event'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Calculate In This Event';

-- Field Calculate In This Event has 1 validation rule(s)

-- Regex validation: Charge Profile.Calculate For Exact Events
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^\b(Enroute to Chassis|Arrived to Chassis|Enroute to Pick Container|Arrived at Pick Container|Enroute to Drop Container|Dropped|Enroute to Hook Container|Arrived to Hook Container|Enroute to Deliver Load|Arrived at Deliver Load|Enroute to Return Load|Arrived at Return Load|Enroute to Return Chassis|Arrived to Return Chassis|COMPLETED|PICKUP APT|DELIVERY APT|RETURN APT|READY TO RETURN|POD IN|POD OUT|Enroute to Lift Off|Arrived at Lift Off|Enroute to Lift On|Arrived at Lift On|Enroute to Stop Off|Arrived at Stop Off)\b(?:,\s*\b(Enroute to Chassis|Arrived to Chassis|Enroute to Pick Container|Arrived at Pick Container|Enroute to Drop Container|Dropped|Enroute to Hook Container|Arrived to Hook Container|Enroute to Deliver Load|Arrived at Deliver Load|Enroute to Return Load|Arrived at Return Load|Enroute to Return Chassis|Arrived to Return Chassis|COMPLETED|PICKUP APT|DELIVERY APT|RETURN APT|READY TO RETURN|POD IN|POD OUT|Enroute to Lift Off|Arrived at Lift Off|Enroute to Lift On|Arrived at Lift On|Enroute to Stop Off|Arrived at Stop Off)\b)*$', 'Invalid format for Calculate For Exact Events'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Calculate For Exact Events';

-- Field Calculate For Exact Events has 1 validation rule(s)

-- Enum validation (converted from regex): Charge Profile.From Legs
-- Original pattern: ^(Pick Up Container|Deliver Container|Return Container|Drop Container|Stop Off|Terminate Chassis|Completed|Hook Container|Lift Off|Lift On|Deliver Load - Drop & Hook|Hook Chassis|Drop Chassis)$
INSERT INTO entity_validations (entity_field_id, validation_type, enum_values, error_message)
SELECT ef.id, 'enum', '["Pick Up Container","Deliver Container","Return Container","Drop Container","Stop Off","Terminate Chassis","Completed","Hook Container","Lift Off","Lift On","Deliver Load - Drop & Hook","Hook Chassis","Drop Chassis"]', 'From Legs must be one of: Pick Up Container, Deliver Container, Return Container, Drop Container, Stop Off, Terminate Chassis, Completed, Hook Container, Lift Off, Lift On, Deliver Load - Drop & Hook, Hook Chassis, Drop Chassis'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'From Legs';

-- Field From Legs has 1 validation rule(s)

-- Enum validation (converted from regex): Charge Profile.To Legs
-- Original pattern: ^(Pick Up Container|Deliver Container|Return Container|Drop Container|Stop Off|Terminate Chassis|Completed|Hook Container|Lift Off|Lift On|Deliver Load - Drop & Hook|Hook Chassis|Drop Chassis)$
INSERT INTO entity_validations (entity_field_id, validation_type, enum_values, error_message)
SELECT ef.id, 'enum', '["Pick Up Container","Deliver Container","Return Container","Drop Container","Stop Off","Terminate Chassis","Completed","Hook Container","Lift Off","Lift On","Deliver Load - Drop & Hook","Hook Chassis","Drop Chassis"]', 'To Legs must be one of: Pick Up Container, Deliver Container, Return Container, Drop Container, Stop Off, Terminate Chassis, Completed, Hook Container, Lift Off, Lift On, Deliver Load - Drop & Hook, Hook Chassis, Drop Chassis'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'To Legs';

-- Field To Legs has 1 validation rule(s)

-- Lookup validation: Charge Profile.From Leg Event Location -> tmsCustomers.company_name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'tmsCustomers', 'company_name', 'From Leg Event Location must be a valid tmsCustomers entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'From Leg Event Location';

-- Field From Leg Event Location has 1 validation rule(s)

-- Lookup validation: Charge Profile.To Leg Event Location -> tmsCustomers.company_name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'tmsCustomers', 'company_name', 'To Leg Event Location must be a valid tmsCustomers entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'To Leg Event Location';

-- Field To Leg Event Location has 1 validation rule(s)

-- Enum validation (converted from regex): Charge Profile.Radius Rate
-- Original pattern: ^(fixed|perUnit)$
INSERT INTO entity_validations (entity_field_id, validation_type, enum_values, error_message)
SELECT ef.id, 'enum', '["fixed","perUnit"]', 'Radius Rate must be one of: fixed, perUnit'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Radius Rate';

-- Field Radius Rate has 1 validation rule(s)

-- Enum validation (converted from regex): Charge Profile.If Event
-- Original pattern: ^(Pick Up Container|Deliver Container|Return Container|Drop Container|Stop Off|Terminate Chassis|Completed|Hook Container|Lift Off|Lift On|Deliver Load - Drop & Hook|Hook Chassis|Drop Chassis)$
INSERT INTO entity_validations (entity_field_id, validation_type, enum_values, error_message)
SELECT ef.id, 'enum', '["Pick Up Container","Deliver Container","Return Container","Drop Container","Stop Off","Terminate Chassis","Completed","Hook Container","Lift Off","Lift On","Deliver Load - Drop & Hook","Hook Chassis","Drop Chassis"]', 'If Event must be one of: Pick Up Container, Deliver Container, Return Container, Drop Container, Stop Off, Terminate Chassis, Completed, Hook Container, Lift Off, Lift On, Deliver Load - Drop & Hook, Hook Chassis, Drop Chassis'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'If Event';

-- Field If Event has 1 validation rule(s)

-- Lookup validation: Charge Profile.Event Location -> tmsCustomers.company_name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'tmsCustomers', 'company_name', 'Event Location must be a valid tmsCustomers entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Event Location';

-- Field Event Location has 1 validation rule(s)

-- Regex validation: Charge Profile.Event Time
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^Arrived|Departure$', 'Invalid format for Event Time'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Event Time';

-- Field Event Time has 1 validation rule(s)

-- Lookup validation: Charge Profile.Customer(any in) -> branches.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'branches', 'name', 'Customer(any in) must be a valid branches entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Customer(any in)';

-- Field Customer(any in) has 1 validation rule(s)

-- Lookup validation: Charge Profile.Customer(not in) -> branches.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'branches', 'name', 'Customer(not in) must be a valid branches entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Customer(not in)';

-- Field Customer(not in) has 1 validation rule(s)

-- Lookup validation: Charge Profile.Warehouse(any in) -> branches.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'branches', 'name', 'Warehouse(any in) must be a valid branches entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Warehouse(any in)';

-- Field Warehouse(any in) has 1 validation rule(s)

-- Lookup validation: Charge Profile.Warehouse(not in) -> branches.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'branches', 'name', 'Warehouse(not in) must be a valid branches entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Warehouse(not in)';

-- Field Warehouse(not in) has 1 validation rule(s)

-- Lookup validation: Charge Profile.Chassis Pick Up(any in) -> branches.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'branches', 'name', 'Chassis Pick Up(any in) must be a valid branches entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Chassis Pick Up(any in)';

-- Field Chassis Pick Up(any in) has 1 validation rule(s)

-- Lookup validation: Charge Profile.Chassis Pick Up(not in) -> branches.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'branches', 'name', 'Chassis Pick Up(not in) must be a valid branches entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Chassis Pick Up(not in)';

-- Field Chassis Pick Up(not in) has 1 validation rule(s)

-- Lookup validation: Charge Profile.Container Return(any in) -> branches.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'branches', 'name', 'Container Return(any in) must be a valid branches entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Container Return(any in)';

-- Field Container Return(any in) has 1 validation rule(s)

-- Lookup validation: Charge Profile.Container Return(not in) -> branches.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'branches', 'name', 'Container Return(not in) must be a valid branches entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Container Return(not in)';

-- Field Container Return(not in) has 1 validation rule(s)

-- Lookup validation: Charge Profile.Chassis Term(any in) -> branches.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'branches', 'name', 'Chassis Term(any in) must be a valid branches entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Chassis Term(any in)';

-- Field Chassis Term(any in) has 1 validation rule(s)

-- Lookup validation: Charge Profile.Chassis Term(not in) -> branches.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'branches', 'name', 'Chassis Term(not in) must be a valid branches entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Chassis Term(not in)';

-- Field Chassis Term(not in) has 1 validation rule(s)

-- Lookup validation: Charge Profile.Container Type(any in) -> containerTypes.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'containerTypes', 'name', 'Container Type(any in) must be a valid containerTypes entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Container Type(any in)';

-- Field Container Type(any in) has 1 validation rule(s)

-- Lookup validation: Charge Profile.Container Type(not in) -> containerTypes.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'containerTypes', 'name', 'Container Type(not in) must be a valid containerTypes entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Container Type(not in)';

-- Field Container Type(not in) has 1 validation rule(s)

-- Lookup validation: Charge Profile.Container Size(any in) -> containerSizes.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'containerSizes', 'name', 'Container Size(any in) must be a valid containerSizes entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Container Size(any in)';

-- Field Container Size(any in) has 1 validation rule(s)

-- Lookup validation: Charge Profile.Container Size(not in) -> containerSizes.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'containerSizes', 'name', 'Container Size(not in) must be a valid containerSizes entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Container Size(not in)';

-- Field Container Size(not in) has 1 validation rule(s)

-- Lookup validation: Charge Profile.Container Owner(any in) -> containerOwners.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'containerOwners', 'name', 'Container Owner(any in) must be a valid containerOwners entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Container Owner(any in)';

-- Field Container Owner(any in) has 1 validation rule(s)

-- Lookup validation: Charge Profile.Container Owner(not in) -> containerOwners.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'containerOwners', 'name', 'Container Owner(not in) must be a valid containerOwners entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Container Owner(not in)';

-- Field Container Owner(not in) has 1 validation rule(s)

-- Lookup validation: Charge Profile.Chassis Type(any in) -> chassisTypes.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'chassisTypes', 'name', 'Chassis Type(any in) must be a valid chassisTypes entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Chassis Type(any in)';

-- Field Chassis Type(any in) has 1 validation rule(s)

-- Lookup validation: Charge Profile.Chassis Type(not in) -> chassisTypes.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'chassisTypes', 'name', 'Chassis Type(not in) must be a valid chassisTypes entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Chassis Type(not in)';

-- Field Chassis Type(not in) has 1 validation rule(s)

-- Lookup validation: Charge Profile.Chassis Size(any in) -> chassisSizes.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'chassisSizes', 'name', 'Chassis Size(any in) must be a valid chassisSizes entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Chassis Size(any in)';

-- Field Chassis Size(any in) has 1 validation rule(s)

-- Lookup validation: Charge Profile.Chassis Size(not in) -> chassisSizes.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'chassisSizes', 'name', 'Chassis Size(not in) must be a valid chassisSizes entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Chassis Size(not in)';

-- Field Chassis Size(not in) has 1 validation rule(s)

-- Lookup validation: Charge Profile.Chassis Owner(any in) -> chassisOwners.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'chassisOwners', 'name', 'Chassis Owner(any in) must be a valid chassisOwners entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Chassis Owner(any in)';

-- Field Chassis Owner(any in) has 1 validation rule(s)

-- Lookup validation: Charge Profile.Chassis Owner(not in) -> chassisOwners.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'chassisOwners', 'name', 'Chassis Owner(not in) must be a valid chassisOwners entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Chassis Owner(not in)';

-- Field Chassis Owner(not in) has 1 validation rule(s)

-- Lookup validation: Charge Profile.Branch(any in) -> branches.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'branches', 'name', 'Branch(any in) must be a valid branches entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Branch(any in)';

-- Field Branch(any in) has 1 validation rule(s)

-- Lookup validation: Charge Profile.Branch(not in) -> branches.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'branches', 'name', 'Branch(not in) must be a valid branches entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Branch(not in)';

-- Field Branch(not in) has 1 validation rule(s)

-- Lookup validation: Charge Profile.Commodity(any in) -> commodities.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'commodities', 'name', 'Commodity(any in) must be a valid commodities entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Commodity(any in)';

-- Field Commodity(any in) has 1 validation rule(s)

-- Lookup validation: Charge Profile.Commodity(not in) -> commodities.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'commodities', 'name', 'Commodity(not in) must be a valid commodities entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Commodity(not in)';

-- Field Commodity(not in) has 1 validation rule(s)

-- Regex validation: Charge Profile.Hot(any in)
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(Yes|No)(?:,\s*(Yes|No))*$', 'Invalid format for Hot(any in)'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Hot(any in)';

-- Field Hot(any in) has 1 validation rule(s)

-- Regex validation: Charge Profile.Hot(not in)
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(Yes|No)(?:,\s*(Yes|No))*$', 'Invalid format for Hot(not in)'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Hot(not in)';

-- Field Hot(not in) has 1 validation rule(s)

-- Regex validation: Charge Profile.Hazmat(any in)
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(Yes|No)(?:,\s*(Yes|No))*$', 'Invalid format for Hazmat(any in)'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Hazmat(any in)';

-- Field Hazmat(any in) has 1 validation rule(s)

-- Regex validation: Charge Profile.Hazmat(not in)
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(Yes|No)(?:,\s*(Yes|No))*$', 'Invalid format for Hazmat(not in)'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Hazmat(not in)';

-- Field Hazmat(not in) has 1 validation rule(s)

-- Regex validation: Charge Profile.Liquor(any in)
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(Yes|No)(?:,\s*(Yes|No))*$', 'Invalid format for Liquor(any in)'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Liquor(any in)';

-- Field Liquor(any in) has 1 validation rule(s)

-- Regex validation: Charge Profile.Liquor(not in)
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(Yes|No)(?:,\s*(Yes|No))*$', 'Invalid format for Liquor(not in)'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Liquor(not in)';

-- Field Liquor(not in) has 1 validation rule(s)

-- Regex validation: Charge Profile.State(any in)
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^[A-Z]{2}(?:,\s*[A-Z]{2})*$', 'Invalid format for State(any in)'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'State(any in)';

-- Field State(any in) has 1 validation rule(s)

-- Regex validation: Charge Profile.State(not in)
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^[A-Z]{2}(?:,\s*[A-Z]{2})*$', 'Invalid format for State(not in)'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'State(not in)';

-- Field State(not in) has 1 validation rule(s)

-- Regex validation: Charge Profile.Delivery Day(any in)
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?:,\s*(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday))*$', 'Invalid format for Delivery Day(any in)'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Delivery Day(any in)';

-- Field Delivery Day(any in) has 1 validation rule(s)

-- Regex validation: Charge Profile.Delivery Day(not in)
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?:,\s*(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday))*$', 'Invalid format for Delivery Day(not in)'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Delivery Day(not in)';

-- Field Delivery Day(not in) has 1 validation rule(s)

-- Regex validation: Charge Profile.Delivery Time(any in)
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^([01]?[0-9]|2[0-3]):[0-5][0-9]$', 'Invalid format for Delivery Time(any in)'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Delivery Time(any in)';

-- Field Delivery Time(any in) has 1 validation rule(s)

-- Regex validation: Charge Profile.Delivery Time(not in)
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^([01]?[0-9]|2[0-3]):[0-5][0-9]$', 'Invalid format for Delivery Time(not in)'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Delivery Time(not in)';

-- Field Delivery Time(not in) has 1 validation rule(s)

-- Lookup validation: Charge Profile.City Groups(any in) -> cityGroups.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'cityGroups', 'name', 'City Groups(any in) must be a valid cityGroups entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'City Groups(any in)';

-- Field City Groups(any in) has 1 validation rule(s)

-- Lookup validation: Charge Profile.City Groups(not in) -> cityGroups.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'cityGroups', 'name', 'City Groups(not in) must be a valid cityGroups entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'City Groups(not in)';

-- Field City Groups(not in) has 1 validation rule(s)

-- Enum validation (converted from regex): Charge Profile.Overweight(any in)
-- Original pattern: ^(Yes|No)$
INSERT INTO entity_validations (entity_field_id, validation_type, enum_values, error_message)
SELECT ef.id, 'enum', '["Yes","No"]', 'Overweight(any in) must be one of: Yes, No'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Overweight(any in)';

-- Field Overweight(any in) has 1 validation rule(s)

-- Enum validation (converted from regex): Charge Profile.Overweight(not in)
-- Original pattern: ^(Yes|No)$
INSERT INTO entity_validations (entity_field_id, validation_type, enum_values, error_message)
SELECT ef.id, 'enum', '["Yes","No"]', 'Overweight(not in) must be one of: Yes, No'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Overweight(not in)';

-- Field Overweight(not in) has 1 validation rule(s)

-- Enum validation (converted from regex): Charge Profile.Overheight(any in)
-- Original pattern: ^(Yes|No)$
INSERT INTO entity_validations (entity_field_id, validation_type, enum_values, error_message)
SELECT ef.id, 'enum', '["Yes","No"]', 'Overheight(any in) must be one of: Yes, No'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Overheight(any in)';

-- Field Overheight(any in) has 1 validation rule(s)

-- Enum validation (converted from regex): Charge Profile.Overheight(not in)
-- Original pattern: ^(Yes|No)$
INSERT INTO entity_validations (entity_field_id, validation_type, enum_values, error_message)
SELECT ef.id, 'enum', '["Yes","No"]', 'Overheight(not in) must be one of: Yes, No'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Overheight(not in)';

-- Field Overheight(not in) has 1 validation rule(s)

-- Lookup validation: Charge Profile.Drop Location(any in) -> branches.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'branches', 'name', 'Drop Location(any in) must be a valid branches entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Drop Location(any in)';

-- Field Drop Location(any in) has 1 validation rule(s)

-- Lookup validation: Charge Profile.Drop Location(not in) -> branches.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'branches', 'name', 'Drop Location(not in) must be a valid branches entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Drop Location(not in)';

-- Field Drop Location(not in) has 1 validation rule(s)

-- Regex validation: Charge Profile.Dropped(any in)
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(After Delivery|Before Delivery)(?:,\s*(After Delivery|Before Delivery))*$', 'Invalid format for Dropped(any in)'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Dropped(any in)';

-- Field Dropped(any in) has 1 validation rule(s)

-- Regex validation: Charge Profile.Dropped(not in)
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(After Delivery|Before Delivery)(?:,\s*(After Delivery|Before Delivery))*$', 'Invalid format for Dropped(not in)'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Dropped(not in)';

-- Field Dropped(not in) has 1 validation rule(s)

-- Regex validation: Charge Profile.Genset(any in)
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(Yes|No)(?:,\s*(Yes|No))*$', 'Invalid format for Genset(any in)'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Genset(any in)';

-- Field Genset(any in) has 1 validation rule(s)

-- Regex validation: Charge Profile.Genset(not in)
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(Yes|No)(?:,\s*(Yes|No))*$', 'Invalid format for Genset(not in)'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Genset(not in)';

-- Field Genset(not in) has 1 validation rule(s)

-- Lookup validation: Charge Profile.CSR(any in) -> CSR.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'CSR', 'name', 'CSR(any in) must be a valid CSR entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'CSR(any in)';

-- Field CSR(any in) has 1 validation rule(s)

-- Lookup validation: Charge Profile.CSR(not in) -> CSR.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'CSR', 'name', 'CSR(not in) must be a valid CSR entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'CSR(not in)';

-- Field CSR(not in) has 1 validation rule(s)

-- Regex validation: Charge Profile.Delivery Country(any in)
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^[A-Z]{2}(?:,\s*[A-Z]{2})*$', 'Invalid format for Delivery Country(any in)'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Delivery Country(any in)';

-- Field Delivery Country(any in) has 1 validation rule(s)

-- Regex validation: Charge Profile.Delivery Country(not in)
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^[A-Z]{2}(?:,\s*[A-Z]{2})*$', 'Invalid format for Delivery Country(not in)'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Delivery Country(not in)';

-- Field Delivery Country(not in) has 1 validation rule(s)

-- Lookup validation: Charge Profile.Postal/Zip Code Groups(any in) -> zipCodeGroups.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'zipCodeGroups', 'name', 'Postal/Zip Code Groups(any in) must be a valid zipCodeGroups entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Postal/Zip Code Groups(any in)';

-- Field Postal/Zip Code Groups(any in) has 1 validation rule(s)

-- Lookup validation: Charge Profile.Postal/Zip Code Groups(not in) -> zipCodeGroups.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'zipCodeGroups', 'name', 'Postal/Zip Code Groups(not in) must be a valid zipCodeGroups entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Postal/Zip Code Groups(not in)';

-- Field Postal/Zip Code Groups(not in) has 1 validation rule(s)

-- Regex validation: Charge Profile.Street Turn Type(any in)
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(Commercial|Operational)(?:,\s*(Commercial|Operational))*$', 'Invalid format for Street Turn Type(any in)'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Street Turn Type(any in)';

-- Field Street Turn Type(any in) has 1 validation rule(s)

-- Regex validation: Charge Profile.Street Turn Type(not in)
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(Commercial|Operational)(?:,\s*(Commercial|Operational))*$', 'Invalid format for Street Turn Type(not in)'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Street Turn Type(not in)';

-- Field Street Turn Type(not in) has 1 validation rule(s)

-- Regex validation: Charge Profile.Trip Type(any in)
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(Commercial|Operational)(?:,\s*(Commercial|Operational))*$', 'Invalid format for Trip Type(any in)'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Trip Type(any in)';

-- Field Trip Type(any in) has 1 validation rule(s)

-- Regex validation: Charge Profile.Trip Type(not in)
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(Commercial|Operational)(?:,\s*(Commercial|Operational))*$', 'Invalid format for Trip Type(not in)'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Trip Type(not in)';

-- Field Trip Type(not in) has 1 validation rule(s)

-- Regex validation: Charge Profile.Scale(any in)
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(Yes|No)(?:,\s*(Yes|No))*$', 'Invalid format for Scale(any in)'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Scale(any in)';

-- Field Scale(any in) has 1 validation rule(s)

-- Regex validation: Charge Profile.Scale(not in)
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(Yes|No)(?:,\s*(Yes|No))*$', 'Invalid format for Scale(not in)'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Scale(not in)';

-- Field Scale(not in) has 1 validation rule(s)

-- Regex validation: Charge Profile.Dual Transaction(any in)
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(Yes|No)(?:,\s*(Yes|No))*$', 'Invalid format for Dual Transaction(any in)'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Dual Transaction(any in)';

-- Field Dual Transaction(any in) has 1 validation rule(s)

-- Regex validation: Charge Profile.Dual Transaction(not in)
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(Yes|No)(?:,\s*(Yes|No))*$', 'Invalid format for Dual Transaction(not in)'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Dual Transaction(not in)';

-- Field Dual Transaction(not in) has 1 validation rule(s)

-- Regex validation: Charge Profile.Street Turn(any in)
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(Yes|No)(?:,\s*(Yes|No))*$', 'Invalid format for Street Turn(any in)'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Street Turn(any in)';

-- Field Street Turn(any in) has 1 validation rule(s)

-- Regex validation: Charge Profile.Street Turn(not in)
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(Yes|No)(?:,\s*(Yes|No))*$', 'Invalid format for Street Turn(not in)'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Street Turn(not in)';

-- Field Street Turn(not in) has 1 validation rule(s)

-- Regex validation: Charge Profile.EV(any in)
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(Yes|No)(?:,\s*(Yes|No))*$', 'Invalid format for EV(any in)'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'EV(any in)';

-- Field EV(any in) has 1 validation rule(s)

-- Regex validation: Charge Profile.EV(not in)
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(Yes|No)(?:,\s*(Yes|No))*$', 'Invalid format for EV(not in)'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'EV(not in)';

-- Field EV(not in) has 1 validation rule(s)

-- Regex validation: Charge Profile.Bonded(any in)
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(Yes|No)(?:,\s*(Yes|No))*$', 'Invalid format for Bonded(any in)'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Bonded(any in)';

-- Field Bonded(any in) has 1 validation rule(s)

-- Regex validation: Charge Profile.Bonded(not in)
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(Yes|No)(?:,\s*(Yes|No))*$', 'Invalid format for Bonded(not in)'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Bonded(not in)';

-- Field Bonded(not in) has 1 validation rule(s)

-- Regex validation: Charge Profile.OOG(any in)
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(Yes|No)(?:,\s*(Yes|No))*$', 'Invalid format for OOG(any in)'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'OOG(any in)';

-- Field OOG(any in) has 1 validation rule(s)

-- Regex validation: Charge Profile.OOG(not in)
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(Yes|No)(?:,\s*(Yes|No))*$', 'Invalid format for OOG(not in)'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'OOG(not in)';

-- Field OOG(not in) has 1 validation rule(s)

-- Regex validation: Charge Profile.Vendor
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(Driver|Carrier)(?:,\s*(Driver|Carrier))*$', 'Invalid format for Vendor'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Charge Profile' AND ef.display_name = 'Vendor';

-- Field Vendor has 1 validation rule(s)

-- Entity Charge Profile completed: 117 fields processed

-- ============================================
-- Entity: Chassis Owner (Chassis Owner)
-- Fields: 8
-- ============================================

-- Regex validation: Chassis Owner.Phone
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^\([0-9]{3}\) [0-9]{3}-[0-9]{4}$', 'Invalid format for Phone'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Chassis Owner' AND ef.display_name = 'Phone';

-- Field Phone has 1 validation rule(s)

-- Regex validation: Chassis Owner.Zip Code
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^[0-9]{5}(-[0-9]{4})?$', 'Invalid format for Zip Code'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Chassis Owner' AND ef.display_name = 'Zip Code';

-- Field Zip Code has 1 validation rule(s)

-- Entity Chassis Owner completed: 8 fields processed

-- ============================================
-- Entity: Chassis (Chassis)
-- Fields: 16
-- ============================================

-- Lookup validation: Chassis.Chassis Type -> chassisTypes.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'chassisTypes', 'name', 'Chassis Type must be a valid chassisTypes entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Chassis' AND ef.display_name = 'Chassis Type';

-- Field Chassis Type has 1 validation rule(s)

-- Lookup validation: Chassis.Chassis Size -> chassisSizes.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'chassisSizes', 'name', 'Chassis Size must be a valid chassisSizes entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Chassis' AND ef.display_name = 'Chassis Size';

-- Field Chassis Size has 1 validation rule(s)

-- Lookup validation: Chassis.Chassis Owner -> chassisOwners.company_name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'chassisOwners', 'company_name', 'Chassis Owner must be a valid chassisOwners entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Chassis' AND ef.display_name = 'Chassis Owner';

-- Field Chassis Owner has 1 validation rule(s)

-- Regex validation: Chassis.Year
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^[0-9]{4}$', 'Invalid format for Year'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Chassis' AND ef.display_name = 'Year';

-- Field Year has 1 validation rule(s)

-- Lookup validation: Chassis.Branch -> branches.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'branches', 'name', 'Branch must be a valid branches entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Chassis' AND ef.display_name = 'Branch';

-- Field Branch has 1 validation rule(s)

-- Entity Chassis completed: 16 fields processed

-- ============================================
-- Entity: People (People)
-- Fields: 19
-- ============================================

-- Regex validation: People.Email
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^[a-zA-Z0-9]([a-zA-Z0-9._-])*[a-zA-Z0-9]@[a-zA-Z0-9]([a-zA-Z0-9-])*[a-zA-Z0-9]\.([a-zA-Z]{2,4})+$', 'Invalid format for Email'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'People' AND ef.display_name = 'Email';

-- Field Email has 1 validation rule(s)

-- Regex validation: People.Mobile
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^\([0-9]{3}\) [0-9]{3}-[0-9]{4}$', 'Invalid format for Mobile'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'People' AND ef.display_name = 'Mobile';

-- Field Mobile has 1 validation rule(s)

-- Lookup validation: People.Customer ID -> tmsCustomers.company_name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'tmsCustomers', 'company_name', 'Customer ID must be a valid tmsCustomers entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'People' AND ef.display_name = 'Customer ID';

-- Field Customer ID has 1 validation rule(s)

-- Regex validation: People.Password
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{10,})', 'Invalid format for Password'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'People' AND ef.display_name = 'Password';

-- Field Password has 1 validation rule(s)

-- Entity People completed: 19 fields processed

-- ============================================
-- Entity: Organization (Organization)
-- Fields: 27
-- ============================================

-- Regex validation: Organization.Country
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^[A-Z]{2}$', 'Invalid format for Country'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Organization' AND ef.display_name = 'Country';

-- Field Country has 1 validation rule(s)

-- Regex validation: Organization.Zip Code
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(?=(.*\d)).{2,}$', 'Invalid format for Zip Code'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Organization' AND ef.display_name = 'Zip Code';

-- Field Zip Code has 1 validation rule(s)

-- Regex validation: Organization.Secondary Phone
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(\+?[1-9]{1}[0-9]{1,14}|\(?\d{1,4}\)?[\s\-]?\d{1,4}[\s\-]?\d{1,4}[\s\-]?\d{1,4})$', 'Invalid format for Secondary Phone'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Organization' AND ef.display_name = 'Secondary Phone';

-- Field Secondary Phone has 1 validation rule(s)

-- Regex validation: Organization.Mobile
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(\+?[1-9]{1}[0-9]{1,14}|\(?\d{1,4}\)?[\s\-]?\d{1,4}[\s\-]?\d{1,4}[\s\-]?\d{1,4})$', 'Invalid format for Mobile'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Organization' AND ef.display_name = 'Mobile';

-- Field Mobile has 1 validation rule(s)

-- Regex validation: Organization.Email
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^([^@]+@[^@]+\s*,\s*)*[^@]+@[^@]+$', 'Invalid format for Email'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Organization' AND ef.display_name = 'Email';

-- Field Email has 1 validation rule(s)

-- Regex validation: Organization.Billing Email
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^([^@]+@[^@]+\s*,\s*)*[^@]+@[^@]+$', 'Invalid format for Billing Email'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Organization' AND ef.display_name = 'Billing Email';

-- Field Billing Email has 1 validation rule(s)

-- Regex validation: Organization.Password
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{10,})', 'Invalid format for Password'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Organization' AND ef.display_name = 'Password';

-- Field Password has 1 validation rule(s)

-- Lookup validation: Organization.Branch -> branches.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'branches', 'name', 'Branch must be a valid branches entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Organization' AND ef.display_name = 'Branch';

-- Field Branch has 1 validation rule(s)

-- Enum validation (converted from regex): Organization.Organization Type
-- Original pattern: ^(?:ALL|CUSTOMER|TERMINAL|WAREHOUSE|CONTAINERRETURN|CHASSISPICK|CHASSISTERMINATION)$
INSERT INTO entity_validations (entity_field_id, validation_type, enum_values, error_message)
SELECT ef.id, 'enum', '["?:ALL","CUSTOMER","TERMINAL","WAREHOUSE","CONTAINERRETURN","CHASSISPICK","CHASSISTERMINATION"]', 'Organization Type must be one of: ?:ALL, CUSTOMER, TERMINAL, WAREHOUSE, CONTAINERRETURN, CHASSISPICK, CHASSISTERMINATION'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Organization' AND ef.display_name = 'Organization Type';

-- Field Organization Type has 1 validation rule(s)

-- Regex validation: Organization.Receiver email
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^([^@]+@[^@]+\s*,\s*)*[^@]+@[^@]+$', 'Invalid format for Receiver email'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Organization' AND ef.display_name = 'Receiver email';

-- Field Receiver email has 1 validation rule(s)

-- Regex validation: Organization.Mc number
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^.{2,}$', 'Invalid format for Mc number'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Organization' AND ef.display_name = 'Mc number';

-- Field Mc number has 1 validation rule(s)

-- Lookup validation: Organization.Fleet customer -> getTMSFleetCustomers.company_name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'getTMSFleetCustomers', 'company_name', 'Fleet customer must be a valid getTMSFleetCustomers entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Organization' AND ef.display_name = 'Fleet customer';

-- Field Fleet customer has 1 validation rule(s)

-- Regex validation: Organization.Currency Type
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^[A-Z]{3}$', 'Invalid format for Currency Type'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Organization' AND ef.display_name = 'Currency Type';

-- Lookup validation: Organization.Currency Type -> currencies.currencyCode
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'currencies', 'currencyCode', 'Currency Type must be a valid currencies entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Organization' AND ef.display_name = 'Currency Type';

-- Field Currency Type has 2 validation rule(s)

-- Regex validation: Organization.External ID
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^[A-Za-z0-9]+$', 'Invalid format for External ID'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Organization' AND ef.display_name = 'External ID';

-- Field External ID has 1 validation rule(s)

-- Entity Organization completed: 27 fields processed

-- ============================================
-- Entity: Drivers (Drivers)
-- Fields: 26
-- ============================================

-- Regex validation: Drivers.Email
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^[a-zA-Z0-9]([a-zA-Z0-9._-])*[a-zA-Z0-9]@[a-zA-Z0-9]([a-zA-Z0-9-])*[a-zA-Z0-9]\.([a-zA-Z]{2,4})+$', 'Invalid format for Email'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Drivers' AND ef.display_name = 'Email';

-- Field Email has 1 validation rule(s)

-- Regex validation: Drivers.Phone
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^\d{3}-\d{3}-\d{4}$', 'Invalid format for Phone'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Drivers' AND ef.display_name = 'Phone';

-- Field Phone has 1 validation rule(s)

-- Regex validation: Drivers.Password
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^[A-Z]{3}\d{5}\*$', 'Invalid format for Password'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Drivers' AND ef.display_name = 'Password';

-- Field Password has 1 validation rule(s)

-- Regex validation: Drivers.Username
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^[a-z0-9]+$', 'Invalid format for Username'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Drivers' AND ef.display_name = 'Username';

-- Field Username has 1 validation rule(s)

-- Lookup validation: Drivers.Truck Number -> trucks.equipmentID
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'trucks', 'equipmentID', 'Truck Number must be a valid trucks entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Drivers' AND ef.display_name = 'Truck Number';

-- Field Truck Number has 1 validation rule(s)

-- Regex validation: Drivers.Country Code
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^[0-9]{1,3}$', 'Invalid format for Country Code'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Drivers' AND ef.display_name = 'Country Code';

-- Field Country Code has 1 validation rule(s)

-- Regex validation: Drivers.License State
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^[A-Za-z\s]{2,50}$', 'Invalid format for License State'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Drivers' AND ef.display_name = 'License State';

-- Field License State has 1 validation rule(s)

-- Regex validation: Drivers.License Number
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^[A-Z0-9]{1,15}$', 'Invalid format for License Number'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Drivers' AND ef.display_name = 'License Number';

-- Field License Number has 1 validation rule(s)

-- Regex validation: Drivers.Sealink #
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^[A-Z0-9]{1,20}$', 'Invalid format for Sealink #'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Drivers' AND ef.display_name = 'Sealink #';

-- Field Sealink # has 1 validation rule(s)

-- Regex validation: Drivers.Emergency Contact Number
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^[0-9]{10}$', 'Invalid format for Emergency Contact Number'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Drivers' AND ef.display_name = 'Emergency Contact Number';

-- Field Emergency Contact Number has 1 validation rule(s)

-- Regex validation: Drivers.Billing Email
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^[a-zA-Z0-9]([a-zA-Z0-9._-])*[a-zA-Z0-9]@[a-zA-Z0-9]([a-zA-Z0-9-])*[a-zA-Z0-9]\.([a-zA-Z]{2,4})+$', 'Invalid format for Billing Email'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Drivers' AND ef.display_name = 'Billing Email';

-- Field Billing Email has 1 validation rule(s)

-- Lookup validation: Drivers.Profile Type -> driverProfileTypes.type
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'driverProfileTypes', 'type', 'Profile Type must be a valid driverProfileTypes entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Drivers' AND ef.display_name = 'Profile Type';

-- Field Profile Type has 1 validation rule(s)

-- Lookup validation: Drivers.Branch -> branches.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'branches', 'name', 'Branch must be a valid branches entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Drivers' AND ef.display_name = 'Branch';

-- Field Branch has 1 validation rule(s)

-- Regex validation: Drivers.External Id
INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
SELECT ef.id, 'regex', '^[0-9]+$', 'Invalid format for External Id'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Drivers' AND ef.display_name = 'External Id';

-- Field External Id has 1 validation rule(s)

-- Enum validation (converted from regex): Drivers.Hazmat
-- Original pattern: ^(?i)(True|False|T|F|Yes|No)$
INSERT INTO entity_validations (entity_field_id, validation_type, enum_values, error_message)
SELECT ef.id, 'enum', '["True","False","T","F","Yes","No"]', 'Hazmat must be one of: True, False, T, F, Yes, No'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Drivers' AND ef.display_name = 'Hazmat';

-- Field Hazmat has 1 validation rule(s)

-- Lookup validation: Drivers.Home Branch Time Zone -> timezoneList.type
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'timezoneList', 'type', 'Home Branch Time Zone must be a valid timezoneList entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'Drivers' AND ef.display_name = 'Home Branch Time Zone';

-- Field Home Branch Time Zone has 1 validation rule(s)

-- Entity Drivers completed: 26 fields processed

-- ============================================
-- Entity: PerDiem (PerDiem)
-- Fields: 12
-- ============================================

-- Lookup validation: PerDiem.Customers -> tmsCustomers.company_name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'tmsCustomers', 'company_name', 'Customers must be a valid tmsCustomers entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'PerDiem' AND ef.display_name = 'Customers';

-- Field Customers has 1 validation rule(s)

-- Lookup validation: PerDiem.Owner -> containerOwners.company_name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'containerOwners', 'company_name', 'Owner must be a valid containerOwners entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'PerDiem' AND ef.display_name = 'Owner';

-- Field Owner has 1 validation rule(s)

-- Lookup validation: PerDiem.Size -> containerSizes.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'containerSizes', 'name', 'Size must be a valid containerSizes entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'PerDiem' AND ef.display_name = 'Size';

-- Field Size has 1 validation rule(s)

-- Lookup validation: PerDiem.Type -> containerTypes.name
INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
SELECT ef.id, 'lookup', 'containerTypes', 'name', 'Type must be a valid containerTypes entry'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'PerDiem' AND ef.display_name = 'Type';

-- Field Type has 1 validation rule(s)

-- Enum validation (converted from regex): PerDiem.Holiday
-- Original pattern: ^(true|false|True|False|TRUE|FALSE)$
INSERT INTO entity_validations (entity_field_id, validation_type, enum_values, error_message)
SELECT ef.id, 'enum', '["true","false","True","False","TRUE","FALSE"]', 'Holiday must be one of: true, false, True, False, TRUE, FALSE'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'PerDiem' AND ef.display_name = 'Holiday';

-- Field Holiday has 1 validation rule(s)

-- Enum validation (converted from regex): PerDiem.Free Weekday
-- Original pattern: ^(true|false|True|False|TRUE|FALSE)$
INSERT INTO entity_validations (entity_field_id, validation_type, enum_values, error_message)
SELECT ef.id, 'enum', '["true","false","True","False","TRUE","FALSE"]', 'Free Weekday must be one of: true, false, True, False, TRUE, FALSE'
FROM entity_fields ef
JOIN entities e ON ef.entity_id = e.id
WHERE e.entity_key = 'PerDiem' AND ef.display_name = 'Free Weekday';

-- Field Free Weekday has 1 validation rule(s)

-- Entity PerDiem completed: 12 fields processed

-- Document 2: Base URL https://api.medlog.portpro.io
-- Contains 12 entities

-- Document 3: Base URL https://api.medlog.portpro.io
-- Contains 12 entities

-- Document 4: Base URL https://api.medlog.portpro.io
-- Contains 12 entities

-- Document 5: Base URL https://api.axle.network
-- Contains 12 entities

-- Document 6: Base URL https://api.axle.network
-- Contains 12 entities

-- Document 7: Base URL https://api.axle.network
-- Contains 12 entities

-- Document 8: Base URL https://api.medlog.portpro.io
-- Contains 12 entities

-- ============================================
-- MIGRATION SUMMARY (DEDUPLICATED WITH ENUM CONVERSION)
-- ============================================
-- Total Documents: 8
-- Unique Entities: 12
-- Total Fields: 327
-- Total Validation Rules: 187
--
-- Validation Type Breakdown:
--   Regex patterns (kept): 85
--   Enum validations (converted from regex): 26
--   Enum validations (native): 0
--   Lookup validations: 76
--
-- Processed Entity Types: Charge Profile_Charge Profile, Chassis Owner_Chassis Owner, Chassis_Chassis, Drivers_Drivers, Load_Load, Organization_Organization, People_People, PerDiem_PerDiem, Trailers_Trailers, Truck Owner_Truck Owner, Trucks_Trucks, Users_Users
-- Generated: 2025-09-26T01:13:30.914Z
-- Source: MongoDB BulkuploadEntity collection
-- ============================================
