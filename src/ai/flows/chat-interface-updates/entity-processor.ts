import { EntitySchema } from '@/schema';
import { entityDetectionPrompt } from '../entity-detection';
import type { LookupManager } from '@/lib/lookupManager';

export interface EntityProcessingResult {
  entityName: string;
  entitySchema: any;
  entityFields: string;
  parsedDataContext: any;
}

export async function processEntityDetection(
  parsedDataContext: any,
  columns: string[],
  chatHistory: any[],
  modelToUse: any
): Promise<EntityProcessingResult> {
  let entityName = parsedDataContext.entityName;
  let entitySchema;

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
      } else {
        // Fallback to first entity if AI detection fails
        entityName = availableEntities[0][0];
        entitySchema = availableEntities[0][1];
        parsedDataContext.entityName = entityName;
        console.log(`⚠️ AI detection failed, defaulting to: ${entityName}`);
      }
    } catch (error) {
      // Fallback to first entity if AI detection encounters an error
      entityName = availableEntities[0][0];
      entitySchema = availableEntities[0][1];
      parsedDataContext.entityName = entityName;
      console.log(`❌ AI detection error: ${(error as Error).message}, defaulting to: ${entityName}`);
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
  entitySchema: any,
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
      const schemaDetails = {
        name: cleanColumnName,
        type: fieldSchema._def.typeName,
        minLength: (fieldSchema._def as any).checks?.find((c: any) => c.kind === 'min')?.value || null,
        maxLength: (fieldSchema._def as any).checks?.find((c: any) => c.kind === 'max')?.value || null,
        pattern: (fieldSchema._def as any).regex?.source || null,
        required: isRequired || !fieldSchema.isOptional(),
        allowedValues: (fieldSchema._def as any).values || null,
      };

      let fieldDescription = `- ${cleanColumnName}: Type=${schemaDetails.type}`;
      if (schemaDetails.pattern) fieldDescription += `, Pattern=${schemaDetails.pattern}`;
      if (schemaDetails.minLength) fieldDescription += `, MinLength=${schemaDetails.minLength}`;
      if (schemaDetails.maxLength) fieldDescription += `, MaxLength=${schemaDetails.maxLength}`;
      if (schemaDetails.required) fieldDescription += `, Required=${schemaDetails.required}`;
      if (schemaDetails.allowedValues) fieldDescription += `, AllowedValues=${JSON.stringify(schemaDetails.allowedValues)}`;
      
      // Check if this field has lookup validation
      if (lookupManager && fieldSchema.lookupValidation) {
        fieldDescription += `, LookupValidation=Available`;
      }
      
      entityFieldsArray.push(fieldDescription);
    }
  });

  return entityFieldsArray.length > 0 
    ? entityFieldsArray.join('\n') 
    : `Entity: Schema available for validation`;
} 