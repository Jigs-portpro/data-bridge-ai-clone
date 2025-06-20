import { z } from 'genkit';
import { EntitySchema } from '@/schema';
import { entityDetectionPrompt } from '../entity-detection';
import type { LookupManager } from '@/lib/lookupManager';

interface SchemaDetails {
  name: string;
  type: string;
  minLength: number | null;
  maxLength: number | null;
  pattern: string | null;
  required: boolean;
  allowedValues: any[] | null;
}

function extractSchemaDetails(fieldSchema: any, fieldName: string, isRequired: boolean): SchemaDetails {
  const details: SchemaDetails = {
    name: fieldName,
    type: 'unknown',
    minLength: null,
    maxLength: null,
    pattern: null,
    required: isRequired || !fieldSchema.isOptional(),
    allowedValues: null,
  };

  // Handle different Zod types
  if (fieldSchema._def) {
    const def = fieldSchema._def;
    details.type = def.typeName || 'unknown';

    // Handle ZodString
    if (def.typeName === 'ZodString' && def.checks) {
      for (const check of def.checks) {
        switch (check.kind) {
          case 'min':
            details.minLength = check.value;
            break;
          case 'max':
            details.maxLength = check.value;
            break;
          case 'regex':
            details.pattern = check.regex.source;
            break;
        }
      }
    }

    // Handle ZodEnum
    if (def.typeName === 'ZodEnum' && def.values) {
      details.allowedValues = def.values;
    }

    // Handle ZodOptional
    if (def.typeName === 'ZodOptional') {
      details.required = false;
      if (def.innerType) {
        const innerDetails = extractSchemaDetails(def.innerType, fieldName, false);
        details.type = innerDetails.type;
        details.minLength = innerDetails.minLength;
        details.maxLength = innerDetails.maxLength;
        details.pattern = innerDetails.pattern;
        details.allowedValues = innerDetails.allowedValues;
      }
    }

    // Handle ZodArray
    if (def.typeName === 'ZodArray') {
      details.type = 'array';
      if (def.type) {
        const elementDetails = extractSchemaDetails(def.type, fieldName, false);
        details.type = `array<${elementDetails.type}>`;
      }
    }

    // Handle ZodNumber
    if (def.typeName === 'ZodNumber' && def.checks) {
      for (const check of def.checks) {
        switch (check.kind) {
          case 'min':
            details.minLength = check.value;
            break;
          case 'max':
            details.maxLength = check.value;
            break;
        }
      }
    }

    // Handle ZodBoolean
    if (def.typeName === 'ZodBoolean') {
      details.type = 'boolean';
    }
  }

  return details;
}

/**
 * Helper function to extract lookup validation metadata from nested Zod schema structures
 * Same logic as in data-validator.ts
 */
