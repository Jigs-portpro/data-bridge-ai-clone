interface LookupDataSource {
  getData: () => any[] | null;
  field: string;
  name: string;
  fetchFunction?: () => Promise<void>;
}

interface LookupValidationConfig {
  lookupId: string;
  lookupField: string;
}

interface LookupValidationResult {
  isValid: boolean;
  errors: string[];
  missingLookups: string[];
}

interface LookupFetchFunctions {
  fetchAndStoreChassisOwners: () => Promise<void>;
  fetchAndStoreChassisSizes: () => Promise<void>;
  fetchAndStoreChassisTypes: () => Promise<void>;
  fetchAndStoreContainerSizes: () => Promise<void>;
  fetchAndStoreContainerTypes: () => Promise<void>;
  fetchAndStoreContainerOwners: () => Promise<void>;
  fetchAndStoreBranches: () => Promise<void>;
  fetchAndStoreDriverProfileTypes: () => Promise<void>;
  fetchAndStoreCustomer: () => Promise<void>;
  fetchAndStoreFleetOwners: () => Promise<void>;
  fetchAndStoreCustomerFleet: () => Promise<void>;
  fetchAndStoreCommodities: () => Promise<void>;
  fetchAndStoreChassis: () => Promise<void>;
  fetchAndStoreTrucks: () => Promise<void>;
  fetchAndStoreCurrencies: () => Promise<void>;
  fetchAndStoreChargeCodes: () => Promise<void>;
  fetchAndStoreDriverPayGroups: () => Promise<void>;
  fetchAndStoreCityGroups: () => Promise<void>;
  fetchAndStoreZipCodeGroups: () => Promise<void>;
  fetchAndStoreCSR: () => Promise<void>;
  fetchAndStoreDriverGroups: () => Promise<void>;
  fetchAndStoreCarrierGroups: () => Promise<void>;
  fetchAndStoreTimezoneList: () => Promise<void>;
  fetchAndStorePermissionRoles: () => Promise<void>;
}

interface LookupData {
  chassisOwnersData: any[] | null;
  chassisSizesData: any[] | null;
  chassisTypesData: any[] | null;
  driverProfileTypesData: any[] | null;
  branchesData: any[] | null;
  customerData: any[] | null;
  permissionRolesData: any[] | null;
  fleetOwnersData: any[] | null;
  customerFleetData: any[] | null;
  timezoneListData: any[] | null;
  commoditiesData: any[] | null;
  chassisData: any[] | null;
  trucksData: any[] | null;
  currenciesData: any[] | null;
  chargeCodesData: any[] | null;
  driverPayGroupsData: any[] | null;
  cityGroupsData: any[] | null;
  zipCodeGroupsData: any[] | null;
  CSRData: any[] | null;
  containerOwnersData: any[] | null;
  containerSizesData: any[] | null;
  containerTypesData: any[] | null;
  driverGroupsData: any[] | null;
  carrierGroupsData: any[] | null;
}

export class LookupManager {
  private lookupData: LookupData;
  private fetchFunctions: LookupFetchFunctions;
  private lookupDataSources: Record<string, LookupDataSource> = {};

  constructor(lookupData: LookupData, fetchFunctions: LookupFetchFunctions) {
    this.lookupData = lookupData;
    this.fetchFunctions = fetchFunctions;
    this.initializeLookupDataSources();
  }

