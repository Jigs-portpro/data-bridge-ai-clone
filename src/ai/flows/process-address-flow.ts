
'use server';
/**
 * @fileOverview An AI agent for cleaning address components and providing latitude/longitude.
 *
 * - processAddress - A function that handles address cleaning and geocoding.
 * - ProcessAddressClientInput - The input type for the processAddress function (client-facing).
 * - ProcessAddressOutput - The return type for the processAddress function.
 */

import {ai} from '@/ai/genkit';
import {z, type GenkitModel} from 'genkit';
import {
  gpt4o, gpt4oMini, gpt4Turbo, gpt4, gpt35Turbo,
} from 'genkitx-openai';
// Assuming genkitx-anthropic handles string model IDs for now.

// Schema for the data required by the AI prompt
const ProcessAddressPromptInputSchema = z.object({
  streetAddress: z.string().describe('The street address line (e.g., "123 Main St", "PO Box 100").'),
  city: z.string().optional().describe('The city or locality.'),
  state: z.string().optional().describe('The state, province, or region.'),
  postalCode: z.string().optional().describe('The postal code or ZIP code.'),
  country: z.string().optional().describe('The country. If not provided, try to infer based on other components.'),
});

// Schema for the output from the AI
// NOT EXPORTED: Defined for internal use by ai.definePrompt and for deriving ProcessAddressOutput type.
const ProcessAddressOutputSchema = z.object({
  cleanedStreetAddress: z.string().nullable().describe('The cleaned and standardized street address. Null if not determinable.'),
  cleanedCity: z.string().nullable().describe('The cleaned and standardized city. Null if not determinable.'),
  cleanedState: z.string().nullable().describe('The cleaned and standardized state/province. Null if not determinable.'),
  cleanedPostalCode: z.string().nullable().describe('The cleaned and standardized postal code. Null if not determinable.'),
  cleanedCountry: z.string().nullable().describe('The cleaned and standardized country. Null if not determinable.'),
  latitude: z.number().nullable().describe('The geographic latitude. Null if geocoding failed.'),
  longitude: z.number().nullable().describe('The geographic longitude. Null if geocoding failed.'),
  status: z.enum(['OK', 'PARTIAL_CLEANUP', 'GEOCODE_FAILED', 'CLEANUP_FAILED', 'INVALID_INPUT'])
    .describe('Status of the processing: OK (all good), PARTIAL_CLEANUP (some cleaning, geocode might be ok or failed), GEOCODE_FAILED, CLEANUP_FAILED, INVALID_INPUT (e.g. empty streetAddress).'),
  aiReasoning: z.string().describe('Explanation from the AI about the cleaning, geocoding process, or why it failed/partially succeeded.'),
});
export type ProcessAddressOutput = z.infer<typeof ProcessAddressOutputSchema>;

// Schema for the input received by the exported server action from the client
// NOT EXPORTED: Defined for internal use and for deriving ProcessAddressClientInput type.
const ProcessAddressClientInputSchema = ProcessAddressPromptInputSchema.extend({
  aiProvider: z.string().describe("The AI provider ID (e.g., 'googleai', 'openai', 'anthropic')."),
  aiModelName: z.string().describe("The specific model name (e.g., 'gemini-1.5-flash', 'gpt4oMini', 'claude-3-haiku-20240307').")
});
export type ProcessAddressClientInput = z.infer<typeof ProcessAddressClientInputSchema>;


const addressProcessingPrompt = ai.definePrompt({
  name: 'addressProcessingPrompt',
  input: {schema: ProcessAddressPromptInputSchema},
  output: {schema: ProcessAddressOutputSchema},
  prompt: `You are an expert address processing and geocoding assistant.
Given the following address components:
Street Address: {{{streetAddress}}}
City: {{#if city}}{{{city}}}{{else}}(not provided){{/if}}
State/Province: {{#if state}}{{{state}}}{{else}}(not provided){{/if}}
Postal Code: {{#if postalCode}}{{{postalCode}}}{{else}}(not provided){{/if}}
Country: {{#if country}}{{{country}}}{{else}}(not provided, attempt to infer based on other components, default to US if ambiguous but seems North American){{/if}}

Your tasks are:
1.  Clean and standardize each address component. Examples: "Street" to "St.", "Apartment" to "Apt", ensure consistent casing for city/state.
2.  If a component like country is missing, try to infer it logically from other provided components. If highly ambiguous, state so in reasoning.
3.  Provide the geographic latitude and longitude for the cleaned address. Latitude and Longitude MUST be numbers, or null if they cannot be determined.
4.  Determine a status:
    *   'OK': All components cleaned reasonably well and geocoding successful.
    *   'PARTIAL_CLEANUP': Some components cleaned, but others might be missing or geocoding failed.
    *   'GEOCODE_FAILED': Address components might be okay, but geocoding could not find coordinates.
    *   'CLEANUP_FAILED': Could not make sense of the input for cleaning.
    *   'INVALID_INPUT': Critical input like streetAddress was empty or clearly not an address.
5.  Provide a concise reasoning for your actions, especially if geocoding fails or components are inferred.

Respond with a JSON object matching the ProcessAddressOutputSchema.
If streetAddress is empty or clearly not an address, set status to 'INVALID_INPUT', all cleaned fields to null, lat/long to null, and explain in aiReasoning.
Return null for any component that cannot be cleaned, standardized, or inferred. For latitude and longitude, if they cannot be found, return null for both. Do not make up coordinates.
`,
});

export async function processAddress(input: ProcessAddressClientInput): Promise<ProcessAddressOutput> {
  const { aiProvider, aiModelName, ...promptData } = input;

  if (!promptData.streetAddress || promptData.streetAddress.trim() === '') {
    return {
      cleanedStreetAddress: null,
      cleanedCity: null,
      cleanedState: null,
      cleanedPostalCode: null,
      cleanedCountry: null,
      latitude: null,
      longitude: null,
      status: 'INVALID_INPUT',
      aiReasoning: 'Street address was empty or not provided. Cannot process.',
    };
  }
  
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

  try {
    const {output} = await addressProcessingPrompt(
      promptData,
      { model: modelToUse }
    );
    if (!output) {
      throw new Error("AI did not return an output for address processing.");
    }
    // Ensure latitude and longitude are numbers or null
    output.latitude = typeof output.latitude === 'number' ? output.latitude : null;
    output.longitude = typeof output.longitude === 'number' ? output.longitude : null;
    
    return output;
  } catch (error) {
    console.error(`Error in processAddress with model ${aiProvider}/${aiModelName}:`, error);
    // Return a structured error output
    return {
      cleanedStreetAddress: promptData.streetAddress, // return original street
      cleanedCity: promptData.city || null,
      cleanedState: promptData.state || null,
      cleanedPostalCode: promptData.postalCode || null,
      cleanedCountry: promptData.country || null,
      latitude: null,
      longitude: null,
      status: 'CLEANUP_FAILED', 
      aiReasoning: `AI processing failed. Error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
