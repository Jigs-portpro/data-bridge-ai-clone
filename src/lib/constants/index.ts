export const LookupKeyMapper: any = {
    'terminals': 'branches'
}

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
export const DEFAULT_AI_PROVIDER = 'googleai';
export const DEFAULT_AI_MODEL_NAME = 'gemini-2.5-flash';

export const NOT_MAPPED_VALUE = "__NOT_MAPPED_PLACEHOLDER__";
export const MAX_VALIDATION_MESSAGES_DISPLAYED = 100;
export const SELECTED_ENTITY_ID_KEY = "export_selected_entity_id";

export const DATATABLE_DATA_KEY = 'datatable_data';
export const DATATABLE_COLUMNS_KEY = 'datatable_columns';
export const CHATPANE_HISTORY_KEY = 'chatpane_history';
export const DATATABLE_EDITED_CELLS_KEY = 'datatable_edited_cells';
export const EXPORT_FIELD_MAPPINGS_KEY = 'export_field_mappings';
export const FILENAME_STORAGE_KEY = 'datatable_filename';

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
    "value": "CHASSISTERMINATION/arrived",
    "label": "ENROUTE TO RETURN CHASSIS"
  },
  {
    "value": "CHASSISTERMINATION/departed",
    "label": "ARRIVED TO RETURN CHASSIS"
  },
  {
    "value": "COMPLETED/loadCompletedAt",
    "label": "COMPLETED"
  },
  {
    "value": "PICKUP/apt",
    "label": "PICKUP APT"
  },
  {
    "value": "DELIVERY/apt",
    "label": "DELIVERY APT"
  },
  {
    "value": "RETURN/apt",
    "label": "RETURN APT"
  },
  {
    "value": "READY_TO_RETURN/apt",
    "label": "READY TO RETURN"
  },
  {
    "value": "POD_IN/apt",
    "label": "POD IN"
  },
  {
    "value": "POD_OUT/apt",
    "label": "POD OUT"
  },
  {
    "value": "LIFTOFF/arrived",
    "label": "ENROUTE TO LIFT OFF"
  },
  {
    "value": "LIFTOFF/departed",
    "label": "GROUNDED"
  },
  {
    "value": "LIFTON/arrived",
    "label": "ENROUTE TO LIFT ON"
  },
  {
    "value": "LIFTON/departed",
    "label": "ARRIVED TO LIFT ON"
  }
];

export const radiusRate = ["radiusRate", "compoundingRadiusRate"];
export const nonRulesConstant = ["fixed", "percentage", "perpound","perkilogram",];
export const radiusRateType = [
  {label: "Fixed", value: "fixed"},
  {label: "Per Unit", value: "perUnit"}
]

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