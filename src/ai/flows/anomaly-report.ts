
'use server';

/**
 * @fileOverview Anomaly detection AI agent.
 *
 * - generateAnomalyReport - A function that handles the anomaly report generation process.
 * - AnomalyReportClientInput - The client-facing input type for the generateAnomalyReport function.
 * - AnomalyReportOutput - The return type for the generateAnomalyReport function.
 */

import {ai} from '@/ai/genkit';
import {z, type GenkitModel} from 'genkit';
import {
  gpt4o, gpt4oMini, gpt4Turbo, gpt4, gpt35Turbo,
} from 'genkitx-openai';
// Assuming genkitx-anthropic handles string model IDs for now.
// If errors occur for Anthropic, we'd need to import its model symbols similarly.

// Schema for the data required by the AI prompt
const AnomalyReportPromptInputSchema = z.object({
  data: z
    .string()
    .describe(
      'The data to analyze, expected to be in CSV format with headers. Do not include any explanation or context, just the CSV data.'
    ),
  columnNames: z.array(z.string()).describe('The names of the columns in the data.'),
});

// Schema for the input received by the exported server action from the client
const AnomalyReportClientInputSchema = AnomalyReportPromptInputSchema.extend({
  aiProvider: z.string().describe("The AI provider ID (e.g., 'googleai', 'openai', 'anthropic')."),
  aiModelName: z.string().describe("The specific model name (e.g., 'gemini-1.5-flash', 'gpt4oMini', 'claude-3-haiku-20240307').")
});
export type AnomalyReportClientInput = z.infer<typeof AnomalyReportClientInputSchema>;


const AnomalyReportOutputSchema = z.object({
  report: z.string().describe('A report of potential data anomalies based on statistical analysis.'),
});
export type AnomalyReportOutput = z.infer<typeof AnomalyReportOutputSchema>;

export async function generateAnomalyReport(input: AnomalyReportClientInput): Promise<AnomalyReportOutput> {
  return generateAnomalyReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'anomalyReportPrompt',
  input: {schema: AnomalyReportPromptInputSchema},
  output: {schema: AnomalyReportOutputSchema},
  prompt: `You are an expert data analyst specializing in identifying data anomalies.

You will receive data in CSV format and a list of column names. Your task is to analyze the data and generate a report highlighting potential data anomalies based on statistical analysis.

Data:\n{{{data}}}

Column Names: {{{columnNames}}}

Report:`,
});

const generateAnomalyReportFlow = ai.defineFlow(
  {
    name: 'generateAnomalyReportFlow',
    inputSchema: AnomalyReportClientInputSchema,
    outputSchema: AnomalyReportOutputSchema,
  },
  async (clientInput) => {
    const { aiProvider, aiModelName, ...promptData } = clientInput;
    
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
    
    const {output} = await prompt(promptData, { model: modelToUse });
    if (!output) {
      throw new Error("AI did not return an output for anomaly report generation.");
    }
    return output;
  }
);
