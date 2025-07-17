import type { LookupData } from "./lookupManager";

interface CachedLookupData {
  data: any[] | string[] | null;
  lastFetched: Date;
  expiresAt: Date;
}

interface LookupCacheEntry {
  chassisOwnersData?: CachedLookupData;
  chassisSizesData?: CachedLookupData;
  chassisTypesData?: CachedLookupData;
  driverProfileTypesData?: CachedLookupData;
  branchesData?: CachedLookupData;
  customerData?: CachedLookupData;
  permissionRolesData?: CachedLookupData;
  fleetOwnersData?: CachedLookupData;
  customerFleetData?: CachedLookupData;
  timezoneListData?: CachedLookupData;
  commoditiesData?: CachedLookupData;
  chassisData?: CachedLookupData;
  trucksData?: CachedLookupData;
  containerOwnersData?: CachedLookupData;
  containerSizesData?: CachedLookupData;
  containerTypesData?: CachedLookupData;
  driverGroupsData?: CachedLookupData;
  driverGroupsLastFetched?: CachedLookupData;
  carrierGroupsData?: CachedLookupData;
  carrierGroupsLastFetched?: CachedLookupData;
  chargeProfileData?: CachedLookupData;
  driverChargeProfileData?: CachedLookupData;
  chargeProfileLastFetched?: CachedLookupData;
  driverPayGroupsData?: CachedLookupData;
  driverPayGroupsLastFetched?: CachedLookupData;
  currenciesData?: CachedLookupData;
  currenciesLastFetched?: CachedLookupData;
  chargeCodesData?: CachedLookupData;
  chargeCodesLastFetched?: CachedLookupData;
  cityGroupsData?: CachedLookupData;
  cityGroupsLastFetched?: CachedLookupData;
  zipCodeGroupsData?: CachedLookupData;
  zipCodeGroupsLastFetched?: CachedLookupData;
  CSRData?: CachedLookupData;
  CSRLastFetched?: CachedLookupData;
}

class LookupCache {
  private cache: LookupCacheEntry = {};
  private defaultCacheDurationMinutes = 30; // 30 minutes default cache

  constructor(cacheDurationMinutes = 30) {
    this.defaultCacheDurationMinutes = cacheDurationMinutes;
  }

  // Set data in cache with expiration
  setCachedData(
    lookupKey: keyof LookupData,
    data: any[] | string[] | null,
    lastFetched?: Date,
    cacheDurationMinutes?: number
  ): void {
    const now = new Date();
    const duration = cacheDurationMinutes || this.defaultCacheDurationMinutes;
    const expiresAt = new Date(now.getTime() + duration * 60 * 1000);

    this.cache[lookupKey] = {
      data,
      lastFetched: lastFetched || now,
      expiresAt,
    };

    console.log(
      `📦 Cached ${lookupKey}: ${
        data?.length || 0
      } items, expires at ${expiresAt.toLocaleTimeString()}`
    );
  }

  // Get data from cache if not expired
  getCachedData(lookupKey: keyof LookupData): any[] | string[] | null {
    const cachedEntry = this.cache[lookupKey];

    if (!cachedEntry) {
      return null;
    }

    const now = new Date();
    if (now > cachedEntry.expiresAt) {
      console.log(`⏰ Cache expired for ${lookupKey}, removing from cache`);
      delete this.cache[lookupKey];
      return null;
    }

    console.log(
      `✅ Cache hit for ${lookupKey}: ${cachedEntry.data?.length || 0} items`
    );
    return cachedEntry.data;
  }

  // Check if data is cached and valid
  isCached(lookupKey: keyof LookupData): boolean {
    return this.getCachedData(lookupKey) !== null;
  }

