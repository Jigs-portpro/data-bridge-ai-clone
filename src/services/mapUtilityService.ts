import axios from 'axios';

export type MapUtilityAddressInput = {
  streetAddress: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

export type ProcessAddressOutput = {
  lat: number | null;
  lng: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zipCode: string | null;
  countryCode: string | null;
};

class MapUtilityService {
  private serviceUrl: string;
  private apiKey: string;

  constructor(serviceUrl: string, apiKey: string) {
    this.serviceUrl = serviceUrl;
    this.apiKey = apiKey;
  }

  private buildSearchTerm(address: MapUtilityAddressInput): string {
    const parts = [
      address.streetAddress,
      address.city,
      address.state,
      address.country,
      address.postalCode,
    ].filter(Boolean); // Filter out undefined/null values
    return parts.join(', ');
  }

  async processAddress(address: MapUtilityAddressInput): Promise<ProcessAddressOutput> {
    try {
      const searchTerm = this.buildSearchTerm(address);
      const criteria = {
        address: searchTerm.trim(),
      };

      const requestUrl = `${this.serviceUrl}/geo-code`;
      
      const response = await axios.get(requestUrl, {
        params: criteria,
        headers: {
          "x-api-key": this.apiKey
        }
      });

      const placeData = response?.data?.data?.place ?? {};

      return {
        lat: placeData.geometry?.location?.lat ?? null,
        lng: placeData.geometry?.location?.lng ?? null,
        address: placeData.us_address || placeData.search_text || searchTerm,
        city: placeData.city || null,
        state: placeData.state || null,
        country: placeData.country || null,
        zipCode: placeData.postalCode || null,
        countryCode: placeData.countryCode || null,
      };
    } catch (error: any) {
      throw new Error(`Geocoding failed: ${error.message || 'Unknown error'}`);
    }
  }

  async processAddressesBatch(addresses: MapUtilityAddressInput[]): Promise<ProcessAddressOutput[]> {
    const results: ProcessAddressOutput[] = [];
    
    // Process addresses in sequence to avoid rate limiting
    for (const address of addresses) {
      try {
        const result = await this.processAddress(address);
        results.push(result);
      } catch (error) {
        console.error(`Error processing address: ${this.buildSearchTerm(address)}`, error);
        results.push({
          lat: null,
          lng: null,
          address: address.streetAddress || null,
          city: address.city || null,
          state: address.state || null,
          country: address.country || null,
          zipCode: address.postalCode || null,
          countryCode: null,
        });
      }
    }
    
    return results;
  }
}

export function createMapUtilityService() {
  const serviceUrl = process.env.MAP_UTIL_SERVICE_URL;
  const apiKey = process.env.MAP_UTIL_SERVICE_X_API_KEY;

  if (!serviceUrl || !apiKey) {
    console.warn('MAP_UTIL_SERVICE_URL or MAP_UTIL_SERVICE_X_API_KEY not set. MapUtilityService will not function.');
    // Return a dummy service or throw an error depending on desired behavior
    return {
      processAddress: async (address: MapUtilityAddressInput) => ({
        lat: null, lng: null, address: address.streetAddress, city: address.city, state: address.state, country: address.country, zipCode: address.postalCode, countryCode: null
      }),
      processAddressesBatch: async (addresses: MapUtilityAddressInput[]) => addresses.map(address => ({
        lat: null, lng: null, address: address.streetAddress, city: address.city, state: address.state, country: address.country, zipCode: address.postalCode, countryCode: null
      })),
    } as MapUtilityService; // Cast to MapUtilityService to satisfy type
  }

  return new MapUtilityService(serviceUrl, apiKey);
}
