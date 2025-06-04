
// DuplicateDetectionFlow.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow for detecting duplicate entries in a dataset based on fuzzy matching of user-specified columns.
 *
 * The flow takes a dataset and a list of columns as input, and returns a list of duplicate entries.
 *
 * - `detectDuplicates`:  A function that initiates the duplicate detection process.
 * - `DuplicateDetectionClientInput`: The client-facing input type for the `detectDuplicates` function.
 * - `DuplicateDetectionOutput`: The return type for the `detectDuplicates` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Schema for the data required by the AI prompt
const DuplicateDetectionPromptInputSchema = z.object({
  data: z.array(z.record(z.any())).describe('The dataset to check for duplicates, represented as an array of objects.'),
  columns: z
    .array(z.string())
    .describe('The columns to use for detecting duplicates.  Duplicates are detected if all the specified columns match.'),
});

// Schema for the input received by the exported server action from the client
const DuplicateDetectionClientInputSchema = DuplicateDetectionPromptInputSchema.extend({
  aiProvider: z.string().describe("The AI provider ID (e.g., 'googleai', 'openai')."),
  aiModelName: z.string().describe("The specific model name (e.g., 'gemini-1.5-flash', 'gpt-4o-mini').")
});
export type DuplicateDetectionClientInput = z.infer<typeof DuplicateDetectionClientInputSchema>;


// Define the output schema for the duplicate detection flow
const DuplicateDetectionOutputSchema = z.object({
  duplicates: z
    .array(z.array(z.number()))
    .describe('A list of duplicate entries. Each entry is an array of indices from the input `data` array that are considered duplicates.'),
});
export type DuplicateDetectionOutput = z.infer<typeof DuplicateDetectionOutputSchema>;

// Exported function to initiate the duplicate detection process
export async function detectDuplicates(input: DuplicateDetectionClientInput): Promise<DuplicateDetectionOutput> {
  return duplicateDetectionFlow(input);
}

// Define the prompt for the duplicate detection flow
const duplicateDetectionPrompt = ai.definePrompt({
  name: 'duplicateDetectionPrompt',
  input: {schema: DuplicateDetectionPromptInputSchema},
  output: {schema: DuplicateDetectionOutputSchema},
  prompt: `You are an expert data analyst specializing in identifying duplicate entries in datasets.

  Given the following dataset and columns, identify and return the indices of any rows that are duplicates based on those columns.

  Dataset:
  {{#each data}}
  {{@index}}: {{this}}
  {{/each}}

  Columns to check for duplicates: {{columns}}

  Return a JSON object with a "duplicates" field.  The "duplicates" field should contain an array of arrays. Each inner array should contain the indices of rows that are considered duplicates.
  For example, if rows 1, 3, and 5 are duplicates, the output should contain:  [[1, 3, 5]]

  If there are no duplicates, return an empty array for the duplicates field: []
  `,
});

// Define the Genkit flow for duplicate detection
const duplicateDetectionFlow = ai.defineFlow(
  {
    name: 'duplicateDetectionFlow',
    inputSchema: DuplicateDetectionClientInputSchema,
    outputSchema: DuplicateDetectionOutputSchema,
  },
  async (clientInput) => {
    const { aiProvider, aiModelName, ...promptData } = clientInput;
    const modelIdentifier = `${aiProvider}/${aiModelName}`;

    const {output} = await duplicateDetectionPrompt(promptData, { model: modelIdentifier });
    if (!output) {
      throw new Error("AI did not return an output for duplicate detection.");
    }
    return output!;
  }
);