  // Get all cached data as LookupData structure
  getAllCachedData(): LookupData {
    const lookupData: LookupData = {
      chassisOwnersData: this.getCachedData("chassisOwnersData"),
      chassisSizesData: this.getCachedData("chassisSizesData"),
      chassisTypesData: this.getCachedData("chassisTypesData"),
      driverProfileTypesData: this.getCachedData("driverProfileTypesData"),
      branchesData: this.getCachedData("branchesData"),
      customerData: this.getCachedData("customerData"),
      permissionRolesData: this.getCachedData("permissionRolesData"),
      fleetOwnersData: this.getCachedData("fleetOwnersData"),
      customerFleetData: this.getCachedData("customerFleetData"),
      timezoneListData: this.getCachedData("timezoneListData"),
      commoditiesData: this.getCachedData("commoditiesData"),
      chassisData: this.getCachedData("chassisData"),
      trucksData: this.getCachedData("trucksData"),
      containerOwnersData: this.getCachedData("containerOwnersData"),
      containerSizesData: this.getCachedData("containerSizesData"),
      containerTypesData: this.getCachedData("containerTypesData"),
      driverGroupsData: this.getCachedData("driverGroupsData"),
      carrierGroupsData: this.getCachedData("carrierGroupsData"),
      chargeProfileData: this.getCachedData("chargeProfileData"),
      driverChargeProfileData: this.getCachedData("driverChargeProfileData"),
      cityGroupsData: this.getCachedData("cityGroupsData"),
      zipCodeGroupsData: this.getCachedData("zipCodeGroupsData"),
      CSRData: this.getCachedData("CSRData"),
      driverPayGroupsData: this.getCachedData("driverPayGroupsData"),
      currenciesData: this.getCachedData("currenciesData"),
      chargeCodesData: this.getCachedData("chargeCodesData"),
    };

    return lookupData;
  }

