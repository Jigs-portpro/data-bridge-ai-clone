import { z } from 'zod';

// Base schema for common string patterns - Updated to match exportEntities.json
const Patterns = {
  Email: z.string().regex(/^[a-zA-Z0-9]([a-zA-Z0-9._-])*[a-zA-Z0-9]@[a-zA-Z0-9]([a-zA-Z0-9-])*[a-zA-Z0-9]\.([a-zA-Z]{2,4})+$/),
  USZip: z.string().regex(/^[0-9]{5}(-[0-9]{4})?$/),
  USZipExtended: z.string().regex(/^[0-9]{4,5}(-[0-9]{4})?$/),
  USState: z.string().regex(/^[A-Z]{2}$/),
  CountryCode: z.string().regex(/^[A-Z]{2}$/),
  Phone10: z.string().regex(/^[0-9]{10}$/),
  PhoneFormatted: z.string().regex(/^\([0-9]{3}\) [0-9]{3}-[0-9]{4}$/),
  DateMMDDYYYY: z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])-[0-9]{4}$/), // Updated to match exportEntities
  DateSlashMMDDYYYY: z.string().regex(/^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/[0-9]{4}$/),
  DateDDMMMYY: z.string().regex(/^(0[1-9]|[12][0-9]|3[01])-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-[0-9]{2}$/),
  YesNo: z.string().regex(/^(Yes|No)$/),
  YesNoCaseInsensitive: z.string().regex(/^(yes|no|Yes|No|YES|NO)$/i),
  LoadTypePattern: z.string().regex(/^(Import|Export|Road)$/),
  RoutesPattern: z.string().regex(/^(Pick And Run \+ Live|Pick And Run \+ Drop & Hook|Prepull \+ Drop & Hook|Prepull \+ Live|One Way Move|Pick And Run \+ Gray Pool|Prepull \+ Gray Pool|Shunt|Pick and Lift \+ Deliver and Lift \+ Return|Pick and Lift \+ Live)$/),
  TrailerTypePattern: z.string().regex(/^(Dry Van|Reefer|Flat Bed|Drop Deck|Low Boy|Double Drop Deck)$/),
  TrailerSizePattern: z.string().regex(/^(26'|40'|45'|48'|53')$/),
  ChassisNumberPattern: z.string().regex(/^[A-Z0-9]{6,20}$/),
  ChassisLicensePattern: z.string().regex(/^[A-Z]{2,}$/),
  EquipmentIDPattern: z.string().regex(/^[0-9]{6,10}$/),
  TrailerNumberPattern: z.string().regex(/^[0-9]{4,10}$/),
  LicensePlatePattern: z.string().regex(/^[A-Z0-9]{1,10}$/),
  LicenseNumberPattern: z.string().regex(/^[A-Z0-9]{1,15}$/),
  VINPattern: z.string().regex(/^[A-Z0-9]{9,17}$/),
  VINPatternStrict: z.string().regex(/^[A-Z0-9]{10,17}$/),
  YearPattern: z.string().regex(/^[0-9]{4}$/),
  SCACPattern: z.string().regex(/^[A-Z]{4}$/),
  MCNumberPattern: z.string().regex(/^[a-zA-Z0-9 ]*$/),
  USDOTPattern: z.string().regex(/^[0-9]{7,8}$/),
  CountryCodeNumeric: z.string().regex(/^[0-9]{1,3}$/),
  LicenseStatePattern: z.string().regex(/^[A-Za-z\s]{2,50}$/),
  SealinkPattern: z.string().regex(/^[A-Z0-9]{1,20}$/),
  PasswordPattern: z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*])(?=.{10,})/),
  SystemRolesPattern: z.string().regex(/^(?:\\s*(?:Admin|CSR|Sales\\sAgent|Mechanics)\\s*)(?:,\\s*(?:Admin|CSR|Sales\\sAgent|Mechanics)\\s*)*$/),
  OrganizationTypePattern: z.string().regex(/^(?:ALL|CUSTOMER|TERMINAL|WAREHOUSE|CONTAINERRETURN|CHASSISPICK|CHASSISTERMINATION)$/),
  CurrencyCodePattern: z.string().regex(/^[A-Z]{3}$/),
  ChassisPattern20: z.string().regex(/^[0-9]{2,3}'$/),
};

