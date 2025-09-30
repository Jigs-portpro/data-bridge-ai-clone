import { z } from 'zod';

// Types for database validation rules
interface EntityField {
  id: string;
  entity_id: string;
  field_name: string;
  display_name: string;
  field_type: 'string' | 'number' | 'date' | 'boolean' | 'email' | 'time' | 'array';
  is_required: boolean;
  min_length?: number;
  max_length?: number;
  sort_order: number;
}

interface EntityValidation {
  id: string;
  entity_field_id: string;
  validation_type: 'regex' | 'enum' | 'lookup';
  pattern?: string;
  enum_values?: string[];
  lookup_id?: string;
  lookup_field?: string;
  error_message?: string;
  is_active: boolean;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  field: string;
  message: string;
  value: any;
  rowIndex?: number;
}

/**
 * ValidationService - Central service for data validation
 * Bridges current useValidation.ts with PostgreSQL validation rules
 */
export class ValidationService {
  private entityFieldsCache = new Map<string, EntityField[]>();
  private validationRulesCache = new Map<string, EntityValidation[]>();
  private cacheTimestamp = new Map<string, number>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get entity fields with caching
   */
  async getEntityFields(entityKey: string): Promise<EntityField[]> {
    const cacheKey = `fields_${entityKey}`;

    // Check cache
    if (this.isCacheValid(cacheKey)) {
      return this.entityFieldsCache.get(cacheKey) || [];
    }

    try {
      // First get the entity ID
      const entitiesResponse = await fetch('/api/entities');
      if (!entitiesResponse.ok) {
        throw new Error(`Failed to fetch entities: ${entitiesResponse.statusText}`);
      }
      const entitiesData = await entitiesResponse.json();
      const entity = entitiesData.data?.find((e: any) => e.entity_key === entityKey);

      if (!entity) {
        throw new Error(`Entity with key "${entityKey}" not found`);
      }

      // Get fields for this entity
      const response = await fetch('/api/entity-fields');
      if (!response.ok) {
        throw new Error(`Failed to fetch entity fields: ${response.statusText}`);
      }

      const data = await response.json();
      const fields = data.data?.filter((f: any) => f.entity_id === entity.id) || [];

      // Cache the results
      this.entityFieldsCache.set(cacheKey, fields);
      this.cacheTimestamp.set(cacheKey, Date.now());

      return fields;
    } catch (error) {
      console.error(`Error fetching entity fields for ${entityKey}:`, error);
      return [];
    }
  }

  /**
   * Get validation rules for an entity with caching
   */
  async getValidationRules(entityKey: string): Promise<EntityValidation[]> {
    const cacheKey = `rules_${entityKey}`;

    // Check cache
    if (this.isCacheValid(cacheKey)) {
      return this.validationRulesCache.get(cacheKey) || [];
    }

    try {
      // First get entity fields to get field IDs
      const fields = await this.getEntityFields(entityKey);
      const fieldIds = fields.map(f => f.id);

      if (fieldIds.length === 0) {
        return [];
      }

      // Get validation rules for these fields
      const response = await fetch('/api/entity-validations');
      if (!response.ok) {
        throw new Error(`Failed to fetch validation rules: ${response.statusText}`);
      }

      const data = await response.json();
      const allRules = data.data || [];

      // Filter rules for this entity's fields
      const entityRules = allRules.filter((rule: EntityValidation) =>
        fieldIds.includes(rule.entity_field_id) && rule.is_active
      );

      // Cache the results
      this.validationRulesCache.set(cacheKey, entityRules);
      this.cacheTimestamp.set(cacheKey, Date.now());

      return entityRules;
    } catch (error) {
      console.error(`Error fetching validation rules for ${entityKey}:`, error);
      return [];
    }
  }

  /**
   * Validate a single field value against its rules
   */
  async validateField(
    entityKey: string,
    fieldName: string,
    value: any,
    lookupDataSources?: any
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    try {
      // Get field definition and validation rules
      const fields = await this.getEntityFields(entityKey);
      const field = fields.find(f => f.field_name === fieldName);

      if (!field) {
        return errors; // Field not found, skip validation
      }

      const rules = await this.getValidationRules(entityKey);
      const fieldRules = rules.filter(r => r.entity_field_id === field.id);

      const stringValue = value === null || value === undefined ? "" : String(value).trim();

      // Basic field validation (required, type, length)
      if (field.is_required && stringValue === "") {
        errors.push({
          field: fieldName,
          message: `${field.display_name} is required`,
          value
        });
        return errors; // Skip further validation if required field is empty
      }

      if (stringValue !== "") {
        // Type validation
        switch (field.field_type) {
          case 'number':
            const numValue = parseFloat(stringValue);
            if (isNaN(numValue)) {
              errors.push({
                field: fieldName,
                message: `${field.display_name} must be a number`,
                value
              });
            }
            break;

          case 'email':
            if (!this.isValidEmail(stringValue)) {
              errors.push({
                field: fieldName,
                message: `${field.display_name} must be a valid email address`,
                value
              });
            }
            break;

          case 'boolean':
            if (!['true', 'false', '1', '0'].includes(stringValue.toLowerCase())) {
              errors.push({
                field: fieldName,
                message: `${field.display_name} must be true or false`,
                value
              });
            }
            break;
        }

        // Length validation
        if (field.min_length && stringValue.length < field.min_length) {
          errors.push({
            field: fieldName,
            message: `${field.display_name} must be at least ${field.min_length} characters`,
            value
          });
        }

        if (field.max_length && stringValue.length > field.max_length) {
          errors.push({
            field: fieldName,
            message: `${field.display_name} must be no more than ${field.max_length} characters`,
            value
          });
        }

        // Advanced validation rules from PostgreSQL
        for (const rule of fieldRules) {
          const ruleErrors = await this.applyValidationRule(rule, field, stringValue, lookupDataSources);
          errors.push(...ruleErrors);
        }
      }

    } catch (error) {
      console.error(`Error validating field ${fieldName}:`, error);
      errors.push({
        field: fieldName,
        message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        value
      });
    }

    return errors;
  }

