
'use server';

/**
 * @fileOverview A chat interface to discuss data and make updates.
 *
 * - chatInterfaceUpdates - A function that handles the chat interface and data update process.
 * - ChatInterfaceUpdatesClientInput - The client-facing input type for the chatInterfaceUpdates function.
 * - ChatInterfaceUpdatesOutput - The return type for the chatInterfaceUpdates function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Schema for the data required by the AI prompt
const ChatInterfaceUpdatesPromptInputSchema = z.object({
  dataContext: z
    .string()
    .describe(
      'The data context in JSON format for discussion and updates.  Include a description of the columns.'
    ),
  userQuery: z.string().describe('The user query related to the data.'),
});

// Schema for the input received by the exported server action from the client
const ChatInterfaceUpdatesClientInputSchema = ChatInterfaceUpdatesPromptInputSchema.extend({
  aiProvider: z.string().describe("The AI provider ID (e.g., 'googleai', 'openai')."),
  aiModelName: z.string().describe("The specific model name (e.g., 'gemini-1.5-flash', 'gpt-4o-mini').")
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
  input: {schema: ChatInterfaceUpdatesPromptInputSchema},
  output: {schema: ChatInterfaceUpdatesOutputSchema},
  prompt: `You are an AI assistant helping users to discuss and update their data through a chat interface.

  The current data context is:
  {{dataContext}}

  The user query is:
  {{userQuery}}

  Based on the data context and the user query, provide a response to the user and update the data context if necessary.
  Return the response and the updated data context in JSON format.
  Ensure that the updated data context is valid JSON.
  If no updates are needed, return the original data context.
  `,
});

const chatInterfaceUpdatesFlow = ai.defineFlow(
  {
    name: 'chatInterfaceUpdatesFlow',
    inputSchema: ChatInterfaceUpdatesClientInputSchema,
    outputSchema: ChatInterfaceUpdatesOutputSchema,
  },
  async (clientInput) => {
    const { aiProvider, aiModelName, ...promptData } = clientInput;
    const modelIdentifier = `${aiProvider}/${aiModelName}`;

    const {output} = await prompt(promptData, { model: modelIdentifier });
    if (!output) {
      throw new Error("AI did not return an output for chat interface updates.");
    }
    return output!;
  }
);
