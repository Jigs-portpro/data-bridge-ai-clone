'use server';

/**
 * @fileOverview A chat interface to discuss data and make updates using EntitySchema.
 *
 * - chatInterfaceUpdates - A function that handles the chat interface and data update process.
 * - ChatInterfaceUpdatesClientInput - The client-facing input type for the chatInterfaceUpdates function.
 * - ChatInterfaceUpdatesOutput - The return type for the chatInterfaceUpdates function.
 */

import { ai } from '@/ai/genkit';
import { EntitySchema } from '@/schema';
import { z } from 'genkit';
import { gpt4o, gpt4oMini, gpt4Turbo, gpt4, gpt35Turbo } from 'genkitx-openai';

// Schema for the data required by the AI prompt
const ChatInterfaceUpdatesPromptInputSchema = z.object({
  dataContext: z
    .string()
    .describe(
      'The data context in JSON format for discussion and updates. Must include "data" and optionally "entityName" and "columns".'
    )
    .refine(
      (value) => {
        try {
          const parsed = JSON.parse(value);
          return parsed.data && Array.isArray(parsed.data);
        } catch {
          return false;
        }
      },
      { message: 'dataContext must be valid JSON with a data array.' }
    ),
  userQuery: z.string().describe('The user query related to the data.'),
  entityFields: z.string().optional().describe('Schema constraints for the entity fields (auto-generated).'),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']).describe('The role of the message sender.'),
    content: z.string().describe('The content of the message.'),
  })).optional().describe('The chat history for context.'),
});

// Schema for the input received by the exported server action from the client
const ChatInterfaceUpdatesClientInputSchema = ChatInterfaceUpdatesPromptInputSchema.extend({
  aiProvider: z.string().describe("The AI provider ID (e.g., 'googleai', 'openai', 'anthropic')."),
  aiModelName: z.string().describe("The specific model name (e.g., 'gemini-1.5-flash', 'gpt4oMini', 'claude-3-haiku-20240307')."),
});
export type ChatInterfaceUpdatesClientInput = z.infer<typeof ChatInterfaceUpdatesClientInputSchema>;

const ChatInterfaceUpdatesOutputSchema = z.object({
  response: z.string().describe('The response to the user query based on the data.'),
  updatedDataContext: z
    .string()
    .describe('The updated data context in JSON format after applying the changes.'),
});
export type ChatInterfaceUpdatesOutput = z.infer<typeof ChatInterfaceUpdatesOutputSchema>;

export async function chatInterfaceUpdates(
  input: ChatInterfaceUpdatesClientInput
): Promise<ChatInterfaceUpdatesOutput> {
  return chatInterfaceUpdatesFlow(input);
}

// Schema for entity detection
const EntityDetectionInputSchema = z.object({
  dataColumns: z.array(z.string()).describe('Array of column names from the data context'),
  availableEntities: z.string().describe('JSON string of available entity schemas with their field definitions'),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']).describe('The role of the message sender.'),
    content: z.string().describe('The content of the message.'),
  })).optional().describe('The chat history for context.'),
});

const EntityDetectionOutputSchema = z.object({
  detectedEntity: z.string().describe('The name of the best matching entity schema'),
  confidence: z.number().min(0).max(100).describe('Confidence percentage (0-100) of the match'),
  reasoning: z.string().describe('Explanation of why this entity was chosen'),
});

const entityDetectionPrompt = ai.definePrompt({
  name: 'entityDetectionPrompt',
  input: { schema: EntityDetectionInputSchema },
  output: { schema: EntityDetectionOutputSchema },
  prompt: `You are an expert at analyzing data structures and matching them to appropriate entity schemas.

## DATA COLUMNS
The data contains these columns:
{{{dataColumns}}}

## AVAILABLE ENTITY SCHEMAS
{{{availableEntities}}}

## CHAT HISTORY
{{{chatHistory}}}

## TASK
Analyze the data columns and determine which entity schema is the best match based on:

1. **Field Name Matching**: How many data columns have corresponding fields in the entity schema
2. **Required Field Coverage**: Whether critical/required fields are present
3. **Semantic Meaning**: The logical purpose and context of the data (e.g., customer data, user profiles, orders, etc.)
4. **Field Types and Constraints**: Whether the data structure aligns with the schema's field definitions

## INSTRUCTIONS
- Compare each data column against all available entity schemas
- Consider field name variations (e.g., "Profile Name" might match "name" or "profileName")
- Pay special attention to required fields (marked with * in data columns)
- Consider the overall business context and data purpose
- Provide a confidence score (0-100) based on how well the data matches
- If no schema is a particularly good match, choose the closest one but indicate lower confidence

## OUTPUT REQUIREMENTS
- **detectedEntity**: The name of the best matching entity schema
- **confidence**: A percentage indicating how confident you are in this match (0-100)
- **reasoning**: Clear explanation of your decision including key matching fields and why this entity makes sense`,
});