// Helper function to create lookup-enabled string field
const createLookupString = (minLength?: number, maxLength?: number, lookupId?: string, lookupField?: string) => {
  let schema = z.string();
  if (minLength) schema = schema.min(minLength);
  if (maxLength) schema = schema.max(maxLength);
  if (lookupId && lookupField) {
    (schema as any).lookupValidation = { lookupId, lookupField };
  }
  return schema;
};

// Helper function to create boolean that accepts Yes/No
const createYesNoBoolean = () => {
  return z.union([
    z.boolean(),
    z.string().transform((val) => {
      const lower = val.toLowerCase();
      if (lower === 'yes' || lower === 'y' || lower === 'true' || lower === '1') return true;
      if (lower === 'no' || lower === 'n' || lower === 'false' || lower === '0') return false;
      throw new Error(`Invalid boolean value: ${val}. Expected: Yes, No, true, false, 1, or 0`);
    })
  ]);
};

// Load Schema - Updated to match exportEntities.json exactly
const LoadSchema = z.object({
  Customer: createLookupString(2, 100, 'tmsCustomers', 'company_name'),
  'Load Type': Patterns.LoadTypePattern.max(50),
  'Pick Up Location': createLookupString(undefined, 200, 'tmsCustomers', 'company_name'),
  Container: z.string().max(20).optional(),
  'Delivery City/State': createLookupString(undefined, 100, 'tmsCustomers', 'company_name'),
  'Container Size': createLookupString(undefined, 10, 'containerSizes', 'name').optional(),
  'Container Type': createLookupString(undefined, 10, 'containerTypes', 'name').optional(),
  'Weight LBS': z.number().min(1).max(50).optional(),
  'Weight KGS': z.number().min(1).max(50).optional(),
  'Delivery Order': z.string().max(50).optional(),
  Owner: createLookupString(undefined, 100, 'containerOwners', 'name').optional(),
  'Booking #': z.string().max(50).optional(),
  'Master Bill Of Lading': z.string().max(50).optional(),
  'Container ETA': Patterns.DateMMDDYYYY.optional(),
  'Last Free Day': Patterns.DateMMDDYYYY.optional(),
  'Container Return': createLookupString(undefined, 200, 'tmsCustomers', 'company_name').optional(),
  'Hook Chassis Location': createLookupString(undefined, 200, 'tmsCustomers', 'company_name').optional(),
  'Terminate Chassis Location': createLookupString(undefined, 200, 'tmsCustomers', 'company_name').optional(),
  'Reference #': z.string().max(50).optional(),
  'Empty Date': Patterns.DateMMDDYYYY.optional(),
  'Date Returned': Patterns.DateMMDDYYYY.optional(),
  'Pick Up Apt From': Patterns.DateMMDDYYYY.optional(),
  'Delivery Apt From': Patterns.DateMMDDYYYY.optional(),
  ERD: Patterns.DateMMDDYYYY.optional(),
  'Per Diem Free Day': Patterns.DateMMDDYYYY.optional(),
  'Loaded Date': Patterns.DateMMDDYYYY.optional(),
  'Billing Date': Patterns.DateMMDDYYYY.optional(),
  'Chassis #': createLookupString(undefined, 20, 'chassis', 'chassis_no').optional(),
  'Chassis Owner': createLookupString(undefined, 100, 'chassisOwners', 'name').optional(),
  'Chassis Size': createLookupString(undefined, 10, 'chassisSizes', 'name').optional(),
  'Chassis Type': createLookupString(undefined, 10, 'chassisTypes', 'name').optional(),
  'Cut Off Date': Patterns.DateMMDDYYYY.optional(),
  'House Bill Of Lading': z.string().max(50).optional(),
  'Pick Up #': z.string().max(50).optional(),
  'Purchase Order #': z.string().max(50).optional(),
  'Seal #': z.string().max(20).optional(),
  'Shipment #': z.string().max(50).optional(),
  Temperature: z.number().optional(),
  Branch: createLookupString(undefined, 100, 'branches', 'name').optional(),
  'Vessel Name': z.string().max(100).optional(),
  Voyage: z.string().max(50).optional(),
  Commodity: createLookupString(undefined, 100, 'commodities', 'name').optional(),
  Pieces: z.number().optional(),
  Hazmat: createYesNoBoolean().optional(),
  Hot: createYesNoBoolean().optional(),
  Overweight: createYesNoBoolean().optional(),
  Routes: Patterns.RoutesPattern.max(100).optional(),
  Genset: createYesNoBoolean().optional(),
  Liquor: createYesNoBoolean().optional(),
  Overheight: createYesNoBoolean().optional(),
  'Street Turn': createYesNoBoolean().optional(),
  Scale: createYesNoBoolean().optional(),
});

