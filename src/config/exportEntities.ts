
// This file now only defines the TypeScript interfaces for entities and their fields.
// The actual entity data is stored in 'exportEntities.json' in the project root
// and accessed via the API route /api/export-entities.

export interface LookupValidationConfig {
  lookupId: string; // Identifier for the lookup dataset (e.g., "chassisOwners")
  lookupField: string; // The field within the lookup dataset to validate against
}

export interface ExportEntityField {
  name: string; // Target API field name
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'email' | 'date';
  minLength?: number; // For string, email
  maxLength?: number; // For string, email
  pattern?: string;   // For string, email (regex as string)
  minValue?: number;  // For number
  maxValue?: number;  // For number
  lookupValidation?: LookupValidationConfig; // New property for lookup validation
}

export interface ExportEntity {
  id: string; // Unique identifier for the entity
  name: string; // User-friendly name for the dropdown
  url: string; // API endpoint PATH (relative to baseUrl)
  fields: ExportEntityField[];
}

export interface ExportConfig {
  baseUrl: string;
  entities: ExportEntity[];
}

// The actual configuration is no longer defined here.
// It's loaded from 'exportEntities.json' via an API call.
// You can manage 'exportEntities.json' using the Setup page in the application.
// The Setup page will fetch the current config and allow you to save changes back to the JSON file.

// Default empty config for type inference or initial setup if needed elsewhere,
// but the primary source is the JSON file.
export const defaultConfig: ExportConfig = {
  baseUrl: "https://api.example.com/v1",
  entities: []
};

