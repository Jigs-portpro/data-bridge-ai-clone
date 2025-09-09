export const LookupKeyMapper: any = {
  terminals: "branches",
};

export const unitOfMeasureOptions = [
  { value: 'perday', label: 'Per Day' },
  { value: 'perhour', label: 'Per Hour' },
  { value: 'perpound', label: 'Per Pound' },
  { value: 'perkilogram', label: 'Per Kilogram' },
  { value: 'permile', label: 'Per Mile' },
  { value: 'perkilometer', label: 'Per Kilometer' },
  { value: 'perRoadTollMile', label: 'Per Road Toll Mile' },
  { value: 'perRoadTollKilometer', label: 'Per Road Toll Kilometer' },
  { value: 'fixed', label: 'Fixed' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'per15min', label: 'Per 15min' },
  { value: 'per30min', label: 'Per 30min' },
  { value: 'per45min', label: 'Per 45min' },
  { value: 'radiusRate', label: 'Radius Rate' },
  { value: 'compoundingRadiusRate', label: 'Compounding Radius Rate' },
  { value: 'permove', label: 'Per Move' },
  { value: 'percentageByLeg', label: 'Percentage By Leg' },
  { value: 'percentageByMove', label: 'Percentage By Move' },
  { value: 'perHourBlocks', label: 'Per Hour Blocks' }
];
export const CARRIER_ID_STORAGE_KEY = 'carrierId';
export const AUTH_TOKEN_STORAGE_KEY = 'datawiseAuthToken';
export const AUTH_COMPANY_STORAGE_KEY = 'datawiseAuthCompany';
export const AI_PROVIDER_STORAGE_KEY = 'datawiseAiProvider';
export const AI_MODEL_NAME_STORAGE_KEY = 'datawiseAiModelName';
export const ENTITY_NAME_STORAGE_KEY = 'datawiseEntityName';

// Define default provider and model (ensure this provider has its key in .env for it to work)
export const DEFAULT_AI_PROVIDER = "googleai";
export const DEFAULT_AI_MODEL_NAME = "gemini-2.5-flash";

export const NOT_MAPPED_VALUE = "__NOT_MAPPED_PLACEHOLDER__";
export const MAX_VALIDATION_MESSAGES_DISPLAYED = 100;
export const SELECTED_ENTITY_ID_KEY = "export_selected_entity_id";

export const DATATABLE_DATA_KEY = 'datatable_data';
export const DATATABLE_COLUMNS_KEY = 'datatable_columns';
export const CHATPANE_HISTORY_KEY = 'chatpane_history';
export const DATATABLE_EDITED_CELLS_KEY = 'datatable_edited_cells';
export const EXPORT_FIELD_MAPPINGS_KEY = 'export_field_mappings';
export const FILENAME_STORAGE_KEY = 'datatable_filename';
export const API_RESPONSE_STORAGE_KEY = 'api_response_data';

export const STATUSES = [
  {
    "value": "CHASSISPICK/arrived",
    "label": "ENROUTE TO CHASSIS"
  },
  {
    "value": "CHASSISPICK/departed",
    "label": "ARRIVED TO CHASSIS"
  },
  {
    "value": "PULLCONTAINER/arrived",
    "label": "ENROUTE TO PICK CONTAINER"
  },
  {
    "value": "PULLCONTAINER/departed",
    "label": "ARRIVED AT PICK CONTAINER"
  },
  {
    "value": "DELIVERLOAD/arrived",
    "label": "ENROUTE TO DELIVER LOAD"
  },
  {
    "value": "DELIVERLOAD/departed",
    "label": "ARRIVED AT DELIVER LOAD"
  },
  {
    "value": "DROPCONTAINER/arrived",
    "label": "ENROUTE TO DROP CONTAINER"
  },
  {
    "value": "DROPCONTAINER/departed",
    "label": "DROPPED"
  },
  {
    "value": "STOPOFF/arrived",
    "label": "ENROUTE TO STOP OFF"
  },
  {
    "value": "STOPOFF/departed",
    "label": "ARRIVED AT STOP OFF"
  },
  {
    "value": "HOOKCONTAINER/arrived",
    "label": "ENROUTE TO HOOK CONTAINER"
  },
  {
    "value": "HOOKCONTAINER/departed",
    "label": "ARRIVED TO HOOK CONTAINER"
  },
  {
    "value": "RETURNCONTAINER/arrived",
    "label": "ENROUTE TO RETURN LOAD"
  },
  {
    "value": "RETURNCONTAINER/departed",
    "label": "ARRIVED AT RETURN LOAD"
  },
  {
    "value": "RETURNCHASSIS/arrived",
    "label": "ENROUTE TO RETURN CHASSIS"
  },
  {
    "value": "RETURNCHASSIS/departed",
    "label": "ARRIVED TO RETURN CHASSIS"
  },
  {
    "value": "CHASSISTERMINATION/arrived",
    "label": "ENROUTE TO CHASSIS TERMINATION"
  },
  {
    "value": "CHASSISTERMINATION/departed",
    "label": "ARRIVED AT CHASSIS TERMINATION"
  },
  {
    "value": "COMPLETED",
    "label": "COMPLETED"
  },
  {
    "value": "PICKUP APT",
    "label": "PICKUP APT"
  },
  {
    "value": "DELIVERY APT",
    "label": "DELIVERY APT"
  },
  {
    "value": "RETURN APT",
    "label": "RETURN APT"
  },
  {
    "value": "READY TO RETURN",
    "label": "READY TO RETURN"
  },
  {
    "value": "POD IN",
    "label": "POD IN"
  },
  {
    "value": "POD OUT",
    "label": "POD OUT"
  },
  {
    "value": "LIFTOFF/arrived",
    "label": "ENROUTE TO LIFT OFF"
  },
  {
    "value": "LIFTOFF/departed",
    "label": "ARRIVED AT LIFT OFF"
  },
  {
    "value": "LIFTON/arrived",
    "label": "ENROUTE TO LIFT ON"
  },
  {
    "value": "LIFTON/departed",
    "label": "ARRIVED AT LIFT ON"
  }
];