const prompt = ai.definePrompt({
  name: 'chatInterfaceUpdatesPrompt',
  input: { schema: ChatInterfaceUpdatesPromptInputSchema },
  output: { schema: ChatInterfaceUpdatesOutputSchema },
  prompt: `You are an intelligent data assistant specializing in data analysis, validation, and updates. You help users interact with their data through natural conversation, providing insights, making corrections, and performing updates while maintaining data integrity.

## CURRENT DATA CONTEXT
{{{dataContext}}}

## USER REQUEST
{{{userQuery}}}

## SCHEMA CONSTRAINTS
{{{entityFields}}}

## YOUR CAPABILITIES
You can:
1. **Analyze Data**: Provide insights, statistics, patterns, and summaries
2. **Answer Questions**: Query and explain data relationships, values, and structures  
3. **Validate Data**: Check data against schema constraints and identify issues
4. **Update Data**: Modify, add, or remove data entries following schema rules
5. **Clean Data**: Fix formatting, handle missing values, standardize entries
6. **Transform Data**: Restructure, filter, sort, or aggregate data as requested

## INSTRUCTIONS

### 1. UNDERSTAND THE REQUEST
First, determine the user's intent:
- **Information/Analysis**: User wants to understand or analyze the data
- **Validation**: User wants to check data quality or compliance
- **Updates**: User wants to modify, add, or delete data
- **Cleaning**: User wants to fix data quality issues
- **Transformation**: User wants to restructure or process the data

### 2. PROVIDE CONTEXTUAL RESPONSES
- For **questions**: Analyze the data and provide clear, accurate answers
- For **insights**: Offer relevant patterns, trends, or notable observations
- For **validation**: Report compliance status and highlight any issues
- For **updates**: Explain what changes will be made before making them

### 3. DATA UPDATE GUIDELINES
When making updates:
- **Validate** all changes against schema constraints before applying
- **Preserve** existing valid data unless explicitly asked to change it
- **Apply defaults** for required fields that are empty or invalid
- **Maintain consistency** across related data points
- **Document** all changes made in your response

### 4. SCHEMA COMPLIANCE
- Enforce **type constraints** (string, number, date, etc.)
- Respect **length limits** (min/max character limits)
- Follow **pattern requirements** (regex patterns, formats)
- Handle **required fields** (provide appropriate defaults)
- Validate **allowed values** (enums, restricted lists)

### 5. ERROR HANDLING
- If data is malformed, attempt to fix it intelligently
- If schema constraints conflict, prioritize data integrity
- If updates cannot be safely made, explain why and suggest alternatives
- Always maintain the original data structure format

### 6. RESPONSE FORMAT
Structure your response to be:
- **Clear and conversational** - explain what you found or did
- **Actionable** - provide specific next steps if relevant  
- **Educational** - help users understand their data better
- **Transparent** - explain any changes or assumptions made

## OUTPUT REQUIREMENTS
- **response**: Provide a helpful, conversational response addressing the user's request
- **updatedDataContext**: Return the data in valid JSON format, with updates applied if any were made

Remember: Only make changes when explicitly requested or when fixing clear data quality issues. When in doubt, inform rather than modify.`,
});

