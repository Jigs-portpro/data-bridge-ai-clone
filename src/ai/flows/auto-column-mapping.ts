
'use server';
/**
 * @fileOverview An AI agent for automatically mapping source columns to target entity fields.
 *
 * - autoColumnMapping - A function that handles the column auto-mapping process.
 * - AutoColumnMappingClientInput - The client-facing input type for the autoColumnMapping function.
 * - AutoColumnMappingOutput - The return type for the autoColumnMapping function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TargetFieldSchema = z.object({
  name: z.string().describe('The name of the target field.'),
  type: z.string().optional().describe('The data type of the target field (e.g., string, number, date).'),
});

// Schema for the data required by the AI prompt
const AutoColumnMappingPromptInputSchema = z.object({
  sourceColumnNames: z.array(z.string()).describe('An array of source column names from the uploaded data.'),
  targetFields: z.array(TargetFieldSchema).describe('An array of target entity fields, each with a name and optional type.'),
});

// Schema for the input received by the exported server action from the client
const AutoColumnMappingClientInputSchema = AutoColumnMappingPromptInputSchema.extend({
  aiProvider: z.string().describe("The AI provider ID (e.g., 'googleai', 'openai')."),
  aiModelName: z.string().describe("The specific model name (e.g., 'gemini-1.5-flash', 'gpt-4o-mini').")
});
export type AutoColumnMappingClientInput = z.infer<typeof AutoColumnMappingClientInputSchema>;


const MappingSuggestionSchema = z.object({
  targetFieldName: z.string().describe('The name of the target entity field.'),
  suggestedSourceColumn: z.string().nullable().describe('The suggested source column name that maps to this target field. Null if no good match is found.'),
  confidenceScore: z.number().min(0).max(100).describe('A confidence score (0-100) for the mapping. 100 is a perfect match, 0 is no match.'),
  reasoning: z.string().describe('A brief explanation for the suggested mapping and confidence score.'),
});
export type MappingSuggestion = z.infer<typeof MappingSuggestionSchema>;


const AutoColumnMappingOutputSchema = z.object({
  mappings: z.array(MappingSuggestionSchema).describe('An array of mapping suggestions.'),
});
export type AutoColumnMappingOutput = z.infer<typeof AutoColumnMappingOutputSchema>;

export async function autoColumnMapping(input: AutoColumnMappingClientInput): Promise<AutoColumnMappingOutput> {
  return autoColumnMappingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'autoColumnMappingPrompt',
  input: {schema: AutoColumnMappingPromptInputSchema},
  output: {schema: AutoColumnMappingOutputSchema},
  prompt: `You are an expert data integration assistant. Your task is to automatically map source data columns to target API entity fields.
You will be given a list of source column names and a list of target entity fields (with their names and types).

Source Column Names:
{{#each sourceColumnNames}}
- {{{this}}}
{{/each}}

Target Entity Fields:
{{#each targetFields}}
- Name: {{{name}}}{{#if type}}, Type: {{{type}}}{{/if}}
{{/each}}

For each target entity field, suggest the best matching source column name.
Provide a confidence score (0-100) for each mapping, where 100 is a perfect match and 0 is no match.
Also, provide a brief reasoning for your suggestion (e.g., "Exact name match", "Semantic similarity to 'Client ID'", "No clear match found").

If no source column is a good match for a target field, set 'suggestedSourceColumn' to null and 'confidenceScore' to a low value (e.g., less than 30).
Prioritize exact or very close name matches (case-insensitive, ignoring spaces and underscores).
Consider semantic similarity (e.g., "Customer Name" vs "ClientName", "PO Number" vs "PurchaseOrder").
If target field type is provided, it can be a hint, but focus primarily on names unless types strongly conflict with common sense for a given name.

Respond with a JSON object containing a "mappings" array, where each element has "targetFieldName", "suggestedSourceColumn", "confidenceScore", and "reasoning".
Ensure every target field from the input is present in your output mappings array exactly once.
`,
});

const autoColumnMappingFlow = ai.defineFlow(
  {
    name: 'autoColumnMappingFlow',
    inputSchema: AutoColumnMappingClientInputSchema,
    outputSchema: AutoColumnMappingOutputSchema,
  },
  async (clientInput) => {
    const { aiProvider, aiModelName, ...promptData } = clientInput;
    const modelIdentifier = `${aiProvider}/${aiModelName}`;
    
    const {output} = await prompt(promptData, { model: modelIdentifier });
    if (!output) {
      throw new Error("AI did not return an output for auto column mapping.");
    }
    // Ensure all target fields are present in the output, even if AI missed some
    const allTargetFieldNames = promptData.targetFields.map(tf => tf.name);
    const mappedTargetFieldNames = new Set(output!.mappings.map(m => m.targetFieldName));

    for (const targetFieldName of allTargetFieldNames) {
        if (!mappedTargetFieldNames.has(targetFieldName)) {
            output!.mappings.push({
                targetFieldName: targetFieldName,
                suggestedSourceColumn: null,
                confidenceScore: 0,
                reasoning: "No suggestion provided by AI for this field."
            });
        }
    }
    return output!;
  }
);
