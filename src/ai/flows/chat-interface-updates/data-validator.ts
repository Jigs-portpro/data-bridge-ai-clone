import type { LookupManager } from '@/lib/lookupManager';
import { z } from 'genkit';
export interface ValidationResult {
  updatedData: any[];
  validationErrors: string[];
}

export function validateAndCorrectData(
  data: any[],
  entitySchema: z.ZodObject<any>,
  lookupManager: LookupManager | null
): ValidationResult {
  const validationErrors: string[] = [];
  
  const updatedData = data.map((row: any, index: number) => {
    const correctedRow = { ...row };
    
    // Validate each field that exists in both the row and the schema
    Object.keys(row).forEach((column) => {
      const cleanColumnName = column.replace('*', '');
      if (entitySchema.shape[cleanColumnName]) {
        const fieldSchema = entitySchema.shape[cleanColumnName];
        const value = row[column];
        const stringValue = value === null || value === undefined ? "" : String(value).trim();
        
        // Schema validation
        const validation = fieldSchema.safeParse(value);
        
        if (!validation.success) {
          console.warn(`Invalid ${cleanColumnName} value at row ${index}: ${value}`, validation.error.errors);
          validationErrors.push(`Row ${index + 1}, ${cleanColumnName}: ${validation.error.errors.map((e: any) => e.message).join(', ')}`);
          
          // Apply intelligent fallback corrections based on field type and constraints
          const correctedValue = applyCorrectionFallback(
            value,
            fieldSchema,
            cleanColumnName,
            column.includes('*')
          );
          correctedRow[column] = correctedValue;
        }
        
        // Additional lookup validation if lookup manager is available
        if (lookupManager && stringValue) {
          const lookupValidationResult = performLookupValidation(
            stringValue,
            cleanColumnName,
            lookupManager,
            index
          );
          
          if (lookupValidationResult.error) {
            validationErrors.push(lookupValidationResult.error);
          }
        }
      }
    });
    
    return correctedRow;
  });

  return { updatedData, validationErrors };
}

function applyCorrectionFallback(
  value: any,
  fieldSchema: any,
  cleanColumnName: string,
  isRequired: boolean
): any {
  const fieldType = fieldSchema._def.typeName;
  const minLength = (fieldSchema._def as any).checks?.find((c: any) => c.kind === 'min')?.value || null;
  const maxLength = (fieldSchema._def as any).checks?.find((c: any) => c.kind === 'max')?.value || null;
  const requiredField = isRequired || !fieldSchema.isOptional();
  
  if (fieldType === 'ZodString') {
    if (requiredField && (!value || (minLength && value.length < minLength))) {
      // Provide a default value based on field name
      return getDefaultValueByFieldName(cleanColumnName);
    } else if (value && maxLength && value.length > maxLength) {
      return value.slice(0, maxLength);
    } else if (!value && !requiredField) {
      // Keep empty value for optional fields
      return '';
    }
  }
  
  return value;
}

function getDefaultValueByFieldName(fieldName: string): string {
  const lowerFieldName = fieldName.toLowerCase();
  
  if (lowerFieldName.includes('branch')) return 'DefaultBranch';
  if (lowerFieldName.includes('email')) return 'default@example.com';
  if (lowerFieldName.includes('name')) return 'DefaultName';
  if (lowerFieldName.includes('address')) return 'Default Address';
  if (lowerFieldName.includes('city')) return 'DefaultCity';
  if (lowerFieldName.includes('state')) return 'DefaultState';
  if (lowerFieldName.includes('country')) return 'US';
  if (lowerFieldName.includes('zip')) return '00000';
  
  return `Default${fieldName}`;
}

function performLookupValidation(
  stringValue: string,
  cleanColumnName: string,
  lookupManager: LookupManager,
  rowIndex: number
): { error?: string } {
  // Lookup mappings based on sourceColumn values from exportEntities.json
  const possibleLookupMappings: Record<string, { lookupId: string; lookupField: string; isMulti?: boolean }> = {
    // Load entity - customer and location lookups
    'CUSTOMER': { lookupId: 'customers', lookupField: 'name' },
    'shipper': { lookupId: 'customers', lookupField: 'name' },
    'return': { lookupId: 'customers', lookupField: 'name' },
    'chassisPick': { lookupId: 'customers', lookupField: 'name' },
    'chassisTermination': { lookupId: 'customers', lookupField: 'name' },
    
    // Container and chassis lookups
    'containerSize': { lookupId: 'containerSizes', lookupField: 'name' },
    'containerType': { lookupId: 'containerTypes', lookupField: 'name' },
    'containerOwner': { lookupId: 'containerOwners', lookupField: 'name' },
    'chassisNo': { lookupId: 'chassis', lookupField: 'chassis_no' },
    'chassisOwner': { lookupId: 'chassisOwners', lookupField: 'company_name' },
    'chassisSize': { lookupId: 'chassisSizes', lookupField: 'name' },
    'chassisType': { lookupId: 'chassisTypes', lookupField: 'name' },
    
    // Branch/Terminal lookups
    'terminal': { lookupId: 'branches', lookupField: 'name' },
    'terminals': { lookupId: 'branches', lookupField: 'name', isMulti: true },
    'branch': { lookupId: 'branches', lookupField: 'name' },
    'newTerminal': { lookupId: 'branches', lookupField: 'name' },
    
    // Commodity lookup
    'commodity': { lookupId: 'commodities', lookupField: 'name' },
    
    // Truck/Equipment lookups
    'equipmentID': { lookupId: 'trucks', lookupField: 'equipmentID' },
    'truck': { lookupId: 'trucks', lookupField: 'equipmentID' },
    'fleetTruckOwner': { lookupId: 'fleetOwners', lookupField: 'company_name' },
    
    // Driver specific lookups
    'profileType': { lookupId: 'driverProfileTypes', lookupField: 'type' },
    'homeTerminalTimezone': { lookupId: 'timezoneList', lookupField: 'type' },
    
    // User/Organization lookups
    'CustomerID': { lookupId: 'tmsCustomers', lookupField: 'company_name' },
    'company_name': { lookupId: 'tmsCustomers', lookupField: 'company_name' },
    'customRole': { lookupId: 'getAllPermissionRoles', lookupField: 'roleName' },
    'fleetCustomer': { lookupId: 'getTMSFleetCustomers', lookupField: 'company_name' },
    'invoiceCurrencyWithCarrier': { lookupId: 'currencies', lookupField: 'currencyCode' },
    
    // Legacy/common variations
    'customer': { lookupId: 'customers', lookupField: 'name' },
    'truckNumber': { lookupId: 'trucks', lookupField: 'equipmentID' },
    'equipment': { lookupId: 'trucks', lookupField: 'equipmentID' },
  };
  
  const lookupConfig = possibleLookupMappings[cleanColumnName];
  if (lookupConfig) {
    const lookupResult = lookupManager.validateValueAgainstLookup(
      stringValue, 
      { lookupId: lookupConfig.lookupId, lookupField: lookupConfig.lookupField },
      lookupConfig.isMulti || false
    );
    
    if (!lookupResult.isValid && lookupResult.error) {
      return { error: `Row ${rowIndex + 1}, ${cleanColumnName} (Lookup): ${lookupResult.error}` };
    }
  }
  
  return {};
} 