  /**
   * Apply a specific validation rule
   */
  private async applyValidationRule(
    rule: EntityValidation,
    field: EntityField,
    value: string,
    lookupDataSources?: any
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    try {
      switch (rule.validation_type) {
        case 'regex':
          if (rule.pattern) {
            const regex = new RegExp(rule.pattern);
            if (!regex.test(value)) {
              errors.push({
                field: field.field_name,
                message: rule.error_message || `${field.display_name} format is invalid`,
                value
              });
            }
          }
          break;

        case 'enum':
          if (rule.enum_values && !rule.enum_values.includes(value)) {
            errors.push({
              field: field.field_name,
              message: rule.error_message || `${field.display_name} must be one of: ${rule.enum_values.join(', ')}`,
              value
            });
          }
          break;

        case 'lookup':
          if (rule.lookup_id && rule.lookup_field && lookupDataSources) {
            const lookupErrors = await this.validateLookup(
              rule.lookup_id,
              rule.lookup_field,
              value,
              field,
              rule.error_message,
              lookupDataSources
            );
            errors.push(...lookupErrors);
          }
          break;
      }
    } catch (error) {
      console.error(`Error applying validation rule ${rule.id}:`, error);
      errors.push({
        field: field.field_name,
        message: rule.error_message || `Validation rule error`,
        value
      });
    }

    return errors;
  }

  /**
   * Validate lookup field
   */
  private async validateLookup(
    lookupId: string,
    lookupField: string,
    value: string,
    field: EntityField,
    errorMessage?: string,
    lookupDataSources?: any
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    try {
      const lookupSource = lookupDataSources[lookupId];
      if (!lookupSource) {
        errors.push({
          field: field.field_name,
          message: `Lookup source "${lookupId}" not available`,
          value
        });
        return errors;
      }

      const lookupData = lookupSource.getData();
      if (!lookupData || lookupData.length === 0) {
        errors.push({
          field: field.field_name,
          message: `Lookup data for "${lookupId}" not loaded`,
          value
        });
        return errors;
      }

      // Check if lookup field exists
      const firstItem = lookupData[0];
      if (!firstItem.hasOwnProperty(lookupField)) {
        errors.push({
          field: field.field_name,
          message: `Lookup field "${lookupField}" not found in ${lookupId}`,
          value
        });
        return errors;
      }

      // Check if value exists in lookup data
      const found = lookupData.some((item: any) =>
        String(item[lookupField]).trim() === value.trim()
      );

      if (!found) {
        errors.push({
          field: field.field_name,
          message: errorMessage || `${field.display_name} value not found in ${lookupId}`,
          value
        });
      }

    } catch (error) {
      console.error(`Error validating lookup ${lookupId}:`, error);
      errors.push({
        field: field.field_name,
        message: `Lookup validation error`,
        value
      });
    }

    return errors;
  }

  /**
   * Validate entire row of data
   */
  async validateRow(
    entityKey: string,
    rowData: Record<string, any>,
    fieldMappings: Record<string, string>,
    lookupDataSources?: any,
    rowIndex?: number
  ): Promise<ValidationResult> {
    console.log(`🎯 VALIDATION SOURCE: ValidationService (PostgreSQL) - Entity: ${entityKey}, Row: ${rowIndex || 'unknown'}`);

    const errors: ValidationError[] = [];

    try {
      const fields = await this.getEntityFields(entityKey);

      for (const field of fields) {
        const sourceColumn = fieldMappings[field.display_name];
        if (sourceColumn && rowData.hasOwnProperty(sourceColumn)) {
          const value = rowData[sourceColumn];
          const fieldErrors = await this.validateField(entityKey, field.field_name, value, lookupDataSources);

          // Add row index to errors
          const errorsWithRowIndex = fieldErrors.map(error => ({
            ...error,
            rowIndex
          }));

          errors.push(...errorsWithRowIndex);
        }
      }
    } catch (error) {
      console.error(`Error validating row for entity ${entityKey}:`, error);
      errors.push({
        field: 'general',
        message: `Row validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        value: rowData,
        rowIndex
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    console.log(`🧹 CACHE CLEAR: ValidationService (PostgreSQL) - Clearing all validation caches`);
    this.entityFieldsCache.clear();
    this.validationRulesCache.clear();
    this.cacheTimestamp.clear();
  }

  /**
   * Check if cache is valid
   */
  private isCacheValid(key: string): boolean {
    const timestamp = this.cacheTimestamp.get(key);
    if (!timestamp) return false;
    return Date.now() - timestamp < this.CACHE_TTL;
  }

  /**
   * Email validation helper
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Export singleton instance
export const validationService = new ValidationService();