// Carrier Schema - Updated to match exportEntities.json
const CarrierSchema = z.object({
  'Company Name': z.string().min(2).max(100),
  'Contact Name': z.string().min(2).max(100),
  Address: z.string().min(5).max(200),
  Country: Patterns.CountryCode,
  State: Patterns.USState,
  City: z.string().min(2).max(50),
  ZIP: Patterns.USZip,
  'Login Email Address': Patterns.Email,
  'Tender Email Address 1': Patterns.Email,
  'Tender Email Address 2': Patterns.Email.optional(),
  'Tender Email Address 3': Patterns.Email.optional(),
  'Phone Number': Patterns.PhoneFormatted,
  SCAC: Patterns.SCACPattern.optional(),
  'MC#': Patterns.MCNumberPattern.optional(),
  'USDOT Number': Patterns.USDOTPattern.optional(),
  'External ID': z.string().max(50).optional(),
  'Branch 1': createLookupString(undefined, 50, 'branches', 'name').optional(),
});

// Load Tariff Schema - Updated to match exportEntities.json
const LoadTariffSchema = z.object({
  'Tariff Name': z.string().min(2).max(100),
  'Tarrif Effective Start Date': Patterns.DateSlashMMDDYYYY.optional(),
  'Tarff Effective End Date': Patterns.DateSlashMMDDYYYY.optional(),
  'Load Type': z.string().max(200).optional(),
  Terminal: z.string().max(200).optional(),
  Customer: z.string().max(500).optional(),
  'Pick Up Location': z.string().max(500).optional(),
  'Delivery Location': z.string().max(500).optional(),
  'Return Location': z.string().max(500).optional(),
  'Charge Profile Name': z.string().min(2).max(100).optional(),
  'Charge Name': z.string().min(2).max(100).optional(),
  'Charge Description': z.string().max(500).optional(),
  'Unit of Measure': z.string().max(50).optional(),
  'Percentage Based On': z.string().max(200).optional(),
  'Effective date based on': z.string().max(50).optional(),
  'Charge Effective Start Date': Patterns.DateSlashMMDDYYYY.optional(),
  'Charge Effective End Date': Patterns.DateSlashMMDDYYYY.optional(),
  'Auto Add': Patterns.YesNo.optional(),
  'Calculate From This Event': z.string().max(200).optional(),
  'Calculate To This Event': z.string().max(200).optional(),
  'Calculate In This Event': z.string().max(200).optional(),
  'Calculate For Exact Events': z.string().max(500).optional(),
  'Zip Code Rule (any in)': z.string().max(500).optional(),
  'Zip Code Rule (not in)': z.string().max(500).optional(),
  'Load Type Rule (any in)': z.string().max(200).optional(),
  'Load Type Rule (not in)': z.string().max(200).optional(),
  'Minimum Amount': z.number().optional(),
  'Free Units': z.number().optional(),
  Amount: z.number().optional(),
  'Start Distance': z.number().optional(),
  'End Distance': z.number().optional(),
});

