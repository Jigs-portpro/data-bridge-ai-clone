import type { LookupManager } from '@/lib/lookupManager';
import { z } from 'genkit';

export interface ValidationResult {
  updatedData: any[];
  validationErrors: string[];
  userFriendlyResponse?: string;
}

export function validateData(
  data: any[],
  entitySchema: z.ZodObject<any>,
  lookupManager: LookupManager | null,
  targetColumns: string[] = []
): ValidationResult {
  const validationErrors: string[] = [];
  
  console.log('🔍 Starting validation for data:', data?.length, 'rows');
  console.log('🔍 Schema fields:', Object.keys(entitySchema.shape));
  
  const cleanTargetColumns = targetColumns.map((column) => column.replace('*', ''));
  const updatedData = data.map((row: any, index: number) => {
    const correctedRow = { ...row };
    
    // Validate each field that exists in both the row and the schema
    Object.keys(row).forEach((column) => {
      const cleanColumnName = column.replace('*', '');
      if (targetColumns.length > 0 && !cleanTargetColumns.includes(cleanColumnName)) {
        return;
      }
      if (entitySchema.shape[cleanColumnName]) {
        const fieldSchema = entitySchema.shape[cleanColumnName];
        const value = row[column];
        const stringValue = value === null || value === undefined ? "" : String(value).trim();
        
        // console.log(`🔍 Validating field "${cleanColumnName}" with value "${stringValue}"`);
        
        // Schema validation for target columns only
        const validation = fieldSchema.safeParse(value);
        
        if (!validation.success) {
          // console.warn(`❌ Schema validation failed for ${cleanColumnName} at row ${index}: ${value}`, validation.error.errors);
          const errorMessage = validation.error.errors.map((e: any) => e.message).join(', ');
          validationErrors.push(`Row ${index + 1}, ${cleanColumnName}: ${errorMessage}`);
        }
        
        // Additional lookup validation if lookup manager is available and field has lookup metadata
        if (lookupManager && fieldSchema) {
          const lookupValidationResult = performLookupValidationFromSchema(
            stringValue,
            cleanColumnName,
            fieldSchema,
            lookupManager,
            index
          );
          
          if (lookupValidationResult.error) {
            // console.warn(`❌ Lookup validation failed for ${cleanColumnName}:`, lookupValidationResult.error);
            validationErrors.push(lookupValidationResult.error);
          }
          // else if (lookupValidationResult.success) {
          //   console.log(`✅ Lookup validation passed for ${cleanColumnName}`);
          // }
        }
      }
    });
    
    return correctedRow;
  });

  console.log('🔍 Validation complete. Total errors:', validationErrors.length);
  // console.log('🔍 Validation errors:', validationErrors);

  return { 
    updatedData, 
    validationErrors, 
  };
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

/**
 * Extract lookup validation metadata from nested Zod schema structures
 * Handles ZodOptional, ZodIntersection (.and()), and other wrappers
 */
function extractLookupValidation(fieldSchema: any): any {
  // console.log(`🔍 Extracting lookup validation from schema type: ${fieldSchema?._def?.typeName}`);
  
  // Direct lookup validation
  if (fieldSchema?.lookupValidation) {
    return fieldSchema.lookupValidation;
  }
  
  // ZodOptional wrapper (when .optional() is called)
  if (fieldSchema?._def?.typeName === 'ZodOptional') {
    return extractLookupValidation(fieldSchema._def.innerType);
  }
  
  // ZodIntersection wrapper (when .and() is called)
  if (fieldSchema?._def?.typeName === 'ZodIntersection') {
    // Check both left and right sides of intersection
    const leftLookup = extractLookupValidation(fieldSchema._def.left);
    if (leftLookup) return leftLookup;
    
    const rightLookup = extractLookupValidation(fieldSchema._def.right);
    if (rightLookup) return rightLookup;
  }
  
  // ZodUnion wrapper (when z.union() is used)
  if (fieldSchema?._def?.typeName === 'ZodUnion') {
    for (const option of fieldSchema._def.options) {
      const lookup = extractLookupValidation(option);
      if (lookup) return lookup;
    }
  }
  
  // ZodTransform wrapper (when .transform() is called)
  if (fieldSchema?._def?.typeName === 'ZodTransform') {
    return extractLookupValidation(fieldSchema._def.schema);
  }
  
  return null;
}

function performLookupValidationFromSchema(
  stringValue: string,
  cleanColumnName: string,
  fieldSchema: any,
  lookupManager: LookupManager,
  rowIndex: number
): { error?: string; success?: boolean } {
  // Skip validation for empty values
  if (!stringValue || stringValue.trim() === '') {
    console.log(`⏭️ Skipping lookup validation for empty value in field "${cleanColumnName}"`);
    return { success: true };
  }
  
  // Extract lookup validation metadata from potentially nested Zod schema
  const lookupValidation = extractLookupValidation(fieldSchema);
  
  if (lookupValidation && lookupValidation.lookupId && lookupValidation.lookupField) {
    // console.log(`🔍 Performing lookup validation for "${cleanColumnName}" with value "${stringValue}"`);
    // console.log(`🔍 Lookup config:`, lookupValidation);
    
    const lookupResult = lookupManager.validateValueAgainstLookup(
      stringValue, 
      { 
        lookupId: lookupValidation.lookupId, 
        lookupField: lookupValidation.lookupField 
      },
      lookupValidation.isMulti || false
    );
    
    // console.log(`🔍 Lookup validation result for "${cleanColumnName}":`, lookupResult);
    
    if (!lookupResult.isValid && lookupResult.error) {
      return { error: `Row ${rowIndex + 1}, ${cleanColumnName} (Lookup): ${lookupResult.error}` };
    } else if (lookupResult.isValid) {
      return { success: true };
    }
  }
  // else {
  //   console.log(`⏭️ No lookup validation configured for field "${cleanColumnName}"`);
  // }
  
  return { success: true };
}