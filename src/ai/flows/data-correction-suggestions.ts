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
  entityName: z.string().optional().describe('The name of the entity (e.g., Users, Carrier, etc.). Optional if columnName is unique.'),
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
  console.log('Input:', JSON.stringify(input, null, 2));
  return suggestDataCorrectionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestDataCorrectionsPrompt',
  input: { schema: SuggestDataCorrectionsPromptInputSchema },
  output: { schema: SuggestDataCorrectionsOutputSchema },
  prompt: `You are an AI data quality specialist. Given an entity name (if provided), a column name, and a list of its data entries, you will suggest corrections to improve data quality while adhering to the schema constraints for the specified column.

Entity Name: {{#if entityName}}{{{entityName}}}{{else}}Not specified{{/if}}
Column Name: {{{columnName}}}
Schema Constraints:
- Type: {{schemaType}}
{{#if schemaMinLength}}- Minimum Length: {{{schemaMinLength}}}{{/if}}
{{#if schemaMaxLength}}- Maximum Length: {{{schemaMaxLength}}}{{/if}}
{{#if schemaPattern}}- Pattern: {{{patternDescription}}}{{/if}}
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
  - For pattern-based fields (e.g., Phone, Password, Email), reformat to match the pattern (e.g., "(123) 456-7890" for Phone, "user@example.com" for Email).
  - For length violations, truncate or pad as needed to meet min/max requirements.
- Preserve valid entries unchanged.
- For empty or null or invalid entries in required fields, suggest a default valid value (e.g., "Admin" for SystemRoles, "user@example.com" for Email) and if any has specific regex pattern, then follow the pattern and suggest values.

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
    console.log('Client Input:', JSON.stringify(clientInput, null, 2));

    // Normalize column name (remove '*' and trim)
    const normalizedColumnName = columnName.replace(/\*/g, '').trim();
    console.log(`Normalized column name: "${normalizedColumnName}"`);

    // Resolve model
    let modelToUse: GenkitModel | string;
    try {
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
        modelToUse = aiModelName;
      } else if (aiProvider === 'googleai') {
        modelToUse = `googleai/${aiModelName}`;
      } else {
        throw new Error(`Unsupported AI provider: ${aiProvider}`);
      }
    } catch (error) {
      console.error('Error resolving AI model:', error);
      throw error;
    }

    // Semantic column matching
    const findColumn = (schema: any, colName: string) => {
      if (!schema || !schema.shape) {
        console.error('Invalid schema or schema.shape:', schema);
        return null;
      }
      const columns = Object.keys(schema.shape);
      const normalizedColName = colName.toLowerCase().replace(/\s+/g, '');
      // Exact match (ignoring case and asterisks)
      let matchedColumn = columns.find((key) => key.replace(/\*/g, '').toLowerCase() === colName.toLowerCase());
      if (matchedColumn) return matchedColumn;
      // Semantic match for email (e.g., "Login Email Address" -> "Email*")
      if (normalizedColName.includes('email')) {
        matchedColumn = columns.find((key) => key.toLowerCase().replace(/\*/g, '').includes('email'));
        if (matchedColumn) return matchedColumn;
      }
      // Semantic match for other fields
      const keywords = normalizedColName.split('');
      matchedColumn = columns.find((key) => {
        const normalizedKey = key.toLowerCase().replace(/\*/g, '').replace(/\s+/g, '');
        return keywords.some((kw) => normalizedKey.includes(kw));
      });
      console.log(`findColumn: Looking for "${colName}", found "${matchedColumn || 'none'}" in columns:`, columns);
      return matchedColumn || null;
    };

    // Find schema for the column
    let columnSchema;
    let selectedEntityName = entityName;
    let patternDescription = '';

    try {
      if (entityName) {
        console.log('⚠️ VALIDATION SOURCE: Legacy Zod Schema - EntitySchema lookup for entity:', entityName);
        const entitySchema = EntitySchema[entityName];
        if (!entitySchema) {
          console.error(`Entity "${entityName}" not found in EntitySchema. Available entities:`, Object.keys(EntitySchema));
          throw new Error(`Entity "${entityName}" not found.`);
        }
        console.log(`Available columns in entity "${entityName}":`, Object.keys(entitySchema.shape || {}));
        const matchedColumnName = findColumn(entitySchema, normalizedColumnName);
        if (matchedColumnName) {
          columnSchema = entitySchema.shape[matchedColumnName];
          selectedEntityName = entityName;
        }
      }

      // If no match in specified entity or no entity provided, search all entities
      if (!columnSchema) {
        console.log('⚠️ VALIDATION SOURCE: Legacy Zod Schema - EntitySchema search across all entities for column:', normalizedColumnName);
        const matchingEntities = Object.entries(EntitySchema)
          .map(([name, schema]) => {
            const matchedColumnName = findColumn(schema, normalizedColumnName);
            return matchedColumnName ? { name, schema, matchedColumnName } : null;
          })
          .filter((entry) => entry !== null);

        if (matchingEntities.length === 0) {
          console.error(`No entity found with column matching "${normalizedColumnName}". Available entities:`, Object.keys(EntitySchema));
          throw new Error(`Column "${normalizedColumnName}" not found in any entity.`);
        }
        if (matchingEntities.length > 1) {
          console.warn(
            `Multiple entities found with column matching "${normalizedColumnName}": ${matchingEntities.map((e) => e!.name).join(', ')}. Using the first one: ${matchingEntities[0]!.name}.`
          );
        }
        selectedEntityName = matchingEntities[0]!.name;
        columnSchema = matchingEntities[0]!.schema.shape[matchingEntities[0]!.matchedColumnName];
      }
    } catch (error) {
      console.error('Error finding column schema:', error);
      throw error;
    }

    // Extract schema details
    let schemaDetails;
    try {
      schemaDetails = {
        schemaType: columnSchema._def.typeName,
        schemaMinLength: (columnSchema._def as any).minLength?.value || null,
        schemaMaxLength: (columnSchema._def as any).maxLength?.value || null,
        schemaPattern: (columnSchema._def as any).regex?.source || null,
        schemaRequired: !columnSchema.isOptional(),
      };
      console.log('Schema Details:', schemaDetails);
    } catch (error) {
      console.error('Error extracting schema details:', error);
      throw new Error('Failed to extract schema details.');
    }

    if (schemaDetails.schemaPattern) {
      switch (normalizedColumnName.toLowerCase().replace(/\s+/g, '')) {
        case 'email':
        case 'loginemailaddress':
          patternDescription = `- Pattern: Must be a valid email address (e.g., "user@example.com").\n`;
          break;
        case 'phone':
          patternDescription = `- Pattern: Must be a valid phone number in the format "(XXX) XXX-XXXX".\n`;
          break;
        case 'password':
          patternDescription = `- Pattern: Must meet password requirements (e.g., at least 8 characters, including letters and numbers).\n`;
          break;
        default:
          patternDescription = `- Pattern: Must match the regex ${schemaDetails.schemaPattern}.\n`;
      }
    }

    // Prepare prompt data
    const promptData = {
      entityName: selectedEntityName || '',
      columnName: normalizedColumnName,
      data,
      ...schemaDetails,
      patternDescription,
    };

    console.log('[data-correction-suggestions] Prompt Data:', JSON.stringify(promptData, null, 2));
    let output;
    try {
      const result = await prompt(promptData, { model: modelToUse });
      output = result.output;
      if (!output) {
        throw new Error('AI did not return an output for data correction suggestions.');
      }
    } catch (error) {
      console.error('Error executing AI prompt:', error);
      throw new Error('Failed to execute AI prompt.');
    }

    // Validate output length
    try {
      if (output.correctedData.length !== data?.length) {
        console.error(
          `CRITICAL: Data correction AI returned ${output.correctedData.length} items, but input had ${data?.length} items. Output was:`,
          output
        );
        throw new Error('Corrected data length does not match input data length.');
      }
    } catch (error) {
      console.error('Error validating output length:', error);
      throw error;
    }

    // Validate corrected data against schema
    const validationResults = output.correctedData.map((value, index) => {
      try {
        const validation = columnSchema.safeParse(value);
        if (!validation.success) {
          console.warn(`Corrected value at index ${index} ("${value}") does not comply with schema:`, validation.error.format());
          return { index, value, valid: false, errors: validation.error.flatten().fieldErrors };
        }
        return { index, value, valid: true };
      } catch (error) {
        console.error(`Error validating value at index ${index}:`, error);
        return { index, value, valid: false, errors: { validation: 'Failed to validate' } };
      }
    });

    // Apply fallback corrections for invalid values
    const correctedData = output.correctedData.map((value, index) => {
      const result = validationResults[index];
      if (!result.valid) {
        try {
          // Handle required fields
          if (schemaDetails.schemaRequired && (!value || value.trim() === '')) {
            if (normalizedColumnName.toLowerCase().replace(/\s+/g, '').includes('email')) {
              return 'user@example.com'; // Default for empty/invalid email
            }
            if (normalizedColumnName.toLowerCase().replace(/\s+/g, '').includes('phone')) {
              return '(000) 000-0000'; // Default for empty/invalid phone
            }
            if (normalizedColumnName.toLowerCase().replace(/\s+/g, '').includes('password')) {
              return 'defaultpass'; // Default for empty/invalid password
            }
            if (normalizedColumnName.toLowerCase().replace(/\s+/g, '').includes('name')) {
              return 'DefaultName'; // Default for empty/invalid name fields
            }
            if (normalizedColumnName.toLowerCase().replace(/\s+/g, '').includes('role')) {
              return 'Admin'; // Default for role fields
            }
            return 'default'; // Generic default for other required fields
          }
          // Handle length violations
          if (schemaDetails.schemaMinLength && value.length < schemaDetails.schemaMinLength) {
            return value.padEnd(schemaDetails.schemaMinLength, 'x');
          }
          if (schemaDetails.schemaMaxLength && value.length > schemaDetails.schemaMaxLength) {
            return value.slice(0, schemaDetails.schemaMaxLength);
          }
          // Handle pattern-based fields
          if (schemaDetails.schemaPattern) {
            if (normalizedColumnName.toLowerCase().replace(/\s+/g, '').includes('email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              return 'user@example.com'; // Default for invalid email
            }
            if (normalizedColumnName.toLowerCase().replace(/\s+/g, '').includes('phone')) {
              const cleaned = value.replace(/[^0-9]/g, '');
              if (cleaned.length === 10) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
              return '(000) 000-0000'; // Default for invalid phone
            }
          }
          // Standardize casing for string fields
          if (schemaDetails.schemaType === 'ZodString') {
            if (normalizedColumnName.toLowerCase().replace(/\s+/g, '').includes('name')) {
              return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
            }
            if (normalizedColumnName.toLowerCase().replace(/\s+/g, '').includes('email')) {
              return value.toLowerCase();
            }
          }
          // Keep as is if no specific fallback
          return value;
        } catch (error) {
          console.error(`Error applying fallback at index ${index}:`, error);
          return value; // Fallback to original value to prevent crash
        }
      }
      return value;
    });

    // Update explanation if fallbacks were applied
    let explanation = output.explanation;
    const invalidCorrections = validationResults.filter((r) => !r.valid);
    if (invalidCorrections.length > 0) {
      explanation += ' Note: Some AI corrections were invalid and replaced with fallback values to comply with schema constraints.';
    }

    console.log('Output:', { correctedData, explanation });
    return { correctedData, explanation };
  }
);