  // Load data from AppContext into cache
  loadFromAppContext(appContextData: {
    chassisOwnersData?: any[] | null;
    chassisOwnersLastFetched?: Date | null;
    chassisSizesData?: any[] | null;
    chassisSizesLastFetched?: Date | null;
    chassisTypesData?: any[] | null;
    chassisTypesLastFetched?: Date | null;
    driverProfileTypesData?: string[] | null;
    driverProfileTypesLastFetched?: Date | null;
    branchesData?: any[] | null;
    branchesLastFetched?: Date | null;
    customerData?: any[] | null;
    customerLastFetched?: Date | null;
    permissionRolesData?: any[] | null;
    permissionRolesLastFetched?: Date | null;
    fleetOwnersData?: any[] | null;
    fleetOwnersLastFetched?: Date | null;
    customerFleetData?: any[] | null;
    customerFleetLastFetched?: Date | null;
    timezoneListData?: string[] | null;
    timezoneListLastFetched?: Date | null;
    commoditiesData?: any[] | null;
    commoditiesLastFetched?: Date | null;
    chassisData?: any[] | null;
    chassisLastFetched?: Date | null;
    trucksData?: any[] | null;
    trucksLastFetched?: Date | null;
    containerOwnersData?: any[] | null;
    containerOwnersLastFetched?: Date | null;
    containerSizesData?: any[] | null;
    containerSizesLastFetched?: Date | null;
    containerTypesData?: any[] | null;
    containerTypesLastFetched?: Date | null;
    driverGroupsData?: any[] | null;
    driverGroupsLastFetched?: Date | null;
    carrierGroupsData?: any[] | null;
    carrierGroupsLastFetched?: Date | null;
    chargeProfileData?: any[] | null;
    driverChargeProfileData?: any[] | null;
    chargeProfileLastFetched?: Date | null;
    cityGroupsData?: any[] | null;
    cityGroupsLastFetched?: Date | null;
    zipCodeGroupsData?: any[] | null;
    zipCodeGroupsLastFetched?: Date | null;
    CSRData?: any[] | null;
    CSRLastFetched?: Date | null;
    driverPayGroupsData?: any[] | null;
    driverPayGroupsLastFetched?: Date | null;
    currenciesData?: any[] | null;
    currenciesLastFetched?: Date | null;
    chargeCodesData?: any[] | null;
    chargeCodesLastFetched?: Date | null;
  }): void {
    console.log("📥 Loading lookup data from AppContext into cache...");

    // Only cache data that exists and is not empty
    if (appContextData.chassisOwnersData?.length) {
      this.setCachedData(
        "chassisOwnersData",
        appContextData.chassisOwnersData,
        appContextData.chassisOwnersLastFetched || undefined
      );
    }
    if (appContextData.chassisSizesData?.length) {
      this.setCachedData(
        "chassisSizesData",
        appContextData.chassisSizesData,
        appContextData.chassisSizesLastFetched || undefined
      );
    }
    if (appContextData.chassisTypesData?.length) {
      this.setCachedData(
        "chassisTypesData",
        appContextData.chassisTypesData,
        appContextData.chassisTypesLastFetched || undefined
      );
    }
    if (appContextData.driverProfileTypesData?.length) {
      this.setCachedData(
        "driverProfileTypesData",
        appContextData.driverProfileTypesData,
        appContextData.driverProfileTypesLastFetched || undefined
      );
    }
    if (appContextData.branchesData?.length) {
      this.setCachedData(
        "branchesData",
        appContextData.branchesData,
        appContextData.branchesLastFetched || undefined
      );
    }
    if (appContextData.customerData?.length) {
      this.setCachedData(
        "customerData",
        appContextData.customerData,
        appContextData.customerLastFetched || undefined
      );
    }
    if (appContextData.permissionRolesData?.length) {
      this.setCachedData(
        "permissionRolesData",
        appContextData.permissionRolesData,
        appContextData.permissionRolesLastFetched || undefined
      );
    }
    if (appContextData.fleetOwnersData?.length) {
      this.setCachedData(
        "fleetOwnersData",
        appContextData.fleetOwnersData,
        appContextData.fleetOwnersLastFetched || undefined
      );
    }
    if (appContextData.customerFleetData?.length) {
      this.setCachedData(
        "customerFleetData",
        appContextData.customerFleetData,
        appContextData.customerFleetLastFetched || undefined
      );
    }
    if (appContextData.timezoneListData?.length) {
      this.setCachedData(
        "timezoneListData",
        appContextData.timezoneListData,
        appContextData.timezoneListLastFetched || undefined
      );
    }
    if (appContextData.commoditiesData?.length) {
      this.setCachedData(
        "commoditiesData",
        appContextData.commoditiesData,
        appContextData.commoditiesLastFetched || undefined
      );
    }
    if (appContextData.chassisData?.length) {
      this.setCachedData(
        "chassisData",
        appContextData.chassisData,
        appContextData.chassisLastFetched || undefined
      );
    }
    if (appContextData.trucksData?.length) {
      this.setCachedData(
        "trucksData",
        appContextData.trucksData,
        appContextData.trucksLastFetched || undefined
      );
    }
    if (appContextData.containerOwnersData?.length) {
      this.setCachedData(
        "containerOwnersData",
        appContextData.containerOwnersData,
        appContextData.containerOwnersLastFetched || undefined
      );
    }
    if (appContextData.containerSizesData?.length) {
      this.setCachedData(
        "containerSizesData",
        appContextData.containerSizesData,
        appContextData.containerSizesLastFetched || undefined
      );
    }
    if (appContextData.containerTypesData?.length) {
      this.setCachedData(
        "containerTypesData",
        appContextData.containerTypesData,
        appContextData.containerTypesLastFetched || undefined
      );
    }
    if (appContextData.driverGroupsData?.length) {
      this.setCachedData(
        "driverGroupsData",
        appContextData.driverGroupsData,
        appContextData.driverGroupsLastFetched || undefined
      );
    }
    if (appContextData.carrierGroupsData?.length) {
      this.setCachedData(
        "carrierGroupsData",
        appContextData.carrierGroupsData,
        appContextData.carrierGroupsLastFetched || undefined
      );
    }
    if (appContextData.chargeProfileData?.length) {
      this.setCachedData(
        "chargeProfileData",
        appContextData.chargeProfileData,
        appContextData.chargeProfileLastFetched || undefined
      );
    }
    if (appContextData.cityGroupsData?.length) {
      this.setCachedData(
        "cityGroupsData",
        appContextData.cityGroupsData,
        appContextData.cityGroupsLastFetched || undefined
      );
    }
    if (appContextData.zipCodeGroupsData?.length) {
      this.setCachedData(
        "zipCodeGroupsData",
        appContextData.zipCodeGroupsData,
        appContextData.zipCodeGroupsLastFetched || undefined
      );
    }
    if (appContextData.CSRData?.length) {
      this.setCachedData(
        "CSRData",
        appContextData.CSRData,
        appContextData.CSRLastFetched || undefined
      );
    }
    if (appContextData.driverPayGroupsData?.length) {
      this.setCachedData(
        "driverPayGroupsData",
        appContextData.driverPayGroupsData,
        appContextData.driverPayGroupsLastFetched || undefined
      );
    }
    if (appContextData.currenciesData?.length) {
      this.setCachedData(
        "currenciesData",
        appContextData.currenciesData,
        appContextData.currenciesLastFetched || undefined
      );
    }
    if (appContextData.chargeCodesData?.length) {
      this.setCachedData(
        "chargeCodesData",
        appContextData.chargeCodesData,
        appContextData.chargeCodesLastFetched || undefined
      );
    }
    console.log("✅ AppContext data loaded into cache");
  }

