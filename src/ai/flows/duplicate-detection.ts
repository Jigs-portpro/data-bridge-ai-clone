
// DuplicateDetectionFlow.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow for detecting duplicate entries in a dataset based on exact matching of user-specified columns.
 *
 * The flow takes a dataset and a list of columns as input, and returns a list of duplicate entries.
 *
 * - `detectDuplicates`:  A function that initiates the duplicate detection process.
 * - `DuplicateDetectionClientInput`: The client-facing input type for the `detectDuplicates` function.
 * - `DuplicateDetectionOutput`: The return type for the `detectDuplicates` function.
 */

import {ai} from '@/ai/genkit';
import {z, type GenkitModel} from 'genkit';
import {
  gpt4o, gpt4oMini, gpt4Turbo, gpt4, gpt35Turbo,
} from 'genkitx-openai';
// Assuming genkitx-anthropic handles string model IDs for now.

// Schema for the data required by the AI prompt
const DuplicateDetectionPromptInputSchema = z.object({
  data: z.array(z.record(z.any())).describe('The dataset to check for duplicates, represented as an array of objects. Each object is a row.'),
  columnsToCheck: z // Renamed from 'columns' to avoid conflict with Handlebars context if 'columns' is also a top-level var
    .array(z.string())
    .describe('The names of the columns to use for detecting duplicates. Duplicates are identified if all values in these columns match exactly across rows.'),
});

// Schema for the input received by the exported server action from the client
const DuplicateDetectionClientInputSchema = z.object({
  data: z.array(z.record(z.any())).describe('The dataset to check for duplicates.'),
  columns: z.array(z.string()).describe('The columns to use for detecting duplicates.'), // This is what the client sends
  aiProvider: z.string().describe("The AI provider ID (e.g., 'googleai', 'openai', 'anthropic')."),
  aiModelName: z.string().describe("The specific model name (e.g., 'gemini-1.5-flash', 'gpt4oMini', 'claude-3-haiku-20240307').")
});
export type DuplicateDetectionClientInput = z.infer<typeof DuplicateDetectionClientInputSchema>;


// Define the output schema for the duplicate detection flow
const DuplicateDetectionOutputSchema = z.object({
  duplicates: z
    .array(z.array(z.number()))
    .describe('A list of groups of duplicate entries. Each inner array contains the 0-based indices from the input `data` array that are considered duplicates of each other.'),
});
export type DuplicateDetectionOutput = z.infer<typeof DuplicateDetectionOutputSchema>;

// Exported function to initiate the duplicate detection process
export async function detectDuplicates(input: DuplicateDetectionClientInput): Promise<DuplicateDetectionOutput> {
  return duplicateDetectionFlow(input);
}

// Define the prompt for the duplicate detection flow
const duplicateDetectionPrompt = ai.definePrompt({
  name: 'duplicateDetectionPrompt',
  input: {schema: DuplicateDetectionPromptInputSchema}, // Uses the refined schema for prompt data
  output: {schema: DuplicateDetectionOutputSchema},
  prompt: `You are an expert data analyst specializing in identifying duplicate entries in datasets.
You will be given a dataset and a list of column names to check for duplicate values.
A set of rows are considered duplicates if ALL values in the specified 'columnsToCheck' are identical across those rows.

Dataset (showing only relevant columns for each row):
{{#each data}}
Row {{@index}}:
  {{#each ../columnsToCheck as |colName|}}
  - {{colName}}: {{{lookup ../../data[@index] colName}}}
  {{/each}}
{{/each}}

Columns to check for duplicates: {{#join columnsToCheck ", "}}{{/join}}

Identify groups of duplicate rows. For each group, list the 0-based indices of the rows that are duplicates of each other.
Return a JSON object with a "duplicates" field. The "duplicates" field should be an array of arrays. Each inner array should contain the 0-based indices of rows that are duplicates of each other.
For example, if rows 1, 3, and 5 are duplicates of each other (based on the specified columns), and rows 2 and 4 are duplicates of each other, the output should be:
{
  "duplicates": [
    [1, 3, 5],
    [2, 4]
  ]
}
If no duplicates are found, return: { "duplicates": [] }
Ensure your output is ONLY the JSON object.
`,
});

// Define the Genkit flow for duplicate detection
const duplicateDetectionFlow = ai.defineFlow(
  {
    name: 'duplicateDetectionFlow',
    inputSchema: DuplicateDetectionClientInputSchema, // Client sends 'columns'
    outputSchema: DuplicateDetectionOutputSchema,
  },
  async (clientInput) => {
    const { aiProvider, aiModelName, data, columns } = clientInput;
    
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

    const promptData: z.infer<typeof DuplicateDetectionPromptInputSchema> = {
      data: data,
      columnsToCheck: columns, 
    };

    const {output} = await duplicateDetectionPrompt(promptData, { model: modelToUse });
    if (!output) {
      throw new Error("AI did not return an output for duplicate detection.");
    }
    return output;
  }
);