const chatInterfaceUpdatesFlow = ai.defineFlow(
  {
    name: 'chatInterfaceUpdatesFlow',
    inputSchema: ChatInterfaceUpdatesClientInputSchema,
    outputSchema: ChatInterfaceUpdatesOutputSchema,
  },
  async (clientInput) => {
    const { aiProvider, aiModelName, dataContext, userQuery, chatHistory } = clientInput;

    // Resolve model
    let modelToUse: any;
    if (aiProvider === 'openai') {
      switch (aiModelName) {
        case 'gpt4o': modelToUse = gpt4o; break;
        case 'gpt4oMini': modelToUse = gpt4oMini; break;
        case 'gpt4Turbo': modelToUse = gpt4Turbo; break;
        case 'gpt4': modelToUse = gpt4; break;
        case 'gpt35Turbo': modelToUse = gpt35Turbo; break;
        default: console.log(`Unknown OpenAI model ID: ${aiModelName}`);
      }
    } else if (aiProvider === 'anthropic') {
      modelToUse = aiModelName;
    } else if (aiProvider === 'googleai') {
      modelToUse = `googleai/${aiModelName}`;
    } else {
      console.log(`Unsupported AI provider: ${aiProvider}`);
    }

    // Parse dataContext
    let parsedDataContext: any;
    try {
      parsedDataContext = JSON.parse(dataContext);
    } catch (error) {
      console.log('Invalid JSON in dataContext: ' + (error as Error).message);
    }

    if (!parsedDataContext.data || !Array.isArray(parsedDataContext.data)) {
      console.log('dataContext.data is not a valid array.');
    }

    // Get columns from dataContext or data
    const columns = parsedDataContext.columns || Object.keys(parsedDataContext.data[0] || {});
    if (!columns.length) {
      console.log('dataContext.data is empty or has no valid columns.');
    }

    // Determine entityName and schema
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
        
        entityFieldsArray.push(fieldDescription);
      }
    });

    const entityFields = entityFieldsArray.length > 0 
      ? entityFieldsArray.join('\n') 
      : `Entity: ${entityName} - Schema available for validation`;

    // Prepare prompt data
    const promptData = {
      dataContext: JSON.stringify(parsedDataContext),
      userQuery,
      entityFields,
      chatHistory: chatHistory
    };

    // Execute prompt
    const { output } = await prompt(promptData, { model: modelToUse });
    if (!output) {
      console.log('AI did not return an output for chat interface updates.');
      return { response: 'Error: Unable to process your request. Please try again.', updatedDataContext: dataContext };
    }

    // Validate updatedDataContext
    let updatedDataContext;
    try {
      updatedDataContext = JSON.parse(output.updatedDataContext);
    } catch (error) {
      console.log('Invalid JSON in updatedDataContext: ' + (error as Error).message);
    }

    if (!updatedDataContext.data || !Array.isArray(updatedDataContext.data)) {
      console.log('updatedDataContext.data is not a valid array.');
    }

    // Validate and correct all field values
    const validationErrors: string[] = [];
    const updatedData = updatedDataContext.data.map((row: any, index: number) => {
      const correctedRow = { ...row };
      
      // Validate each field that exists in both the row and the schema
      Object.keys(row).forEach((column) => {
        const cleanColumnName = column.replace('*', '');
        if (entitySchema.shape[cleanColumnName]) {
          const fieldSchema = entitySchema.shape[cleanColumnName];
          const value = row[column];
          const validation = fieldSchema.safeParse(value);
          
          if (!validation.success) {
            console.warn(`Invalid ${cleanColumnName} value at row ${index}: ${value}`, validation.error.errors);
            validationErrors.push(`Row ${index + 1}, ${cleanColumnName}: ${validation.error.errors.map((e: any) => e.message).join(', ')}`);
            
            // Apply intelligent fallback corrections based on field type and constraints
            const fieldType = fieldSchema._def.typeName;
            const minLength = (fieldSchema._def as any).checks?.find((c: any) => c.kind === 'min')?.value || null;
            const maxLength = (fieldSchema._def as any).checks?.find((c: any) => c.kind === 'max')?.value || null;
            const isRequired = column.includes('*') || !fieldSchema.isOptional();
            
            if (fieldType === 'ZodString') {
              if (isRequired && (!value || (minLength && value.length < minLength))) {
                // Provide a default value based on field name
                const defaultValue = cleanColumnName.toLowerCase().includes('branch') ? 'DefaultBranch' :
                                   cleanColumnName.toLowerCase().includes('email') ? 'default@example.com' :
                                   cleanColumnName.toLowerCase().includes('name') ? 'DefaultName' :
                                   cleanColumnName.toLowerCase().includes('address') ? 'Default Address' :
                                   cleanColumnName.toLowerCase().includes('city') ? 'DefaultCity' :
                                   cleanColumnName.toLowerCase().includes('state') ? 'DefaultState' :
                                   cleanColumnName.toLowerCase().includes('country') ? 'US' :
                                   cleanColumnName.toLowerCase().includes('zip') ? '00000' :
                                   `Default${cleanColumnName}`;
                correctedRow[column] = defaultValue;
              } else if (value && maxLength && value.length > maxLength) {
                correctedRow[column] = value.slice(0, maxLength);
              } else if (!value && !isRequired) {
                // Keep empty value for optional fields
                correctedRow[column] = '';
              }
            }
          }
        }
      });
      
      return correctedRow;
    });

    // Update the dataContext with validated data
    updatedDataContext.data = updatedData;
    updatedDataContext.entityName = entityName;
    const finalDataContext = JSON.stringify(updatedDataContext);

    // Update response if fallbacks were applied
    let response = output.response;
    if (validationErrors.length > 0) {
      response += `\n\nValidation Summary:\n- ${validationErrors.length} validation issue(s) found and corrected\n- Entity: ${entityName}\n- Some values were adjusted to comply with schema constraints`;
    }

    return { response, updatedDataContext: finalDataContext };
  }
);