// Trailers Schema - Updated to match exportEntities.json
const TrailersSchema = z.object({
  'Trailer #': Patterns.TrailerNumberPattern,
  Year: Patterns.YearPattern.optional(),
  Make: z.string().max(50).optional(),
  Model: z.string().max(50).optional(),
  AID: Patterns.DateDDMMMYY.optional(),
  ITD: Patterns.DateDDMMMYY.optional(),
  VIN: Patterns.VINPattern.optional(),
  'Registration Expiration': Patterns.DateDDMMMYY.optional(),
  'Inspection Expiration': Patterns.DateDDMMMYY.optional(),
  'License Plate State': Patterns.USState.optional(),
  'License Plate #': Patterns.LicensePlatePattern.optional(),
  'HUT Expiration': Patterns.DateDDMMMYY.optional(),
  'Trailer Type': Patterns.TrailerTypePattern.max(50).optional(),
  'Trailer Size': Patterns.TrailerSizePattern.optional(),
  Branch: createLookupString(undefined, 100, 'branches', 'name').optional(),
});

// Truck Owner Schema - Updated to match exportEntities.json
const TruckOwnerSchema = z.object({
  'Company Name': z.string().min(2).max(100),
  Address: z.string().min(5).max(200),
  'DOT #': z.string().min(2).max(15).optional(),
  'MC #': Patterns.MCNumberPattern.optional(),
  'Main Contact Name': z.string().min(2).max(100).optional(),
  'Secondary Contact Name': z.string().min(2).max(100).optional(),
  Mobile: Patterns.PhoneFormatted.optional(),
  Email: Patterns.Email.optional(),
  'Tax ID/EIN #': z.string().min(2).max(15).optional(),
  SSN: z.string().min(2).max(15).optional(),
});

// Trucks Schema - Updated to match exportEntities.json
const TrucksSchema = z.object({
  'Equipment ID': Patterns.EquipmentIDPattern,
  'License State': Patterns.USState.optional(),
  'License Plate #': Patterns.LicensePlatePattern,
  Year: Patterns.YearPattern.optional(),
  Make: z.string().max(50).optional(),
  Model: z.string().max(50).optional(),
  AID: Patterns.DateDDMMMYY.optional(),
  ITD: Patterns.DateDDMMMYY.optional(),
  VIN: Patterns.VINPatternStrict.optional(),
  'Registration Expiration': Patterns.DateDDMMMYY.optional(),
  'Inspection Expiration': Patterns.DateDDMMMYY.optional(),
  'HUT Expiration': Patterns.DateDDMMMYY.optional(),
  'Annual Inspection': Patterns.DateDDMMMYY.optional(),
  'Bobtail Insurance': Patterns.DateDDMMMYY.optional(),
  'Diesel Emission': Patterns.DateDDMMMYY.optional(),
  'Truck owner': createLookupString(undefined, 100, 'fleetOwners', 'company_name').optional(),
  Branch: createLookupString(undefined, 100, 'branches', 'name').optional(),
});

// Users Schema - Updated to match exportEntities.json
const UsersSchema = z.object({
  'First Name*': z.string().min(2).max(50),
  'Last Name*': z.string().min(2).max(50),
  Phone: Patterns.PhoneFormatted.optional(),
  'Email*': Patterns.Email,
  'Password*': z.string().min(10).max(50).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*])(?=.{10,})/),
  'System Roles*': Patterns.SystemRolesPattern.max(200),
  'Terminal*': createLookupString(undefined, 100, 'branches', 'name'),
  'Custom Role': createLookupString(undefined, 100, 'getAllPermissionRoles', 'roleName').optional(),
});

// Charge Profile Schema - Updated to match exportEntities.json
const ChargeProfileSchema = z.object({
  'Charge Profile Name': z.string().min(2).max(100),
  'Charge Name': z.string().min(2).max(100).optional(),
  'Charge Description': z.string().max(500).optional(),
  'Unit of Measure': z.string().max(50).optional(),
  'Effective date based on': z.string().max(50).optional(),
  'Charge Effective Start Date': Patterns.DateSlashMMDDYYYY.optional(),
  'Charge Effective End Date': Patterns.DateSlashMMDDYYYY.optional(),
  'Auto Add': Patterns.YesNo.optional(),
  'Calculate From This Event': z.string().max(200).optional(),
  'Calculate To This Event': z.string().max(200).optional(),
  'Calculate In This Event': z.string().max(200).optional(),
  'Calculate For Exact Events': z.string().max(500).optional(),
  'Zip Code Rule (any in)': z.string().max(500).optional(),
  'Zip Code Rule (not in)': z.string().max(500).optional(),
  'Load Type Rule (any in)': z.string().max(200).optional(),
  'Load Type Rule (not in)': z.string().max(200).optional(),
  'City State Rule (any in)': z.string().max(500).optional(),
  'Minimum Amount': z.number().optional(),
  'Free Units': z.number().optional(),
  Amount: z.number().optional(),
  'Start Distance': z.number().optional(),
  'End Distance': z.number().optional(),
});

