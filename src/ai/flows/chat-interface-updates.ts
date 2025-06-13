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
import { z, type GenkitModel } from 'genkit';
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

const prompt = ai.definePrompt({
  name: 'chatInterfaceUpdatesPrompt',
  input: { schema: ChatInterfaceUpdatesPromptInputSchema },
  output: { schema: ChatInterfaceUpdatesOutputSchema },
  prompt: `You are an AI assistant helping users discuss and update their data through a chat interface.

The current data context is:
{{{dataContext}}}

The user query is:
{{{userQuery}}}

The relevant entity fields and their schema constraints are:
{{{entityFields}}}

Based on the data context, user query, and schema constraints, provide a response to the user and update the data context if necessary.
- Validate and correct the specified column values (e.g., 'Branch') against the provided schema constraints.
- If a field is required and empty/invalid, suggest a default valid value (e.g., 'DefaultBranch' for Branch).
- For invalid entries, reformat or replace with valid values based on the schema.
- Preserve valid entries unchanged.
- Return the response and the updated data context in valid JSON format.
- If no updates are needed, return the original data context.
`,
});

const chatInterfaceUpdatesFlow = ai.defineFlow(
  {
    name: 'chatInterfaceUpdatesFlow',
    inputSchema: ChatInterfaceUpdatesClientInputSchema,
    outputSchema: ChatInterfaceUpdatesOutputSchema,
  },
  async (clientInput) => {
    const { aiProvider, aiModelName, dataContext, userQuery } = clientInput;

    // Resolve model
    let modelToUse: GenkitModel | string;
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
    let parsedDataContext;
    try {
      parsedDataContext = JSON.parse(dataContext);
    } catch (error) {
      console.log('Invalid JSON in dataContext: ' + (error as Error).message);
    }

    if (!parsedDataContext.data || !Array.isArray(parsedDataContext.data)) {
      console.log('dataContext.data is not a valid array.');
    }

    // Extract target column from userQuery (e.g., 'Branch')
    const targetColumnMatch = userQuery.match(/(?:validate|fix)\s+(\w+(?:\s+\w+)*)\s+values/i);
    const targetColumn = targetColumnMatch ? targetColumnMatch[1].trim() : 'Branch'; // Default to 'Branch' for this example
    if (!targetColumn) {
      console.log('Could not determine target column from user query.');
    }

    // Get columns from dataContext or data
    const columns = parsedDataContext.columns || Object.keys(parsedDataContext.data[0] || {});
    if (!columns.length) {
      console.log('dataContext.data is empty or has no valid columns.');
    }

    // Find entities with the target column
    const entitiesWithColumn = Object.entries(EntitySchema)
      .filter(([_, schema]) => schema.shape[targetColumn])
      .map(([name, schema]) => ({ name, schema: schema.shape[targetColumn] }));
    if (!entitiesWithColumn.length) {
      throw new Error(`Column "${targetColumn}" not found in any entity schema.`);
    }

    // Determine entityName and schema
    let entityName = parsedDataContext.entityName;
    let selectedSchema = entitiesWithColumn[0].schema; // Default to first schema
    let entitySchema;

    if (entityName && EntitySchema[entityName]) {
      if (EntitySchema[entityName].shape[targetColumn]) {
        entitySchema = EntitySchema[entityName];
        selectedSchema = entitySchema.shape[targetColumn];
      } else {
        throw new Error(`Column "${targetColumn}" not found in entity "${entityName}".`);
      }
    } else {
      // If no entityName, infer or use the most restrictive schema
      if (entitiesWithColumn.length === 1) {
        entityName = entitiesWithColumn[0].name;
        entitySchema = EntitySchema[entityName];
      } else {
        // Choose the most restrictive schema (e.g., Users or Customers with min(2))
        const restrictiveSchema = entitiesWithColumn.find(
          (e) => e.schema._def.checks?.some((check: any) => check.kind === 'min')
        );
        entityName = restrictiveSchema ? restrictiveSchema.name : entitiesWithColumn[0].name;
        entitySchema = EntitySchema[entityName];
        selectedSchema = entitySchema.shape[targetColumn];
      }
      parsedDataContext.entityName = entityName; // Add inferred entityName
    }

    // Generate entityFields for the target column
    const schemaDetails = {
      name: targetColumn,
      type: selectedSchema._def.typeName,
      minLength: (selectedSchema._def as any).checks?.find((c: any) => c.kind === 'min')?.value || null,
      maxLength: (selectedSchema._def as any).checks?.find((c: any) => c.kind === 'max')?.value || null,
      pattern: (selectedSchema._def as any).regex?.source || null,
      required: !selectedSchema.isOptional() || (parsedDataContext.columns?.includes(`${targetColumn}*`) ?? false),
      allowedValues: (selectedSchema._def as any).values || null,
    };

    const entityFields = `- ${targetColumn}: Type=${schemaDetails.type}${schemaDetails.pattern ? `, Pattern=${schemaDetails.pattern}` : ''}${schemaDetails.minLength ? `, MinLength=${schemaDetails.minLength}` : ''}${schemaDetails.maxLength ? `, MaxLength=${schemaDetails.maxLength}` : ''}${schemaDetails.required ? `, Required=${schemaDetails.required}` : ''}${schemaDetails.allowedValues ? `, AllowedValues=${JSON.stringify(schemaDetails.allowedValues)}` : ''}`;

    // Prepare prompt data
    const promptData = {
      dataContext: JSON.stringify(parsedDataContext),
      userQuery,
      entityFields,
    };

    // Execute prompt
    const { output } = await prompt(promptData, { model: modelToUse });
    if (!output) {
      console.log('AI did not return an output for chat interface updates.');
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

    // Validate and correct Branch values
    const updatedData = updatedDataContext.data.map((row: any, index: number) => {
      const correctedRow = { ...row };
      if (targetColumn in row) {
        const value = row[targetColumn];
        const validation = selectedSchema.safeParse(value);
        if (!validation.success) {
          console.warn(`Invalid ${targetColumn} value at row ${index}: ${value}`);
          // Apply fallback correction for Branch
          if (schemaDetails.required && (!value || value.length < schemaDetails.minLength)) {
            correctedRow[targetColumn] = 'DefaultBranch';
          } else if (value && schemaDetails.maxLength && value.length > schemaDetails.maxLength) {
            correctedRow[targetColumn] = value.slice(0, schemaDetails.maxLength);
          } else {
            correctedRow[targetColumn] = value || 'DefaultBranch'; // Default if empty
          }
        }
      }
      return correctedRow;
    });

    // Update the dataContext with validated data
    updatedDataContext.data = updatedData;
    updatedDataContext.entityName = entityName;
    const finalDataContext = JSON.stringify(updatedDataContext);

    // Update response if fallbacks were applied
    let response = output.response;
    if (updatedData.some((row: any, i: number) => row[targetColumn] !== JSON.parse(output.updatedDataContext).data[i][targetColumn])) {
      response += ` Note: Some ${targetColumn} values were adjusted to comply with schema constraints (Entity: ${entityName}).`;
    }

    return { response, updatedDataContext: finalDataContext };
  }
);