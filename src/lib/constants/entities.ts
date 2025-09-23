// Entity types enum for lookup data sources
export enum EntityType {
  CHARGE_PROFILE = 'Charge Profile',
  DRIVER_CHARGE_PROFILE = 'Driver Charge Profile',
  CHASSIS_OWNERS = 'Chassis Owners',
  CHASSIS_SIZES = 'Chassis Sizes',
  CHASSIS_TYPES = 'Chassis Types',
  CONTAINER_SIZES = 'Container Sizes',
  CONTAINER_TYPES = 'Container Types',
  CONTAINER_OWNERS = 'Container Owners',
  BRANCHES = 'Branches',
  DRIVER_PROFILE_TYPES = 'Driver Profile Types',
  CUSTOMER = 'Customer',
  PERMISSION_ROLES = 'Permission Roles',
  FLEET_OWNERS = 'Fleet Owners',
  CUSTOMER_FLEET = 'Customer Fleet',
  TIMEZONE_LIST = 'Timezone List',
  COMMODITIES = 'Commodities',
  CHASSIS = 'Chassis',
  TRUCKS = 'Trucks',
  CURRENCIES = 'Currencies',
  CHARGE_CODES = 'Charge Codes',
  DRIVER_PAY_GROUPS = 'Driver Pay Groups',
  CITY_GROUPS = 'City Groups',
  ZIP_CODE_GROUPS = 'Zip Code Groups',
  CSR = 'CSR',
  DRIVER_GROUPS = 'Driver Groups',
  CARRIER_GROUPS = 'Carrier Groups',
  // Add missing entity types from exportEntities.json
  LOAD = 'Load',
  CARRIER = 'Carrier',
  TARIFF = 'Tariff',
  TRAILERS = 'Trailers',
  TRUCK_OWNER = 'Truck Owner',
  USERS = 'Users',
  CHASSIS_OWNER = 'Chassis Owner',
  PEOPLE = 'People',
  ORGANIZATION = 'Organization',
  DRIVERS = 'Drivers',
  PERDIEM = 'PerDiem',
  // Group entities
  CUSTOMER_GROUP = 'Customer Group',
  CITIES_GROUP = 'Cities Group',
  POSTAL_ZIP_GROUP = 'Postal/Zip Group'
}

/**
 * Enum for entities that require null value filtering during export.
 * These entities need to have null/undefined values removed from their payload
 * before sending to the API to prevent validation errors.
 */
export enum NullValueFilteredEntities {
  DRIVERS = 'Drivers',
}

/**
 * Check if an entity requires null value filtering during export
 * @param entityName - The name of the entity to check
 * @returns boolean - True if the entity needs null value filtering
 */
export const requiresNullValueFiltering = (entityName: string): boolean => {
  return Object.values(NullValueFilteredEntities).includes(entityName as NullValueFilteredEntities);
};

// Default pagination settings for each entity type
export const ENTITY_PAGINATION_CONFIG = {
  [EntityType.CHARGE_PROFILE]: { initial: 15, increment: 15, serverSide: false },
  [EntityType.DRIVER_CHARGE_PROFILE]: { initial: 30, increment: 30, serverSide: true },
  [EntityType.CHASSIS_OWNERS]: { initial: 30, increment: 30, serverSide: false },
  [EntityType.CHASSIS_SIZES]: { initial: 30, increment: 30, serverSide: false },
  [EntityType.CHASSIS_TYPES]: { initial: 30, increment: 30, serverSide: false },
  [EntityType.CONTAINER_SIZES]: { initial: 30, increment: 30, serverSide: false },
  [EntityType.CONTAINER_TYPES]: { initial: 30, increment: 30, serverSide: false },
  [EntityType.CONTAINER_OWNERS]: { initial: 30, increment: 30, serverSide: false },
  [EntityType.BRANCHES]: { initial: 30, increment: 30, serverSide: false },
  [EntityType.DRIVER_PROFILE_TYPES]: { initial: 30, increment: 30, serverSide: false },
  [EntityType.CUSTOMER]: { initial: 30, increment: 30, serverSide: false },
  [EntityType.PERMISSION_ROLES]: { initial: 30, increment: 30, serverSide: false },
  [EntityType.FLEET_OWNERS]: { initial: 30, increment: 30, serverSide: false },
  [EntityType.CUSTOMER_FLEET]: { initial: 30, increment: 30, serverSide: false },
  [EntityType.TIMEZONE_LIST]: { initial: 30, increment: 30, serverSide: false },
  [EntityType.COMMODITIES]: { initial: 30, increment: 30, serverSide: false },
  [EntityType.CHASSIS]: { initial: 30, increment: 30, serverSide: false },
  [EntityType.TRUCKS]: { initial: 30, increment: 30, serverSide: false },
  [EntityType.CURRENCIES]: { initial: 30, increment: 30, serverSide: false },
  [EntityType.CHARGE_CODES]: { initial: 30, increment: 30, serverSide: false },
  [EntityType.DRIVER_PAY_GROUPS]: { initial: 30, increment: 30, serverSide: false },
  [EntityType.CITY_GROUPS]: { initial: 30, increment: 30, serverSide: false },
  [EntityType.ZIP_CODE_GROUPS]: { initial: 30, increment: 30, serverSide: false },
  [EntityType.CSR]: { initial: 30, increment: 30, serverSide: false },
  [EntityType.DRIVER_GROUPS]: { initial: 30, increment: 30, serverSide: false },
  [EntityType.CARRIER_GROUPS]: { initial: 30, increment: 30, serverSide: false },
  [EntityType.PERDIEM]: { initial: 30, increment: 30, serverSide: false },
  [EntityType.LOAD]: { initial: 30, increment: 30, serverSide: false },
  [EntityType.CARRIER]: { initial: 30, increment: 30, serverSide: false },
  [EntityType.TARIFF]: { initial: 30, increment: 30, serverSide: false },
  [EntityType.TRAILERS]: { initial: 30, increment: 30, serverSide: false },
  [EntityType.TRUCK_OWNER]: { initial: 30, increment: 30, serverSide: false },
  [EntityType.USERS]: { initial: 30, increment: 30, serverSide: false },
  [EntityType.CHASSIS_OWNER]: { initial: 30, increment: 30, serverSide: false },
  [EntityType.PEOPLE]: { initial: 30, increment: 30, serverSide: false },
  [EntityType.ORGANIZATION]: { initial: 30, increment: 30, serverSide: false },
  [EntityType.DRIVERS]: { initial: 30, increment: 30, serverSide: false },
  // Group entities pagination
  [EntityType.CUSTOMER_GROUP]: { initial: 30, increment: 30, serverSide: false },
  [EntityType.CITIES_GROUP]: { initial: 30, increment: 30, serverSide: false },
  [EntityType.POSTAL_ZIP_GROUP]: { initial: 30, increment: 30, serverSide: false }
} as const;