// Chassis Owner Schema - Updated to match exportEntities.json
const ChassisOwnerSchema = z.object({
  'Company Name': z.string().min(2).max(100),
  'Contact Name': z.string().min(2).max(100),
  Phone: Patterns.PhoneFormatted,
  Address: z.string().min(5).max(200),
  City: z.string().min(2).max(50),
  State: z.string().min(2).max(50),
  'Zip Code': Patterns.USZip,
  Country: z.string().min(2).max(100),
});

// Chassis Schema - Updated to match exportEntities.json
const ChassisSchema = z.object({
  'Chassis #': Patterns.ChassisNumberPattern,
  'Chassis Type': createLookupString(2, 50, 'chassisTypes', 'name'),
  'Chassis Size': z.string().regex(/^[0-9]{2,3}'$/).and(createLookupString(undefined, undefined, 'chassisSizes', 'name')),
  'Chassis Owner': createLookupString(2, 100, 'chassisOwners', 'company_name'),
  Year: Patterns.YearPattern.optional(),
  Make: z.string().max(50).optional(),
  Model: z.string().max(50).optional(),
  'Annual Inspection Date': Patterns.DateDDMMMYY.optional(),
  ITD: Patterns.DateDDMMMYY.optional(),
  Branch: createLookupString(undefined, 100, 'branches', 'name').optional(),
  'License State': Patterns.ChassisLicensePattern,
  'License Number': Patterns.LicenseNumberPattern,
  VIN: Patterns.VINPattern.optional(),
  Registration: Patterns.DateDDMMMYY.optional(),
  Inspection: Patterns.DateDDMMMYY.optional(),
  Insurance: Patterns.DateDDMMMYY.optional(),
});

// People Schema - Updated to match exportEntities.json
const PeopleSchema = z.object({
  Email: Patterns.Email,
  'First Name': z.string().min(2).max(50),
  'Last Name': z.string().min(2).max(50),
  Mobile: Patterns.PhoneFormatted,
  'Customer ID': createLookupString(2, 100, 'tmsCustomers', 'company_name'),
  Password: z.string().min(10).max(50).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*])(?=.{10,})/),
  'Loads Permission': z.boolean().optional(),
  'Dropped Containers Permission': z.boolean().optional(),
  'Account Payable Permission': z.boolean().optional(),
  'Info Permission': z.boolean().optional(),
  'Billing Permission': z.boolean().optional(),
  'Documents Permission': z.boolean().optional(),
  'Upload Documents Permission': z.boolean().optional(),
  'Payments Permission': z.boolean().optional(),
  'Tracking Permission': z.boolean().optional(),
  'Service Messaging Permission': z.boolean().optional(),
  'Summary Permission': z.boolean().optional(),
  'Shipment Tracking Permission': z.boolean().optional(),
  'Customer Permission': z.boolean().optional(),
});

// Organization Schema - Updated to match exportEntities.json
const OrganizationSchema = z.object({
  'Company Name': z.string().min(2).max(100),
  Address: z.string().min(5).max(200),
  City: z.string().min(2).max(50),
  State: z.string().min(2), // No max limit specified in exportEntities.json
  Country: Patterns.CountryCode,
  'Zip Code': Patterns.USZipExtended,
  'Main Contact Name': z.string().min(2).max(100).optional(),
  'Secondary Contact Name': z.string().min(2).max(100).optional(),
  'Secondary Phone': Patterns.PhoneFormatted.optional(),
  Mobile: Patterns.PhoneFormatted.optional(),
  Email: Patterns.Email.optional(),
  'Billing Email': Patterns.Email.optional(),
  Password: z.string().min(10).max(50).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*])(?=.{10,})/),
  'Payment Terms Method': z.string().max(50).optional(),
  'Payment Terms + Days': z.number().optional(),
  'Credit Limit': z.number().optional(),
  Branch: createLookupString(undefined, undefined, 'branches', 'name'),
  'Organization Type': Patterns.OrganizationTypePattern,
  'Receiver email': Patterns.Email.optional(),
  'Mc number': Patterns.MCNumberPattern.optional(),
  'Fleet customer': createLookupString(undefined, undefined, 'getTMSFleetCustomers', 'company_name').optional(),
  'Pay type': z.string().max(50).optional(),
  'Currency Type': z.string().regex(/^[A-Z]{3}$/).and(createLookupString(undefined, undefined, 'currencies', 'currencyCode')).optional(),
});

