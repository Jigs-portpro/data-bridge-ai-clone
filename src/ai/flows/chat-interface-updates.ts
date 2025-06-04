
'use server';

/**
 * @fileOverview A chat interface to discuss data and make updates.
 *
 * - chatInterfaceUpdates - A function that handles the chat interface and data update process.
 * - ChatInterfaceUpdatesClientInput - The client-facing input type for the chatInterfaceUpdates function.
 * - ChatInterfaceUpdatesOutput - The return type for the chatInterfaceUpdates function.
 */

import {ai} from '@/ai/genkit';
import {z, type GenkitModel} from 'genkit';
import {
  gpt4o, gpt4oMini, gpt4Turbo, gpt4, gpt35Turbo,
} from 'genkitx-openai';
// Assuming genkitx-anthropic handles string model IDs for now.

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
  aiProvider: z.string().describe("The AI provider ID (e.g., 'googleai', 'openai', 'anthropic')."),
  aiModelName: z.string().describe("The specific model name (e.g., 'gemini-1.5-flash', 'gpt4oMini', 'claude-3-haiku-20240307').")
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
      throw new Error("AI did not return an output for chat interface updates.");
    }
    return output!;
  }
);