function extractLookupValidation(fieldSchema: any): any {
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

export interface EntityProcessingResult {
  entityName: string;
  entitySchema: z.ZodObject<any>;
  entityFields: string;
  parsedDataContext: any;
}

export async function processEntityDetection(
  parsedDataContext: any,
  columns: string[],
  chatHistory: any[],
  modelToUse: any,
): Promise<EntityProcessingResult> {
  let entityName = parsedDataContext.entityName;
  let entitySchema: z.ZodObject<any>;

  if (entityName && EntitySchema[entityName]) {
    entitySchema = EntitySchema[entityName];
  } else {
    // Use AI to intelligently detect the entity based on data structure and schema definitions
    const availableEntities = Object.entries(EntitySchema);
    if (availableEntities.length === 0) {
      throw new Error('No entity schemas available for validation.');
    }

    // Prepare entity schema information for AI analysis
    const entitySchemasInfo = availableEntities.reduce((acc, [name, schema]) => {
      const fields = Object.keys(schema.shape).map(fieldName => {
        const fieldSchema = schema.shape[fieldName];
        const fieldInfo = {
          name: fieldName,
          type: fieldSchema._def.typeName,
          required: !fieldSchema.isOptional(),
          constraints: {} as any
        };
        
        // Add constraints if available
        const checks = (fieldSchema._def as any).checks;
        if (checks) {
          const minCheck = checks.find((c: any) => c.kind === 'min');
          const maxCheck = checks.find((c: any) => c.kind === 'max');
          if (minCheck) fieldInfo.constraints.minLength = minCheck.value;
          if (maxCheck) fieldInfo.constraints.maxLength = maxCheck.value;
        }
        
        const regex = (fieldSchema._def as any).regex;
        if (regex) fieldInfo.constraints.pattern = regex.source;
        
        const values = (fieldSchema._def as any).values;
        if (values) fieldInfo.constraints.allowedValues = values;
        
        return fieldInfo;
      });
      
      acc[name] = { fields, description: `Entity schema for ${name}` };
      return acc;
    }, {} as any);

    try {
      // Use AI to detect the best matching entity
      const { output: detectionResult } = await entityDetectionPrompt({
        dataColumns: columns,
        availableEntities: JSON.stringify(entitySchemasInfo, null, 2),
        chatHistory: chatHistory
      }, { model: modelToUse });

      if (detectionResult && detectionResult.detectedEntity && EntitySchema[detectionResult.detectedEntity]) {
        entityName = detectionResult.detectedEntity;
        entitySchema = EntitySchema[entityName];
        parsedDataContext.entityName = entityName; // Add detected entityName
        console.log(`🤖 AI-detected entity: ${entityName} (Confidence: ${detectionResult.confidence}%)`);
        console.log(`📝 Reasoning: ${detectionResult.reasoning}`);
        
        // Log detailed coverage statistics
        if (detectionResult.coverageStats) {
          const stats = detectionResult.coverageStats;
          console.log(`📊 Coverage Analysis: ${stats.matchedColumns}/${stats.totalDataColumns} columns matched (${stats.coveragePercentage.toFixed(1)}%)`);
          if (stats.unmatchedColumns.length > 0) {
            console.log(`⚠️ Unmatched columns: ${stats.unmatchedColumns.join(', ')}`);
          }
        }
      } else {
        console.log(`⚠️ AI detection failed`);
        throw new Error(`AI detection failed`);
      }
    } catch (error) {
      console.log(`❌ AI detection error: ${(error as Error).message}`);
      throw new Error(`AI detection error: ${(error as Error).message}`);
    }
  }

  // Generate entityFields for all columns that exist in both data and schema
  const entityFields = generateEntityFields(columns, entitySchema, parsedDataContext, null);

  return {
    entityName,
    entitySchema,
    entityFields,
    parsedDataContext
  };
}

export function generateEntityFields(
  columns: string[],
  entitySchema: z.ZodObject<any>,
  parsedDataContext: any,
  lookupManager: LookupManager | null
): string {
  const entityFieldsArray: string[] = [];
  
  columns.forEach((column: string) => {
    // Remove asterisk from column name for schema lookup
    const cleanColumnName = column.replace('*', '');
    const isRequired = column.includes('*') || parsedDataContext.columns?.includes(`${cleanColumnName}*`);
    
    if (entitySchema.shape[cleanColumnName]) {
      const fieldSchema = entitySchema.shape[cleanColumnName];
      const schemaDetails = extractSchemaDetails(fieldSchema, cleanColumnName, isRequired);

      let fieldDescription = `- ${cleanColumnName}: Type=${schemaDetails.type}`;
      if (schemaDetails.pattern) fieldDescription += `, Pattern=${schemaDetails.pattern}`;
      if (schemaDetails.minLength) fieldDescription += `, MinLength=${schemaDetails.minLength}`;
      if (schemaDetails.maxLength) fieldDescription += `, MaxLength=${schemaDetails.maxLength}`;
      if (schemaDetails.required) fieldDescription += `, Required=${schemaDetails.required}`;
      if (schemaDetails.allowedValues) fieldDescription += `, AllowedValues=${JSON.stringify(schemaDetails.allowedValues)}`;
      
      // Check if this field has lookup validation using the enhanced extraction function
      const lookupValidation = extractLookupValidation(fieldSchema);
      if (lookupManager && lookupValidation) {
        const { lookupId, lookupField } = lookupValidation;
        const lookupSource = lookupManager.getLookupDataSource(lookupId);
        const lookupData = lookupSource?.getData();
        
        if (lookupSource && lookupData && lookupData.length > 0) {
          // Get sample values for better AI context
          const sampleValues = lookupData.slice(0, 5).map(item => item[lookupField]).join(', ');
          fieldDescription += `, LookupValidation=Available (${lookupSource.name}, ${lookupData.length} records, sample: ${sampleValues})`;
        } else {
          fieldDescription += `, LookupValidation=Configured but data not loaded (${lookupId})`;
        }
      }
      
      entityFieldsArray.push(fieldDescription);
    }
  });

  return entityFieldsArray.length > 0 
    ? entityFieldsArray.join('\n') 
    : `Entity: Schema available for validation`;
} 