// Driver Charge Profile Schema - Updated to match exportEntities.json
const DriverChargeProfileSchema = z.object({
  'Charge Profile Name': z.string().min(2).max(100),
  'Charge Name': z.string().min(2).max(100).optional(),
  'Charge Description': z.string().max(500).optional(),
  'Unit of Measure': z.string().max(50).optional(),
  'Effective date based on': z.string().max(50).optional(),
  'Charge Effective Start Date': Patterns.DateSlashMMDDYYYY.optional(),
  'Charge Effective End Date': Patterns.DateSlashMMDDYYYY.optional(),
  'Auto Add': Patterns.YesNo.optional(),
  'Calculate From This Event': z.string().max(200).optional(),
  'Calculate To This Event': z.string().max(200).optional(),
  'If Event': z.string().max(200).optional(),
  'Event Location': z.string().max(200).optional(),
  'If Event 1': z.string().max(200).optional(),
  'Event Time 1': z.string().max(50).optional(),
  'Event Location 1': z.string().max(200).optional(),
  'Zip Code Rule (any in)': z.string().max(500).optional(),
  'Zip Code Rule (not in)': z.string().max(500).optional(),
  'Load Type Rule (any in)': z.string().max(200).optional(),
  'Load Type Rule (not in)': z.string().max(200).optional(),
  'Minimum Amount': z.number().optional(),
  'Free Units': z.number().optional(),
  Amount: z.number().optional(),
  'From Legs': z.string().max(500).optional(),
  'From Leg Event Location': z.string().max(200).optional(),
  'To Legs': z.string().max(200).optional(),
  'To Leg Event Location': z.string().max(200).optional(),
  'Start Distance': z.number().optional(),
  'End Distance': z.number().optional(),
  'Driver Group': z.string().max(100).optional(),
});

// Driver Tariff Schema - Updated to match exportEntities.json
const DriverTariffSchema = z.object({
  'Tariff Name': z.string().min(2).max(100),
  'Tarrif Effective Start Date': Patterns.DateSlashMMDDYYYY.optional(),
  'Tarff Effective End Date': Patterns.DateSlashMMDDYYYY.optional(),
  'Load Type': z.string().max(200).optional(),
  Terminal: z.string().max(200).optional(),
  Customer: z.string().max(500).optional(),
  'Pick Up Location': z.string().max(500).optional(),
  'Delivery Location': z.string().max(500).optional(),
  'Return Location': z.string().max(500).optional(),
  'Charge Profile Name': z.string().min(2).max(100).optional(),
  'Charge Name': z.string().min(2).max(100).optional(),
  'Charge Description': z.string().max(500).optional(),
  'Unit of Measure': z.string().max(50).optional(),
  'Effective date based on': z.string().max(50).optional(),
  'Charge Effective Start Date': Patterns.DateSlashMMDDYYYY.optional(),
  'Auto Add': Patterns.YesNo.optional(),
  'Calculate From This Event': z.string().max(200).optional(),
  'Calculate To This Event': z.string().max(200).optional(),
  'Calculate In This Event': z.string().max(200).optional(),
  'Calculate For Exact Events': z.string().max(500).optional(),
  'Zip Code Rule (any in)': z.string().max(500).optional(),
  'Zip Code Rule (not in)': z.string().max(500).optional(),
  'Load Type Rule (any in)': z.string().max(200).optional(),
  'Load Type Rule (not in)': z.string().max(200).optional(),
  'Minimum Amount': z.number().optional(),
  'Free Units': z.number().optional(),
  Amount: z.number().optional(),
  'From Legs': z.string().max(500).optional(),
  'From Leg Event Location': z.string().max(200).optional(),
  'To Legs': z.string().max(200).optional(),
  'To Leg Event Location': z.string().max(200).optional(),
  'Start Distance': z.number().optional(),
  'End Distance': z.number().optional(),
  'Driver Group': z.string().max(100).optional(),
});

