
'use server';

/**
 * @fileOverview Anomaly detection AI agent.
 *
 * - generateAnomalyReport - A function that handles the anomaly report generation process.
 * - AnomalyReportClientInput - The client-facing input type for the generateAnomalyReport function.
 * - AnomalyReportOutput - The return type for the generateAnomalyReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

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
  aiProvider: z.string().describe("The AI provider ID (e.g., 'googleai', 'openai')."),
  aiModelName: z.string().describe("The specific model name (e.g., 'gemini-1.5-flash', 'gpt-4o-mini').")
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
    const modelIdentifier = `${aiProvider}/${aiModelName}`;
    
    const {output} = await prompt(promptData, { model: modelIdentifier });
    if (!output) {
      throw new Error("AI did not return an output for anomaly report generation.");
    }
    return output;
  }
);
