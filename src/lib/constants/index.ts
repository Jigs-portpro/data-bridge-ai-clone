
export const LookupKeyMapper: any = {
    'terminals': 'branches'
}

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