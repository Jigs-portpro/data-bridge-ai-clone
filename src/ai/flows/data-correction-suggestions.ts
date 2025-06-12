'use server';

/**
 * @fileOverview An AI agent for suggesting data corrections.
 *
 * - suggestDataCorrections - A function that handles the data correction suggestion process.
 * - SuggestDataCorrectionsClientInput - The client-facing input type for the suggestDataCorrections function.
 * - SuggestDataCorrectionsOutput - The return type for the suggestDataCorrections function.
 */

import { ai } from '@/ai/genkit';
import { EntitySchema } from '@/schema';
import { z, type GenkitModel } from 'genkit';
import { gpt4o, gpt4oMini, gpt4Turbo, gpt4, gpt35Turbo } from 'genkitx-openai';

// Schema for the data required by the AI prompt
const SuggestDataCorrectionsPromptInputSchema = z.object({
  entityName: z.string().describe('The name of the entity (e.g., Users, Carrier, etc.).'),
  columnName: z.string().describe('The name of the column to correct.'),
  data: z.array(z.string()).describe('The data in the column.'),
  aiProvider: z.enum(['openai', 'anthropic', 'googleai']).describe('The AI provider to use.'),
  aiModelName: z.string().describe('The AI model name (e.g., gpt4o, claude-3-5-sonnet, gemini-1.5-pro).'),
});

// Schema for the input received by the exported server action from the client
const SuggestDataCorrectionsClientInputSchema = SuggestDataCorrectionsPromptInputSchema.extend({
  aiProvider: z.string().describe("The AI provider ID (e.g., 'googleai', 'openai', 'anthropic')."),
  aiModelName: z.string().describe("The specific model name (e.g., 'gemini-1.5-flash', 'gpt4oMini', 'claude-3-haiku-20240307').")
});
export type SuggestDataCorrectionsClientInput = z.infer<typeof SuggestDataCorrectionsClientInputSchema>;

const SuggestDataCorrectionsOutputSchema = z.object({
  correctedData: z.array(z.string()).describe('The corrected data. This array MUST be in the same order and have the same number of elements as the input data array.'),
  explanation: z.string().describe('Explanation of the corrections made.'),
});
export type SuggestDataCorrectionsOutput = z.infer<typeof SuggestDataCorrectionsOutputSchema>;

export async function suggestDataCorrections(
  input: SuggestDataCorrectionsClientInput
): Promise<SuggestDataCorrectionsOutput> {
  console.log('input', input);
  return suggestDataCorrectionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestDataCorrectionsPrompt',
  input: { schema: SuggestDataCorrectionsPromptInputSchema },
  output: { schema: SuggestDataCorrectionsOutputSchema },
  prompt: `You are an AI data quality specialist. Given an entity name, a column name, and a list of its data entries, you will suggest corrections to improve data quality while adhering to the schema constraints for the specified entity and column.

Entity Name: {{{entityName}}}
Column Name: {{{columnName}}}
Schema Constraints:
- Type: {{schemaType}}
{{#if schemaMinLength}}- Minimum Length: {{{schemaMinLength}}}{{/if}}
{{#if schemaMaxLength}}- Maximum Length: {{{schemaMaxLength}}}{{/if}}
{{#if schemaPattern}}- Pattern: {{{schemaPattern}}}{{/if}}
{{#if schemaRequired}}- Required: {{{schemaRequired}}}{{/if}}

Input Data Entries (one per line, maintain this order in your output):
{{#each data}}
- {{{this}}}
{{/each}}

Consider these common data quality issues:
- Casing: Correct inconsistent casing (e.g., "john", "John", "JOHN" should be standardized).
- Formatting: Correct inconsistent formatting to match the schema pattern (if provided).
- Length: Ensure data meets minimum and maximum length requirements.
- Schema Compliance: Ensure data matches the schema type and pattern (if specified).

**Validation and Correction Instructions**:
- If an entry fails validation (e.g., invalid role in SystemRoles, wrong pattern, or length violation), suggest a valid value based on the schema:
  - For fields with allowed values (e.g., SystemRoles with values ["Admin", "CSR", "Sales Agent", "Mechanics"]), select a valid value (e.g., "Admin" for invalid roles) or combine valid roles (e.g., "Admin,CSR").
  - For pattern-based fields (e.g., Phone, Password, Email), reformat to match the pattern (e.g., "(123) 456-7890").
  - For length violations, truncate or pad as needed to meet min/max requirements.
- Preserve valid entries unchanged.
- For empty or null or invalid entries in required fields, suggest a default valid value (e.g., "Admin" for SystemRoles) and if any has specific regex pattern, then follow the pattern and suggest values.

Your task is to return the full list of data entries with corrections applied.
**Crucially, the 'correctedData' array in your JSON output MUST:**
1. Be in the exact same order as the input data entries.
2. Contain the exact same number of entries as the input data.
3. If an input entry does not require correction (i.e., it complies with the schema), return the original entry in its corresponding position in the 'correctedData' array.

Output a JSON object with two fields:
1. \`correctedData\`: An array of strings representing the full list of corrected data entries, adhering to the rules above.
2. \`explanation\`: A string explaining the general types of corrections made, or specific examples if notable.`,
});

