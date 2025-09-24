'use server';
/**
 * @fileOverview Address processing using Map Utility Service for geocoding.
 *
 * - processAddress - A function that handles address cleaning and geocoding using Map Utility Service.
 * - ProcessAddressClientInput - The input type for the processAddress function (client-facing).
 * - ProcessAddressOutput - The return type for the processAddress function.
 */

import { z } from 'genkit';
import { createMapUtilityService, ProcessAddressOutput as MapUtilityProcessAddressOutput } from '../../services/mapUtilityService';

// Schema for the data required by the address processing
const ProcessAddressPromptInputSchema = z.object({
  streetAddress: z.string().describe('The street address line (e.g., "123 Main St", "PO Box 100").'),
  city: z.string().optional().describe('The city or locality.'),
  state: z.string().optional().describe('The state, province, or region.'),
  postalCode: z.string().optional().describe('The postal code or ZIP code.'),
  country: z.string().optional().describe('The country. If not provided, try to infer based on other components.'),
});

// Schema for the output from the address processing
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
  aiReasoning: z.string().describe('Explanation about the processing, geocoding process, or why it failed/partially succeeded.'),
});

export type ProcessAddressOutput = z.infer<typeof ProcessAddressOutputSchema>;

// Schema for the input received by the exported server action from the client
const ProcessAddressClientInputSchema = ProcessAddressPromptInputSchema.extend({
  aiProvider: z.string().describe("The AI provider ID (kept for compatibility but not used)."),
  aiModelName: z.string().describe("The specific model name (kept for compatibility but not used).")
});

export type ProcessAddressClientInput = z.infer<typeof ProcessAddressClientInputSchema>;

// Schema for batch processing multiple addresses
const ProcessAddressesBatchInputSchema = z.object({
  addresses: z.array(ProcessAddressPromptInputSchema).describe('Array of addresses to process'),
});

const ProcessAddressesBatchOutputSchema = z.object({
  results: z.array(ProcessAddressOutputSchema).describe('Array of processed address results'),
});

export type ProcessAddressesBatchInput = z.infer<typeof ProcessAddressesBatchInputSchema>;
export type ProcessAddressesBatchOutput = z.infer<typeof ProcessAddressesBatchOutputSchema>;

// Schema for the client input for batch processing
const ProcessAddressesBatchClientInputSchema = z.object({
  addresses: z.array(ProcessAddressPromptInputSchema).describe('Array of addresses to process'),
  aiProvider: z.string().describe("The AI provider ID (kept for compatibility but not used)."),
  aiModelName: z.string().describe("The specific model name (kept for compatibility but not used).")
});

export type ProcessAddressesBatchClientInput = z.infer<typeof ProcessAddressesBatchClientInputSchema>;

/**
 * Process a single address using the Map Utility Service
 * @param input - Address data and configuration
 * @returns Promise<ProcessAddressOutput> - Processed address with geocoding results
 */