// Enum to distinguish between bulk upload and single row upload entities
export enum UploadType {
  BULK_UPLOAD = 'BULK_UPLOAD',
  SINGLE_ROW_UPLOAD = 'SINGLE_ROW_UPLOAD'
}

// Entities that use bulk upload (all data sent in one API call)
export enum BulkUploadEntities {
  TARIFF = 'Tariff',
  TRAILERS = 'Trailers',
  CHARGE_PROFILE = 'Charge Profile',
  CHASSIS = 'Chassis',
  CHASSIS_OWNER = 'Chassis Owner',
  ORGANIZATION = 'Organization',
  DRIVERS = 'Drivers',
  TRUCK_OWNER = 'Truck Owner',
  TRUCKS = 'Trucks',
  USERS = 'Users'
}

// Entities that use single row upload (one API call per row)
export enum SingleRowUploadEntities {
  LOAD = 'Load',
  CARRIER = 'Carrier',
  PEOPLE = 'People'
}

// Helper function to determine upload type for an entity
export const getUploadType = (entityName: string): UploadType => {
  const bulkUploadEntities = Object.values(BulkUploadEntities);
  const singleRowUploadEntities = Object.values(SingleRowUploadEntities);
  
  if (bulkUploadEntities.includes(entityName as BulkUploadEntities)) {
    return UploadType.BULK_UPLOAD;
  } else if (singleRowUploadEntities.includes(entityName as SingleRowUploadEntities)) {
    return UploadType.SINGLE_ROW_UPLOAD;
  }
  
  // Default to single row upload for unknown entities
  return UploadType.SINGLE_ROW_UPLOAD;
};

// Helper function to check if entity is bulk upload
export const isBulkUploadEntity = (entityName: string): boolean => {
  return getUploadType(entityName) === UploadType.BULK_UPLOAD;
};

// Helper function to check if entity is single row upload
export const isSingleRowUploadEntity = (entityName: string): boolean => {
  return getUploadType(entityName) === UploadType.SINGLE_ROW_UPLOAD;
};

export const radiusRate = ["radiusRate", "compoundingRadiusRate"];
export const nonRulesConstant = ["fixed", "percentage", "perpound","perkilogram",];
export const radiusRateType = [
  {label: "Fixed", value: "fixed"},
  {label: "Per Unit", value: "perUnit"}
]

/**
 * Enum for entities that require their payload to be wrapped in a "data" array
 * when sending to the API. This is typically required for entities that expect
 * the payload structure: { "data": [payload] }
 * 
 * To add a new entity that needs data array wrapping:
 * 1. Add the entity name to this enum
 * 2. The wrapPayloadInDataArray function will automatically handle it
 */
export enum DataArrayWrappedEntities {
  TRUCK = 'Trucks',
  TRUCK_OWNER = 'Truck Owner',
  CARRIER = 'Carrier',
  DRIVER = 'Drivers',
  ORGANIZATION = 'Organization',
  USER = 'Users',
  TRAILER = 'Trailers',
  CHASSIS = 'Chassis',
  CHASSIS_OWNER = 'Chassis Owner',
  TRUCKS = 'Trucks',
}

/**
 * Check if an entity requires its payload to be wrapped in a "data" array
 * @param entityName - The name of the entity to check
 * @returns boolean - True if the entity needs data array wrapping
 */
export const requiresDataArrayWrapping = (entityName: string): boolean => {
  return Object.values(DataArrayWrappedEntities).includes(entityName as DataArrayWrappedEntities);
};

/**
 * Wrap payload in a "data" array if the entity requires it
 * @param payload - The payload to potentially wrap
 * @param entityName - The name of the entity
 * @returns The wrapped or unwrapped payload
 * 
 * Example:
 * - For entities in DataArrayWrappedEntities: { "data": [payload] }
 * - For other entities: payload (unchanged)
 */
export const wrapPayloadInDataArray = (payload: any, entityName: string): any => {
  if (requiresDataArrayWrapping(entityName)) {
    return { data: payload };
  }
  return payload;
};

export const EVENT_OPTIONS = [
  { label: "Pick Up Container", value: "PULLCONTAINER" },
  { label: "Deliver Container", value: "DELIVERLOAD" },
  { label: "Return Container", value: "RETURNCONTAINER" },
  { label: "Drop Container", value: "DROPCONTAINER" },
  { label: "Stop Off", value: "STOPOFF" },
  { label: "Terminate Chassis", value: "CHASSISTERMINATION" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Hook Container", value: "HOOKCONTAINER" },
  { label: "Lift Off", value: "LIFTOFF" },
  { label: "Lift On", value: "LIFTON" },
  { label: "Deliver Load - Drop & Hook", value: "DELIVERLOAD_DROPHOOK" },
  { label: "Hook Chassis", value: "CHASSISPICK" },
  { label: "Drop Chassis", value: "DROPCHASSIS" }
];

// Export entity types and pagination config
export { EntityType, ENTITY_PAGINATION_CONFIG, NullValueFilteredEntities, requiresNullValueFiltering } from './entities';

// Export lookup display fields configuration
export { LookupDisplayFields, getLookupDisplayFields, getFieldDisplayName } from './lookupDisplayFields';
