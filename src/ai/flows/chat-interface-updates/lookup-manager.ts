import { LookupManager } from "@/lib/lookupManager";
import { ServerLookupFetcher } from "@/lib/serverLookupFetcher";
import { lookupCache } from "@/lib/lookupCache";
import type { ChatInterfaceUpdatesClientInput } from "./schemas";

export interface LookupInitializationResult {
  lookupManager: LookupManager | null;
  lookupInfo: string;
}

export async function initializeLookupSystem(
  enableLookupValidation: boolean,
  apiToken?: string,
  appContextLookupData?: ChatInterfaceUpdatesClientInput["appContextLookupData"],
  requiredLookupIds: string[] = []
): Promise<LookupInitializationResult> {
  let lookupManager: LookupManager | null = null;
  let lookupInfo = "Lookup validation is disabled.";
  let serverLookupFetcher: ServerLookupFetcher | null = null;

  if (enableLookupValidation) {
    console.log("🔄 Initializing lookup validation system with cache...");

    // Load AppContext data into cache first (if provided)
    if (appContextLookupData) {
      console.log("📥 Loading AppContext lookup data into cache...");
      lookupCache.loadFromAppContext(appContextLookupData);
    }

    // Get cached data
    const cachedLookupData = lookupCache.getAllCachedData();
    const cacheStats = lookupCache.getCacheStats();
    console.log(
      `📊 Cache stats: ${cacheStats.cached}/${cacheStats.total} cached, ${cacheStats.expired} expired`
    );

    // Create server-side lookup fetcher with API functionality
    if (apiToken) {
      serverLookupFetcher = new ServerLookupFetcher({
        apiToken: apiToken,
      });
    }

    const fetchFunctions = serverLookupFetcher?.getFetchFunctions() || {
      fetchAndStoreChassisOwners: async () => {},
      fetchAndStoreChassisSizes: async () => {},
      fetchAndStoreChassisTypes: async () => {},
      fetchAndStoreContainerSizes: async () => {},
      fetchAndStoreContainerTypes: async () => {},
      fetchAndStoreContainerOwners: async () => {},
      fetchAndStoreBranches: async () => {},
      fetchAndStoreDriverProfileTypes: async () => {},
      fetchAndStoreCustomer: async () => {},
      fetchAndStoreFleetOwners: async () => {},
      fetchAndStoreCustomerFleet: async () => {},
      fetchAndStoreCommodities: async () => {},
      fetchAndStoreChassis: async () => {},
      fetchAndStoreTrucks: async () => {},
      fetchAndStoreCurrencies: async () => {},
      fetchAndStoreChargeCodes: async () => {},
      fetchAndStoreDriverPayGroups: async () => {},
      fetchAndStoreCityGroups: async () => {},
      fetchAndStoreZipCodeGroups: async () => {},
      fetchAndStoreCSR: async () => {},
      fetchAndStoreDriverGroups: async () => {},
      fetchAndStoreCarrierGroups: async () => {},
      fetchAndStoreTimezoneList: async () => {},
      fetchAndStorePermissionRoles: async () => {},
    };

    lookupManager = new LookupManager(cachedLookupData, fetchFunctions);

    // Only fetch missing lookup data if API token is available
    if (apiToken && serverLookupFetcher) {
      const missingLookupIds =
        lookupCache.getMissingLookupIds(requiredLookupIds);

      if (missingLookupIds.length > 0) {
        console.log(
          `🔄 Fetching missing lookup data: ${missingLookupIds.join(", ")}`
        );
        try {
          const fetchedData = await serverLookupFetcher.fetchMissingLookupData(
            cachedLookupData,
            missingLookupIds
          );

          // Update cache with newly fetched data
          lookupCache.updateWithFetchedData(fetchedData);

          // Update lookup manager with newly fetched data
          lookupManager.updateLookupData(fetchedData);
          console.log(`✅ Successfully fetched and cached missing lookup data`);
        } catch (error) {
          console.warn(`⚠️ Failed to fetch missing lookup data:`, error);
        }
      } else {
        console.log(`✅ All required lookup data already cached`);
      }
    }

    // Get lookup information for AI context
    const lookupInfoData = lookupManager.getLookupInfoForAI();
    lookupInfo = JSON.stringify(lookupInfoData, null, 2);

    if (!apiToken) {
      lookupInfo +=
        "\n\nNote: Limited to cached/AppContext data only (no API token provided).";
      console.warn(
        "No API token provided, limited to cached/AppContext data only."
      );
    }
  }

  return { lookupManager, lookupInfo };
}