  private initializeLookupDataSources() {
    this.lookupDataSources = {
      chassisOwners: {
        getData: () => this.lookupData.chassisOwnersData,
        field: "company_name",
        name: "Chassis Owners",
        fetchFunction: this.fetchFunctions.fetchAndStoreChassisOwners,
      },
      chassisSizes: {
        getData: () => this.lookupData.chassisSizesData,
        field: "name",
        name: "Chassis Sizes",
        fetchFunction: this.fetchFunctions.fetchAndStoreChassisSizes,
      },
      chassisTypes: {
        getData: () => this.lookupData.chassisTypesData,
        field: "name",
        name: "Chassis Types",
        fetchFunction: this.fetchFunctions.fetchAndStoreChassisTypes,
      },
      driverProfileTypes: {
        getData: () =>
          this.lookupData.driverProfileTypesData
            ? this.lookupData.driverProfileTypesData.map((type) => ({ type }))
            : null,
        field: "type",
        name: "Driver Profile Types",
        fetchFunction: this.fetchFunctions.fetchAndStoreDriverProfileTypes,
      },
      branches: {
        getData: () => this.lookupData.branchesData,
        field: "name",
        name: "Branches",
        fetchFunction: this.fetchFunctions.fetchAndStoreBranches,
      },
      tmsCustomers: {
        getData: () => this.lookupData.customerData,
        field: "company_name",
        name: "TMS Customers",
        fetchFunction: this.fetchFunctions.fetchAndStoreCustomer,
      },
      getAllPermissionRoles: {
        getData: () => this.lookupData.permissionRolesData,
        field: "roleName",
        name: "Permission Roles",
        fetchFunction: this.fetchFunctions.fetchAndStorePermissionRoles,
      },
      fleetOwners: {
        getData: () => this.lookupData.fleetOwnersData,
        field: "company_name",
        name: "Fleet Owners",
        fetchFunction: this.fetchFunctions.fetchAndStoreFleetOwners,
      },
      getTMSFleetCustomers: {
        getData: () => this.lookupData.customerFleetData,
        field: "company_name",
        name: "Customer Fleet",
        fetchFunction: this.fetchFunctions.fetchAndStoreCustomerFleet,
      },
      timezoneList: {
        getData: () =>
          this.lookupData.timezoneListData
            ? this.lookupData.timezoneListData.map((type) => ({ type }))
            : null,
        field: "type",
        name: "Timezone List",
        fetchFunction: this.fetchFunctions.fetchAndStoreTimezoneList,
      },
      commodities: {
        getData: () => this.lookupData.commoditiesData,
        field: "name",
        name: "Commodities",
        fetchFunction: this.fetchFunctions.fetchAndStoreCommodities,
      },
      chassis: {
        getData: () => this.lookupData.chassisData,
        field: "chassisNo",
        name: "chassisNo",
        fetchFunction: this.fetchFunctions.fetchAndStoreChassis,
      },
      trucks: {
        getData: () => this.lookupData.trucksData,
        field: "equipmentID",
        name: "Trucks",
        fetchFunction: this.fetchFunctions.fetchAndStoreTrucks,
      },
      currencies: {
        getData: () => this.lookupData.currenciesData,
        field: "currencyCode",
        name: "Currencies",
        fetchFunction: this.fetchFunctions.fetchAndStoreCurrencies,
      },
      chargeCodes: {
        getData: () => this.lookupData.chargeCodesData,
        field: "value",
        name: "Charge Codes",
        fetchFunction: this.fetchFunctions.fetchAndStoreChargeCodes,
      },
      driverPayGroups: {
        getData: () => this.lookupData.driverPayGroupsData,
        field: "name",
        name: "Driver Pay Groups",
        fetchFunction: this.fetchFunctions.fetchAndStoreDriverPayGroups,
      },
      cityGroups: {
        getData: () => this.lookupData.cityGroupsData,
        field: "name",
        name: "City Groups",
        fetchFunction: this.fetchFunctions.fetchAndStoreCityGroups,
      },
      zipCodeGroups: {
        getData: () => this.lookupData.zipCodeGroupsData,
        field: "name",
        name: "Zip Code Groups",
        fetchFunction: this.fetchFunctions.fetchAndStoreZipCodeGroups,
      },
      CSR: {
        getData: () => this.lookupData.CSRData,
        field: "name",
        name: "CSR",
        fetchFunction: this.fetchFunctions.fetchAndStoreCSR,
      },
      containerOwners: {
        getData: () => this.lookupData.containerOwnersData,
        field: "company_name",
        name: "Container Owners",
        fetchFunction: this.fetchFunctions.fetchAndStoreContainerOwners,
      },
      containerSizes: {
        getData: () => this.lookupData.containerSizesData,
        field: "name",
        name: "Container Sizes",
        fetchFunction: this.fetchFunctions.fetchAndStoreContainerSizes,
      },
      containerTypes: {
        getData: () => this.lookupData.containerTypesData,
        field: "name",
        name: "Container Types",
        fetchFunction: this.fetchFunctions.fetchAndStoreContainerTypes,
      },
      driverGroups: {
        getData: () => this.lookupData.driverGroupsData,
        field: "name",
        name: "Driver Groups",
        fetchFunction: this.fetchFunctions.fetchAndStoreDriverGroups,
      },
      carrierGroups: {
        getData: () => this.lookupData.carrierGroupsData,
        field: "name",
        name: "Carrier Groups",
        fetchFunction: this.fetchFunctions.fetchAndStoreCarrierGroups,
      },
    };
  }

  /**
   * Get lookup data source by ID
   */
  getLookupDataSource(lookupId: string): LookupDataSource | null {
    return this.lookupDataSources[lookupId] || null;
  }

  /**
   * Get all available lookup data sources
   */
  getAllLookupDataSources(): Record<string, LookupDataSource> {
    return this.lookupDataSources;
  }

  /**
   * Check if lookup data is loaded for a given lookup ID
   */
  isLookupDataLoaded(lookupId: string): boolean {
    const source = this.lookupDataSources[lookupId];
    if (!source) return false;
    const data = source.getData();
    return data !== null && data.length > 0;
  }

  /**
   * Get missing lookup IDs for given lookup validations
   */
  getMissingLookupIds(lookupValidations: LookupValidationConfig[]): string[] {
    const missing: string[] = [];

    lookupValidations.forEach(({ lookupId }) => {
      if (!this.isLookupDataLoaded(lookupId) && !missing.includes(lookupId)) {
        missing.push(lookupId);
      }
    });

    return missing;
  }

