// This file defines the TypeScript interfaces for entities and their fields.
// The actual entity data is stored in the PostgreSQL database
// and accessed via the API route /api/export-entities.

export interface LookupValidationConfig {
  lookupId: string; // Identifier for the lookup dataset (e.g., "chassisOwners")
  lookupField: string; // The field within the lookup dataset to validate against
}

export interface ExportEntityField {
  name: string; // Display name for UI (user-friendly)
  apiFieldName?: string; // API field name (used for API mapping)
  displayName?: string; // User-friendly display name (fallback to name if not provided)
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'email' | 'date' | 'array';
  minLength?: number; // For string, email
  maxLength?: number; // For string, email
  pattern?: string;   // For string, email (regex as string)
  minValue?: number;  // For number
  maxValue?: number;  // For number
  enum?: string[];    // For enum validation - array of allowed values
  lookupValidation?: LookupValidationConfig; // New property for lookup validation
  isMulti?: boolean
}

export interface ExportEntity {
  id: string; // Unique identifier for the entity
  name: string; // User-friendly name for the dropdown
  url: string; // API endpoint PATH (relative to baseUrl)
  uploadType?: 'BULK_UPLOAD' | 'SINGLE_ROW_UPLOAD'; // Type of upload for this entity
  isBulkUpload?: boolean; // Legacy field for backward compatibility
  fields: ExportEntityField[];
}

export interface ExportConfig {
  _id?: string;
  baseUrl: string;
  entities: ExportEntity[];
}

// The actual configuration is loaded from the PostgreSQL database via an API call.
// You can manage entities using the Entity Management admin page in the application.
// The admin interface provides full CRUD operations for entities and their configurations.

// Default empty config for type inference or initial setup if needed elsewhere.
export const defaultConfig: ExportConfig = {
  baseUrl: "https://api.example.com/v1",
  entities: []
};