  // Get missing lookup IDs that need to be fetched
  getMissingLookupIds(requiredLookupIds: string[]): string[] {
    const missing: string[] = [];

    // Map lookup IDs to cache keys
    const lookupIdToKey: Record<string, keyof LookupData> = {
      chassisOwners: "chassisOwnersData",
      chassisSizes: "chassisSizesData",
      chassisTypes: "chassisTypesData",
      driverProfileTypes: "driverProfileTypesData",
      branches: "branchesData",
      tmsCustomers: "customerData",
      getAllPermissionRoles: "permissionRolesData",
      fleetOwners: "fleetOwnersData",
      getTMSFleetCustomers: "customerFleetData",
      timezoneList: "timezoneListData",
      commodities: "commoditiesData",
      chassis: "chassisData",
      trucks: "trucksData",
      fleetTruckOwner: "fleetOwnersData",
      fleetCustomer: "customerFleetData",
      customRole: "permissionRolesData",
      containerOwners: "containerOwnersData",
      containerSizes: "containerSizesData",
      containerTypes: "containerTypesData",
      driverGroups: "driverGroupsData",
      carrierGroups: "carrierGroupsData",
      chargeProfile: "chargeProfileData",
      cityGroups: "cityGroupsData",
      zipCodeGroups: "zipCodeGroupsData",
      CSR: "CSRData",
      driverPayGroups: "driverPayGroupsData",
      currencies: "currenciesData",
      chargeCodes: "chargeCodesData",
    };

    requiredLookupIds.forEach((lookupId) => {
      const cacheKey = lookupIdToKey[lookupId];
      if (cacheKey && !this.isCached(cacheKey)) {
        missing.push(lookupId);
      }
    });

    console.log(`🔍 Missing lookup IDs: ${missing.join(", ")}`);
    return missing;
  }

  // Update cache with newly fetched data
  updateWithFetchedData(fetchedData: Partial<LookupData>): void {
    Object.entries(fetchedData).forEach(([key, data]) => {
      if (data && data?.length > 0) {
        this.setCachedData(key as keyof LookupData, data);
      }
    });
  }

  // Clear all cached data
  clearCache(): void {
    this.cache = {};
    console.log("🗑️ Lookup cache cleared");
  }

  // Get cache statistics
  getCacheStats(): { total: number; cached: number; expired: number } {
    const allKeys: (keyof LookupData)[] = [
      "chassisOwnersData",
      "chassisSizesData",
      "chassisTypesData",
      "driverProfileTypesData",
      "branchesData",
      "customerData",
      "permissionRolesData",
      "fleetOwnersData",
      "customerFleetData",
      "timezoneListData",
      "commoditiesData",
      "chassisData",
      "trucksData",
      "containerOwnersData",
      "containerSizesData",
      "containerTypesData",
      "driverGroupsData",
      "carrierGroupsData",
      "chargeProfileData",
      "cityGroupsData",
      "zipCodeGroupsData",
      "CSRData",
      "driverPayGroupsData",
      "currenciesData",
      "chargeCodesData",
    ];

    let cached = 0;
    let expired = 0;

    allKeys.forEach((key) => {
      const cachedEntry = this.cache[key];
      if (cachedEntry) {
        const now = new Date();
        if (now > cachedEntry.expiresAt) {
          expired++;
        } else {
          cached++;
        }
      }
    });

    return { total: allKeys.length, cached, expired };
  }
}

// Global cache instance
export const lookupCache = new LookupCache(30); // 30-minute cache

export { LookupCache };