// Drivers Schema - Updated to match exportEntities.json
const DriversSchema = z.object({
  'First Name': z.string().min(2).max(50),
  'Last Name': z.string().min(2).max(50),
  Email: Patterns.Email.min(7).max(50),
  Phone: Patterns.PhoneFormatted,
  Password: z.string().min(10).max(50).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*])(?=.{10,})/),
  Username: z.string().min(3).max(50),
  'Truck Number': createLookupString(undefined, 50, 'trucks', 'equipmentID').optional(),
  'Country Code': Patterns.CountryCodeNumeric.optional(),
  'License State': Patterns.LicenseStatePattern.optional(),
  'License Number': Patterns.LicenseNumberPattern.optional(),
  'Sealink #': Patterns.SealinkPattern.optional(),
  'Emergency Contact Name': z.string().max(100).optional(),
  'Emergency Relation': z.string().max(50).optional(),
  'Emergency Contact Number': Patterns.Phone10.optional(),
  'Billing Email': Patterns.Email.optional(),
  'Profile Type': z.array(z.string()).optional(), // Lookup to driverProfileTypes
  'License Expiration': Patterns.DateDDMMMYY.optional(),
  'Date of Birth': Patterns.DateDDMMMYY.optional(),
  'Date of Hire': Patterns.DateDDMMMYY.optional(),
  'Medical Expiration': Patterns.DateDDMMMYY.optional(),
  'Twic Expiration': Patterns.DateDDMMMYY.optional(),
  'Sea Link Expiration': Patterns.DateDDMMMYY.optional(),
  Branch: createLookupString(undefined, 100, 'branches', 'name').optional(),
  'Home Branch Time Zone': createLookupString(undefined, 100, 'timezoneList', 'type').optional(),
});

// Combined Entity Schema
const EntitySchema: Record<string, z.ZodObject<any>> = {
  Load: LoadSchema,
  Carrier: CarrierSchema,
  'Load Tariff': LoadTariffSchema,
  Trailers: TrailersSchema,
  'Truck Owner': TruckOwnerSchema,
  Trucks: TrucksSchema,
  Users: UsersSchema,
  'Charge Profile': ChargeProfileSchema,
  'Chassis Owner': ChassisOwnerSchema,
  Chassis: ChassisSchema,
  People: PeopleSchema,
  Organization: OrganizationSchema,
  'Driver Charge Profile': DriverChargeProfileSchema,
  'Driver Tariff': DriverTariffSchema,
  Drivers: DriversSchema,
};

// Updated EntitySchemaLookupIds to match exportEntities.json
const EntitySchemaLookupIds: Record<string, string[]> = {
  Load: [
    'tmsCustomers',
    'containerSizes',
    'containerTypes',
    'containerOwners',
    'branches',
    'chassis',
    'chassisOwners',
    'chassisSizes',
    'chassisTypes',
    'commodities'
  ],
  Carrier: [
    'branches'
  ],
  'Load Tariff': [],
  Trailers: [
    'branches'
  ],
  'Truck Owner': [],
  Trucks: [
    'fleetOwners',
    'branches'
  ],
  Users: [
    'branches',
    'getAllPermissionRoles'
  ],
  'Charge Profile': [],
  'Chassis Owner': [],
  Chassis: [
    'chassisTypes',
    'chassisSizes',
    'chassisOwners',
    'branches'
  ],
  People: [
    'tmsCustomers'
  ],
  Organization: [
    'branches',
    'getTMSFleetCustomers',
    'currencies'
  ],
  'Driver Charge Profile': [],
  'Driver Tariff': [],
  Drivers: [
    'trucks',
    'driverProfileTypes',
    'branches',
    'timezoneList'
  ],
};

export {
  EntitySchema,
  EntitySchemaLookupIds,
  Patterns,
  createLookupString,
  createYesNoBoolean
};