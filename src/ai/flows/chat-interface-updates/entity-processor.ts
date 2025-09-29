import { z } from "genkit";
import { EntitySchema } from "@/schema";
import { entityDetectionPrompt } from "../entity-detection";
import type { LookupManager } from "@/lib/lookupManager";
import {
  extractLookupValidation,
  extractSchemaDetails,
} from "./utils";

export enum MatchStatus {
  ACCEPTED,
  FLAG_FOR_REVIEW,
  REJECTED,
}

export interface EntityProcessingResult {
  status: MatchStatus;
  entityName?: string;
  entitySchema?: z.ZodObject<any>;
  semanticConfidence?: number;
  reasoning?: string;
}

export async function processEntityDetection(
  columns: string[],
  chatHistory: any[],
  modelToUse: any,
  dataSamples?: any[]
): Promise<EntityProcessingResult> {
  // Use AI to intelligently detect the entity based on data structure and schema definitions
  console.log('⚠️ VALIDATION SOURCE: Legacy Zod Schema - EntitySchema processed for entity detection');
  const availableEntities = Object.entries(EntitySchema);
  if (availableEntities.length === 0) {
    throw new Error("No entity schemas available for validation.");
  }

  // Prepare entity schema information for AI analysis
  const entitySchemasInfo = availableEntities.reduce((acc, [name, schema]) => {
    const fields = Object.keys(schema.shape).map((fieldName) => {
      const fieldSchema = schema.shape[fieldName];
      const fieldInfo = {
        name: fieldName,
        type: fieldSchema._def.typeName,
        required: !fieldSchema.isOptional(),
        constraints: {} as any,
      };

      // Add constraints if available
      const checks = (fieldSchema._def as any).checks;
      if (checks) {
        const minCheck = checks.find((c: any) => c.kind === "min");
        const maxCheck = checks.find((c: any) => c.kind === "max");
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
    // 1. LLM-First Analysis
    const { output: llmResult } = await entityDetectionPrompt(
      {
        dataColumns: columns,
        availableEntities: JSON.stringify(entitySchemasInfo, null, 2),
        chatHistory: chatHistory,
      },
      { model: modelToUse }
    );

    if (!llmResult?.detectedEntity || !EntitySchema[llmResult.detectedEntity]) {
      console.log('⚠️ VALIDATION SOURCE: Legacy Zod Schema - EntitySchema validation check for:', llmResult?.detectedEntity);
      return {
        status: MatchStatus.REJECTED,
        reasoning: "LLM did not return a valid or existing entity name.",
      };
    }

    const semanticConfidence = (llmResult.confidence || 0) / 100; // Confidence is 0-100
    const chosenSchemaName = llmResult.detectedEntity;
    console.log('⚠️ VALIDATION SOURCE: Legacy Zod Schema - EntitySchema lookup for chosen entity:', chosenSchemaName);
    const chosenSchema = EntitySchema[chosenSchemaName];

    console.log(
      `🤖 AI-detected entity: ${chosenSchemaName} (Semantic Confidence: ${(
        semanticConfidence * 100
      ).toFixed(1)}%)`
    );
    console.log(`📝 Reasoning: ${llmResult.reasoning}`);
    if (llmResult.coverageStats) {
      console.log(
        `📊 Coverage: ${
          llmResult.coverageStats.matchedColumns
        }/${llmResult.coverageStats.totalDataColumns} columns matched (${llmResult.coverageStats.coveragePercentage.toFixed(
          1
        )}%).`
      );
      if (llmResult.coverageStats.unmatchedColumns?.length > 0) {
        console.log(
          `- Unmatched columns: ${llmResult.coverageStats.unmatchedColumns.join(
            ", "
          )}`
        );
      }
    }

    return {
      status: MatchStatus.ACCEPTED,
      entityName: chosenSchemaName,
      entitySchema: chosenSchema,
      semanticConfidence,
      reasoning: llmResult.reasoning,
    };
  } catch (error) {
    const errorMessage = `AI detection failed: ${(error as Error).message}`;
    console.log(`❌ ${errorMessage}`);
    return { status: MatchStatus.REJECTED, reasoning: errorMessage };
  }
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
    const cleanColumnName = column.replace("*", "");
    const isRequired =
      column.includes("*") ||
      parsedDataContext.columns?.includes(`${cleanColumnName}*`);

    if (entitySchema.shape[cleanColumnName]) {
      const fieldSchema = entitySchema.shape[cleanColumnName];
      const schemaDetails = extractSchemaDetails(
        fieldSchema,
        cleanColumnName,
        isRequired
      );

      let fieldDescription = `- ${cleanColumnName}: Type=${schemaDetails.type}`;
      if (schemaDetails.pattern)
        fieldDescription += `, Pattern=${schemaDetails.pattern}`;
      if (schemaDetails.minLength)
        fieldDescription += `, MinLength=${schemaDetails.minLength}`;
      if (schemaDetails.maxLength)
        fieldDescription += `, MaxLength=${schemaDetails.maxLength}`;
      if (schemaDetails.required)
        fieldDescription += `, Required=${schemaDetails.required}`;
      if (schemaDetails.allowedValues)
        fieldDescription += `, AllowedValues=${JSON.stringify(
          schemaDetails.allowedValues
        )}`;

      // Check if this field has lookup validation using the enhanced extraction function
      const lookupValidation = extractLookupValidation(fieldSchema);
      if (lookupManager && lookupValidation) {
        const { lookupId, lookupField } = lookupValidation;
        const lookupSource = lookupManager.getLookupDataSource(lookupId);
        const lookupData = lookupSource?.getData();

        if (lookupSource && lookupData && lookupData.length > 0) {
          // Get sample values for better AI context
          const totalRecords = lookupData.length;
          const sampleValues = lookupData
            .slice(0, 5)
            .map((item) => item[lookupField])
            .join(", ");
          fieldDescription += `, LookupValidation=Available (${lookupSource.name}, ${totalRecords} records, e.g., ${sampleValues})`;
        } else {
          fieldDescription += `, LookupValidation=Configured but data not loaded (${lookupId})`;
        }
      }

      entityFieldsArray.push(fieldDescription);
    }
  });

  return entityFieldsArray.length > 0
    ? entityFieldsArray.join("\n")
    : "Entity: Schema available for validation";
}
