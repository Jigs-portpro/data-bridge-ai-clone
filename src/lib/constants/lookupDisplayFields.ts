// Enum to specify which fields to display for each lookup type
export enum LookupDisplayFields {
  // Customer related lookups
  CUSTOMERS = 'company_name,name,email,phone',
  TMS_CUSTOMERS = 'company_name,name,email,phone',
  
  // Chassis related lookups
  CHASSIS_OWNERS = 'company_name,contact_name,phone,address',
  CHASSIS_SIZES = 'name,size',
  CHASSIS_TYPES = 'name,type',
  CHASSIS = 'chassisNo,chassisType,chassisSize,chassisOwner',
  
  // Container related lookups
  CONTAINER_SIZES = 'name,size',
  CONTAINER_TYPES = 'name,type',
  CONTAINER_OWNERS = 'company_name,name,contact_name',
  
  // Branch and location lookups
  BRANCHES = 'name,address,city,state',
  
  // Driver related lookups
  DRIVER_PROFILE_TYPES = 'type,description',
  DRIVER_PAY_GROUPS = 'name,description',
  DRIVER_GROUPS = 'name,description',
  
  // Fleet and truck related lookups
  FLEET_OWNERS = 'company_name,contact_name,phone',
  TRUCKS = 'equipmentID,licensePlate,make,model',
  
  // Permission and role lookups
  PERMISSION_ROLES = 'roleName,description',
  
  // Customer fleet lookups
  CUSTOMER_FLEET = 'company_name,name',
  
  // Timezone and location lookups
  TIMEZONE_LIST = 'type,description',
  
  // Commodities and goods
  COMMODITIES = 'name,description',
  
  // Financial and currency
  CURRENCIES = 'currencyCode,currencyName',
  CHARGE_CODES = 'value,description',
  
  // Groups and categories
  CITY_GROUPS = 'name,description',
  ZIP_CODE_GROUPS = 'name,description',
  CARRIER_GROUPS = 'name,description',
  
  // Customer service
  CSR = 'name,email,phone',
  
  // Charge profiles
  CHARGE_PROFILE = 'chargeProfileName,chargeName,description',
  DRIVER_CHARGE_PROFILE = 'chargeProfileName,chargeName,description',
}

// Type for the lookup field configuration
export type LookupFieldConfig = {
  [key in keyof typeof LookupDisplayFields]?: string[];
};

// Helper function to get display fields for a lookup
export function getLookupDisplayFields(lookupId: string): string[] {
  // Map lookup IDs to enum keys
  const lookupIdToEnumMap: Record<string, keyof typeof LookupDisplayFields> = {
    'customers': 'CUSTOMERS',
    'tmsCustomers': 'TMS_CUSTOMERS',
    'chassisOwners': 'CHASSIS_OWNERS',
    'chassisSizes': 'CHASSIS_SIZES',
    'chassisTypes': 'CHASSIS_TYPES',
    'chassis': 'CHASSIS',
    'containerSizes': 'CONTAINER_SIZES',
    'containerTypes': 'CONTAINER_TYPES',
    'containerOwners': 'CONTAINER_OWNERS',
    'branches': 'BRANCHES',
    'driverProfileTypes': 'DRIVER_PROFILE_TYPES',
    'driverPayGroups': 'DRIVER_PAY_GROUPS',
    'driverGroups': 'DRIVER_GROUPS',
    'fleetOwners': 'FLEET_OWNERS',
    'trucks': 'TRUCKS',
    'getAllPermissionRoles': 'PERMISSION_ROLES',
    'getTMSFleetCustomers': 'CUSTOMER_FLEET',
    'timezoneList': 'TIMEZONE_LIST',
    'commodities': 'COMMODITIES',
    'currencies': 'CURRENCIES',
    'chargeCodes': 'CHARGE_CODES',
    'cityGroups': 'CITY_GROUPS',
    'zipCodeGroups': 'ZIP_CODE_GROUPS',
    'carrierGroups': 'CARRIER_GROUPS',
    'CSR': 'CSR',
    'chargeProfile': 'CHARGE_PROFILE',
    'driverChargeProfile': 'DRIVER_CHARGE_PROFILE',
  };

  const enumKey = lookupIdToEnumMap[lookupId];
  if (!enumKey) {
    // Default to company_name and name if no specific mapping
    return ['company_name', 'name'];
  }

  const fieldString = LookupDisplayFields[enumKey];
  return fieldString.split(',');
}

// Helper function to get display name for a field
export function getFieldDisplayName(field: string): string {
  const fieldNameMap: Record<string, string> = {
    'company_name': 'Company Name',
    'name': 'Name',
    'email': 'Email',
    'phone': 'Phone',
    'contact_name': 'Contact Name',
    'address': 'Address',
    'city': 'City',
    'state': 'State',
    'size': 'Size',
    'type': 'Type',
    'description': 'Description',
    'chassisNo': 'Chassis Number',
    'chassisType': 'Chassis Type',
    'chassisSize': 'Chassis Size',
    'chassisOwner': 'Chassis Owner',
    'equipmentID': 'Equipment ID',
    'licensePlate': 'License Plate',
    'make': 'Make',
    'model': 'Model',
    'roleName': 'Role Name',
    'currencyCode': 'Currency Code',
    'currencyName': 'Currency Name',
    'value': 'Value',
    'chargeProfileName': 'Charge Profile Name',
    'chargeName': 'Charge Name',
  };

  return fieldNameMap[field] || field;
} 