const suggestDataCorrectionsFlow = ai.defineFlow(
  {
    name: 'suggestDataCorrectionsFlow',
    inputSchema: SuggestDataCorrectionsClientInputSchema,
    outputSchema: SuggestDataCorrectionsOutputSchema,
  },
  async (clientInput) => {
    const { aiProvider, aiModelName, entityName, columnName, data } = clientInput;
    console.log('clientInput', clientInput);
    // Resolve model
    let modelToUse: GenkitModel | string;
    if (aiProvider === 'openai') {
      switch (aiModelName) {
        case 'gpt4o': modelToUse = gpt4o; break;
        case 'gpt4oMini': modelToUse = gpt4oMini; break;
        case 'gpt4Turbo': modelToUse = gpt4Turbo; break;
        case 'gpt4': modelToUse = gpt4; break;
        case 'gpt35Turbo': modelToUse = gpt35Turbo; break;
        default: throw new Error(`Unknown OpenAI model ID: ${aiModelName}`);
      }
    } else if (aiProvider === 'anthropic') {
      modelToUse = aiModelName; // Assumes genkitx-anthropic handles string model IDs
    } else if (aiProvider === 'googleai') {
      modelToUse = `googleai/${aiModelName}`;
    } else {
      throw new Error(`Unsupported AI provider: ${aiProvider}`);
    }

    // Get schema constraints
    const entitySchema = EntitySchema[entityName];
    console.log('entitySchema', entitySchema, columnName);
    if (!entitySchema) {
      console.log(`Entity "${entityName}" not found.`);
    }
    const columnSchema = entitySchema.shape[columnName];
    if (!columnSchema) {
      console.log(`Column "${columnName}" not found in entity "${entityName}".`);
    }

    // Extract schema details
    const schemaDetails = {
      schemaType: columnSchema._def.typeName,
      schemaMinLength: (columnSchema._def as any).minLength?.value || null,
      schemaMaxLength: (columnSchema._def as any).maxLength?.value || null,
      schemaPattern: (columnSchema._def as any).regex?.source || null,
      schemaRequired: !columnSchema.isOptional(),
    };

    // Prepare prompt data
    const promptData = {
      entityName,
      columnName,
      data,
      ...schemaDetails,
    };

    console.log('[data-correction-suggestions] Attempting to use model:', `${aiProvider}/${aiModelName}`);
    const { output } = await prompt(promptData, { model: modelToUse });
    if (!output) {
      throw new Error('AI did not return an output for data correction suggestions.');
    }

    // Validate output length
    if (output.correctedData.length !== data.length) {
      console.error(
        `CRITICAL: Data correction AI returned ${output.correctedData.length} items, but input had ${data.length} items. Output was:`,
        output
      );
      throw new Error('Corrected data length does not match input data length.');
    }

    // Validate corrected data against schema
    const validationResults = output.correctedData.map((value, index) => {
      const validation = columnSchema.safeParse(value);
      if (!validation.success) {
        console.warn(`Corrected value at index ${index} ("${value}") does not comply with schema:`, validation.error.format());
        return { index, value, valid: false, errors: validation.error.flatten().fieldErrors };
      }
      return { index, value, valid: true };
    });

    // Apply fallback corrections for invalid values
    const correctedData = output.correctedData.map((value, index) => {
      const result = validationResults[index];
      if (!result.valid) {
        // Fallback for Users.Password
        if (entityName === 'Users' && columnName === 'Password') {
          if (value.length < 4) return value.padEnd(4, 'x');
          if (value.length > 50) return value.slice(0, 50);
          return 'defaultpass'; // Fallback for other issues
        }
        // Fallback for Users.Phone (example)
        if (entityName === 'Users' && columnName === 'Phone') {
          const cleaned = value.replace(/[^0-9]/g, '');
          if (cleaned.length === 10) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
          return '(000) 000-0000'; // Default for invalid phone
        }
        // Add fallback logic for other columns/entities as needed
        return value; // Keep as is if no specific fallback
      }
      return value;
    });

    // Update explanation if fallbacks were applied
    let explanation = output.explanation;
    const invalidCorrections = validationResults.filter((r) => !r.valid);
    if (invalidCorrections.length > 0) {
      explanation += ' Note: Some AI corrections were invalid and replaced with fallback values to comply with schema constraints.';
    }

    return { correctedData, explanation };
  }
);