  /**
   * Fetch missing lookup data for given lookup IDs
   */
  async fetchMissingLookupData(
    lookupIds: string[]
  ): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];
    const fetchPromises: Promise<void>[] = [];

    lookupIds.forEach((lookupId) => {
      const source = this.lookupDataSources[lookupId];
      if (source && source.fetchFunction) {
        fetchPromises.push(
          source
            .fetchFunction()
            .then(() => {
              success.push(lookupId);
            })
            .catch(() => {
              failed.push(lookupId);
            })
        );
      } else {
        failed.push(lookupId);
      }
    });

    if (fetchPromises.length > 0) {
      await Promise.allSettled(fetchPromises);
    }

    return { success, failed };
  }

  /**
   * Validate a value against lookup data
   */
  validateValueAgainstLookup(
    value: string,
    lookupValidation: LookupValidationConfig,
    isMultiValue = false
  ): { isValid: boolean; error?: string } {
    const { lookupId, lookupField } = lookupValidation;
    const source = this.lookupDataSources[lookupId];

    if (!source) {
      return {
        isValid: false,
        error: `Lookup source ID "${lookupId}" is not supported for validation.`,
      };
    }

    const lookupData = source.getData();
    if (!lookupData || lookupData.length === 0) {
      return {
        isValid: false,
        error: `${source.name} lookup data is not loaded.`,
      };
    }

    // Check if the expected field exists in lookup data
    const firstItem = lookupData[0];
    if (!firstItem || !(lookupField in firstItem)) {
      return {
        isValid: false,
        error: `Lookup field "${lookupField}" not found in ${source.name} data.`,
      };
    }

    // Handle multi-value fields (comma-separated)
    if (isMultiValue) {
      const values = value
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v);
      for (const val of values) {
        const found = lookupData.some(
          (item) => String(item[lookupField]).trim() === val
        );
        if (!found) {
          return {
            isValid: false,
            error: `Value "${val}" not found in ${source.name} (field: ${lookupField}).`,
          };
        }
      }
      return { isValid: true };
    } else {
      // Single value validation
      const found = lookupData.some(
        (item) => String(item[lookupField]).trim() === value
      );
      if (!found) {
        return {
          isValid: false,
          error: `Value "${value}" not found in ${source.name} (field: ${lookupField}).`,
        };
      }
      return { isValid: true };
    }
  }

  /**
   * Validate multiple fields with lookup validations
   */
  validateFieldsWithLookups(
    data: Record<string, any>[],
    fieldLookupMappings: Record<
      string,
      { validation: LookupValidationConfig; isMulti?: boolean }
    >
  ): LookupValidationResult {
    const errors: string[] = [];
    const missingLookups: string[] = [];
    let isValid = true;

    // Check for missing lookup data first
    const lookupValidations = Object.values(fieldLookupMappings).map(
      (m) => m.validation
    );
    const missing = this.getMissingLookupIds(lookupValidations);
    if (missing.length > 0) {
      missingLookups.push(...missing);
      missing.forEach((lookupId) => {
        const source = this.lookupDataSources[lookupId];
        const sourceName = source ? source.name : lookupId;
        errors.push(`Missing lookup data: ${sourceName} (${lookupId})`);
      });
      isValid = false;
    }

    // Validate data against loaded lookups only
    data.forEach((row, rowIndex) => {
      Object.entries(fieldLookupMappings).forEach(
        ([fieldName, { validation, isMulti }]) => {
          const value = row[fieldName];
          const stringValue =
            value === null || value === undefined ? "" : String(value).trim();

          if (stringValue && !missingLookups.includes(validation.lookupId)) {
            const result = this.validateValueAgainstLookup(
              stringValue,
              validation,
              isMulti
            );
            if (!result.isValid) {
              errors.push(
                `Row ${rowIndex + 1}, Field "${fieldName}": ${result.error}`
              );
              isValid = false;
            }
          }
        }
      );
    });

    return { isValid, errors, missingLookups };
  }

  /**
   * Get lookup information for AI context
   */
  getLookupInfoForAI(): Record<string, any> {
    const lookupInfo: Record<string, any> = {};

    Object.entries(this.lookupDataSources).forEach(([lookupId, source]) => {
      const data = source.getData();
      lookupInfo[lookupId] = {
        name: source.name,
        field: source.field,
        available: data && data.length > 0,
        sampleData: data && data.length > 0 ? data.slice(0, 3) : null,
        count: data ? data.length : 0,
      };
    });

    return lookupInfo;
  }

  /**
   * Update lookup data (to be called when new data is fetched)
   */
  updateLookupData(updatedData: Partial<LookupData>) {
    this.lookupData = { ...this.lookupData, ...updatedData };
    this.initializeLookupDataSources(); // Reinitialize with updated data
  }
}

export type {
  LookupDataSource,
  LookupValidationConfig,
  LookupValidationResult,
  LookupFetchFunctions,
  LookupData,
};