export async function processAddress(input: ProcessAddressClientInput): Promise<ProcessAddressOutput> {
  const { aiProvider, aiModelName, ...addressData } = input;

  // Validate input
  if (!addressData.streetAddress || addressData.streetAddress.trim() === '') {
    return {
      cleanedStreetAddress: null,
      cleanedCity: null,
      cleanedState: null,
      cleanedPostalCode: null,
      cleanedCountry: null,
      latitude: null,
      longitude: null,
      status: 'INVALID_INPUT',
      aiReasoning: 'Empty street address',
    };
  }

  try {
    // Create Map Utility Service instance
    const mapService = createMapUtilityService();
    
    // Process the address using Map Utility Service
    const result = await mapService.processAddress({
      streetAddress: addressData.streetAddress,
      city: addressData.city,
      state: addressData.state,
      postalCode: addressData.postalCode,
      country: addressData.country,
    });
    
    return {
      cleanedStreetAddress: result.address,
      cleanedCity: result.city,
      cleanedState: result.state,
      cleanedPostalCode: result.zipCode,
      cleanedCountry: result.country,
      latitude: result.lat,
      longitude: result.lng,
      status: result.lat && result.lng ? 'OK' : 'GEOCODE_FAILED',
      aiReasoning: result.lat && result.lng ? 'Geocoded successfully' : 'Geocoding failed',
    };
  } catch (error) {
    console.error('Error in processAddress with Map Utility Service:', error);
    
    // Return a structured error output
    return {
      cleanedStreetAddress: addressData.streetAddress,
      cleanedCity: addressData.city || null,
      cleanedState: addressData.state || null,
      cleanedPostalCode: addressData.postalCode || null,
      cleanedCountry: addressData.country || null,
      latitude: null,
      longitude: null,
      status: 'CLEANUP_FAILED',
      aiReasoning: `Map Utility Service error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Process multiple addresses in batch using the Map Utility Service
 * @param input - Batch address data and configuration
 * @returns Promise<ProcessAddressesBatchOutput> - Batch processed address results
 */
export async function processAddressesBatch(input: ProcessAddressesBatchClientInput): Promise<ProcessAddressesBatchOutput> {
  const { aiProvider, aiModelName, addresses } = input;

  if (!addresses || addresses.length === 0) {
    return { results: [] };
  }

  // Filter out addresses with empty street addresses and create fallback results
  const validAddresses: Array<{
    streetAddress: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }> = [];
  const fallbackResults: ProcessAddressOutput[] = [];
  
  addresses.forEach((addr, index) => {
    if (!addr.streetAddress || addr.streetAddress.trim() === '') {
      fallbackResults[index] = {
        cleanedStreetAddress: null,
        cleanedCity: null,
        cleanedState: null,
        cleanedPostalCode: null,
        cleanedCountry: null,
        latitude: null,
        longitude: null,
        status: 'INVALID_INPUT',
        aiReasoning: 'Empty street address',
      };
    } else {
      validAddresses.push({
        streetAddress: addr.streetAddress,
        city: addr.city,
        state: addr.state,
        postalCode: addr.postalCode,
        country: addr.country,
      });
    }
  });

  if (validAddresses.length === 0) {
    return { results: fallbackResults };
  }

  try {
    // Create Map Utility Service instance
    const mapService = createMapUtilityService();
    
    // Process addresses in batch using Map Utility Service
    const results = await mapService.processAddressesBatch(validAddresses);
    const finalResults: ProcessAddressOutput[] = [];
    let validIndex = 0;
    
    addresses.forEach((addr, index) => {
      if (!addr.streetAddress || addr.streetAddress.trim() === '') {
        finalResults[index] = fallbackResults[index];
      } else {
        const mapResult = results[validIndex];
        finalResults[index] = {
          cleanedStreetAddress: mapResult.address,
          cleanedCity: mapResult.city,
          cleanedState: mapResult.state,
          cleanedPostalCode: mapResult.zipCode,
          cleanedCountry: mapResult.country,
          latitude: mapResult.lat,
          longitude: mapResult.lng,
          status: mapResult.lat && mapResult.lng ? 'OK' : 'GEOCODE_FAILED',
          aiReasoning: mapResult.lat && mapResult.lng ? 'Geocoded successfully' : 'Geocoding failed',
        };
        validIndex++;
      }
    });

    return { results: finalResults };
  } catch (error) {
    console.error('Error in processAddressesBatch with Map Utility Service:', error);
    
    // Return fallback results for all addresses
    const errorResults: ProcessAddressOutput[] = addresses.map(addr => ({
      cleanedStreetAddress: addr.streetAddress || null,
      cleanedCity: addr.city || null,
      cleanedState: addr.state || null,
      cleanedPostalCode: addr.postalCode || null,
      cleanedCountry: addr.country || null,
      latitude: null,
      longitude: null,
      status: 'CLEANUP_FAILED',
      aiReasoning: 'Map Utility Service processing failed',
    }));

    return { results: errorResults };
  }
}
