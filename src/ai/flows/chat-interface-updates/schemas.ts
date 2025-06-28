import { z } from 'genkit';

// Schema for the input received by the exported server action from the client
export const ChatInterfaceUpdatesClientInputSchema = z.object({
  aiProvider: z.string().describe("The AI provider ID (e.g., 'googleai', 'openai', 'anthropic')."),
  aiModelName: z.string().describe("The specific model name (e.g., 'gemini-1.5-flash', 'gpt4oMini', 'claude-3-haiku-20240307')."),
  userQuery: z.string().describe('The user query related to the data.'),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'system', 'model', 'tool']).describe('The role of the message sender.'),
    content: z.string().describe('The content of the message.'),
    isError: z.boolean().optional().describe('Whether the message is an error.'),
  })).optional().describe('The chat history for context.'),
  entityName: z.string().describe('The name of the entity to use for the data context.'),
  sessionId: z.string().describe('The user session ID.'),
  // API token for server-side lookup fetching
  apiToken: z.string().optional().describe('API token for fetching lookup data on the server'),
  // Enable/disable lookup validation
  enableLookupValidation: z.boolean().optional().default(true).describe('Whether to enable lookup validation (default: true)'),
  // AppContext lookup data (to avoid re-fetching)
  appContextLookupData: z.object({
    chassisOwnersData: z.array(z.any()).nullable().optional(),
    chassisOwnersLastFetched: z.date().nullable().optional(),
    chassisSizesData: z.array(z.any()).nullable().optional(),
    chassisSizesLastFetched: z.date().nullable().optional(),
    chassisTypesData: z.array(z.any()).nullable().optional(),
    chassisTypesLastFetched: z.date().nullable().optional(),
    driverProfileTypesData: z.array(z.string()).nullable().optional(),
    driverProfileTypesLastFetched: z.date().nullable().optional(),
    branchesData: z.array(z.any()).nullable().optional(),
    branchesLastFetched: z.date().nullable().optional(),
    customerData: z.array(z.any()).nullable().optional(),
    customerLastFetched: z.date().nullable().optional(),
    permissionRolesData: z.array(z.any()).nullable().optional(),
    permissionRolesLastFetched: z.date().nullable().optional(),
    fleetOwnersData: z.array(z.any()).nullable().optional(),
    fleetOwnersLastFetched: z.date().nullable().optional(),
    customerFleetData: z.array(z.any()).nullable().optional(),
    customerFleetLastFetched: z.date().nullable().optional(),
    timezoneListData: z.array(z.string()).nullable().optional(),
    timezoneListLastFetched: z.date().nullable().optional(),
    commoditiesData: z.array(z.any()).nullable().optional(),
    commoditiesLastFetched: z.date().nullable().optional(),
    chassisData: z.array(z.any()).nullable().optional(),
    chassisLastFetched: z.date().nullable().optional(),
    trucksData: z.array(z.any()).nullable().optional(),
    trucksLastFetched: z.date().nullable().optional(),
  }).optional().describe('Lookup data from AppContext to avoid re-fetching'),
});

export const ChatInterfaceUpdatesOutputSchema = z.object({
  isError: z.boolean().optional().describe('Whether the output is an error.'),
  response: z.string().describe('The response to the user query based on the data.'),
  updatedDataContext: z
    .string()
    .optional()
    .describe('The updated data context in JSON format after applying the changes.'),
});

// Type exports
export type ChatInterfaceUpdatesClientInput = z.infer<typeof ChatInterfaceUpdatesClientInputSchema>;
export type ChatInterfaceUpdatesOutput = z.infer<typeof ChatInterfaceUpdatesOutputSchema>; 