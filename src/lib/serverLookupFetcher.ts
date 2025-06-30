import type { LookupFetchFunctions, LookupData } from './lookupManager';
import driverProfileTypes from '@/static/driverProfileTypes.json';
import timezoneList from '@/static/timezoneList.json';

interface ServerLookupFetcherOptions {
  apiToken?: string;
  baseUrl?: string;
}

export class ServerLookupFetcher {
  private apiToken: string;
  private baseUrl: string;

  constructor(options: ServerLookupFetcherOptions = {}) {
    this.apiToken = options.apiToken || '';
    this.baseUrl = options.baseUrl || process.env.NEXT_PUBLIC_BASE_URI || 'https://api.axle.network';
  }

  private async genericFetchLookupData(
    endpoint: string,
    lookupName: string,
    fieldsToKeep?: string[]
  ): Promise<any[]> {
    if (!this.apiToken) {
      throw new Error(`API token is missing for ${lookupName}`);
    }

    const fullUrl = `${this.baseUrl}${endpoint}`;
    console.log(`Fetching ${lookupName} from: ${fullUrl}`);

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Accept': 'application/json, text/plain, */*',
      },
    });

    if (!response.ok) {
      let errorData = { message: `API Error: ${response.status} ${response.statusText}` };
      try {
        const errorText = await response.text();
        errorData = JSON.parse(errorText);
      } catch (e) {
        // Use default error message
      }
      throw new Error(errorData.message || `Failed to fetch ${lookupName}: HTTP ${response.status}`);
    }

    const resultData = await response.json();
    console.log(`${lookupName} API Success Response`);

    let items: any[] = [];
    if (Array.isArray(resultData)) {
      items = resultData;
    } else if (resultData && typeof resultData === 'object') {
      if (resultData.data && Array.isArray(resultData.data)) {
        items = resultData.data;
      } else {
        const arrayProperty = Object.values(resultData).find(Array.isArray);
        if (arrayProperty) {
          items = arrayProperty as any[];
        } else if (typeof resultData === 'object' && resultData !== null && Object.keys(resultData).length > 0) {
          items = [resultData];
        } else {
          items = [];
        }
      }
    } else {
      items = [];
    }

    let finalItemsToStore = items;
    if (fieldsToKeep && fieldsToKeep.length > 0 && items.length > 0) {
      finalItemsToStore = items.map(item => {
        const newItem: Record<string, any> = {};
        let hasAtLeastOneField = false;
        fieldsToKeep.forEach(fieldKey => {
          if (item.hasOwnProperty(fieldKey)) {
            newItem[fieldKey] = item[fieldKey];
            hasAtLeastOneField = true;
          }
        });
        // If _id is requested but not found directly, and 'id' exists, map 'id' to '_id'.
        if (fieldsToKeep.includes('_id') && !newItem.hasOwnProperty('_id') && item.hasOwnProperty('id')) {
          newItem['_id'] = item['id'];
          hasAtLeastOneField = true;
        }
        return hasAtLeastOneField ? newItem : null;
      }).filter(item => item !== null) as any[];
    }

    console.log(`${lookupName}: Final items fetched: ${finalItemsToStore.length}`);
    return finalItemsToStore;
  }

  async fetchChassisOwners(): Promise<any[]> {
    return await this.genericFetchLookupData('/carrier/getTMSChassisOwner', 'Chassis Owners', ['company_name', '_id']);
  }

  async fetchChassisSizes(): Promise<any[]> {
    return await this.genericFetchLookupData('/admin/getChassisSize', 'Chassis Sizes', ['name', '_id']);
  }

  async fetchChassisTypes(): Promise<any[]> {
    return await this.genericFetchLookupData('/admin/getChassisType', 'Chassis Types', ['name', '_id']);
  }

  async fetchContainerSizes(): Promise<any[]> {
    return await this.genericFetchLookupData('/admin/getContainerSize', 'Container Sizes', ['name', '_id']);
  }

  async fetchContainerTypes(): Promise<any[]> {
    return await this.genericFetchLookupData('/admin/getContainerType', 'Container Types', ['name', '_id']);
  }

  async fetchContainerOwners(): Promise<any[]> {
    return await this.genericFetchLookupData('/carrier/getTMSContainerOwner', 'Container Owners', ['company_name', '_id']);
  }

  async fetchBranches(): Promise<any[]> {
    return await this.genericFetchLookupData('/getTerminal', 'Branches', ['name', '_id']);
  }

  async fetchDriverProfileTypes(): Promise<string[]> {
    return driverProfileTypes;
  }

  async fetchCustomer(): Promise<any[]> {
    return await this.genericFetchLookupData('/carrier/getTMSCustomers', 'Customer', ['_id', 'company_name']);
  }

  async fetchFleetOwners(): Promise<any[]> {
    return await this.genericFetchLookupData('/tms/getFleetTruckOwner', 'Fleet Owners', ['_id', 'company_name']);
  }

  async fetchCustomerFleet(): Promise<any[]> {
    return await this.genericFetchLookupData('/tms/getTMSFleetCustomers', 'Customer Fleet', ['_id', 'company_name']);
  }

  async fetchCommodities(): Promise<any[]> {
    return await this.genericFetchLookupData('/tms/getCommodityProfile', 'Commodities', ['name', '_id']);
  }

  async fetchChassis(): Promise<any[]> {
    return await this.genericFetchLookupData('/carrier/getTMSChassis', 'Chassis', ['_id', 'chassisNo']);
  }

  async fetchTrucks(): Promise<any[]> {
    return await this.genericFetchLookupData('/carrier/getTMSEquipments', 'Trucks', ['_id', 'equipmentID']);
  }

  async fetchCurrencies(): Promise<any[]> {
    return await this.genericFetchLookupData('/currency', 'Currencies', ['_id', 'currencyCode']);
  }

  async fetchChargeCodes(): Promise<any[]> {
    return await this.genericFetchLookupData('/chargeCode/getDefaultChargeCodes', 'Charge Codes', ['_id', 'value', 'name', 'isPrimary', 'isActive']);
  }

  async fetchDriverPayGroups(): Promise<any[]> {
    return await this.genericFetchLookupData('/rate-engine/vendor-rate/charge-profile-groups?skip=0&limit=30&&vendorType=driver', 'Driver Pay Groups', ['_id', 'name']);
  }

  async fetchCityGroups(): Promise<any[]> {
    return await this.genericFetchLookupData('/tms/getCityGroups', 'City Groups', ['_id', 'name']);
  }

  async fetchZipCodeGroups(): Promise<any[]> {
    return await this.genericFetchLookupData('/tms/getZipCodeGroups', 'Zip Code Groups', ['_id', 'name']);
  }

  async fetchTimezoneList(): Promise<string[]> {
    return timezoneList;
  }

  async fetchPermissionRoles(): Promise<any[]> {
    return await this.genericFetchLookupData('/tms/getPermissionRoles?isDeleted=false', 'Permission Roles', ['_id', 'roleName']);
  }

  async fetchCSR(): Promise<any[]> {
    return await this.genericFetchLookupData('/carrier/getFleetManagers', 'CSR', ['_id', 'name']);
  }

  // Get fetch functions compatible with LookupManager
  getFetchFunctions(): LookupFetchFunctions {
    return {
      fetchAndStoreChassisOwners: async () => {
        await this.fetchChassisOwners();
      },
      fetchAndStoreChassisSizes: async () => {
        await this.fetchChassisSizes();
      },
      fetchAndStoreChassisTypes: async () => {
        await this.fetchChassisTypes();
      },
      fetchAndStoreContainerSizes: async () => {
        await this.fetchContainerSizes();
      },
      fetchAndStoreContainerTypes: async () => {
        await this.fetchContainerTypes();
      },
      fetchAndStoreContainerOwners: async () => {
        await this.fetchContainerOwners();
      },
      fetchAndStoreBranches: async () => {
        await this.fetchBranches();
      },
      fetchAndStoreDriverProfileTypes: async () => {
        await this.fetchDriverProfileTypes();
      },
      fetchAndStoreCustomer: async () => {
        await this.fetchCustomer();
      },
      fetchAndStoreFleetOwners: async () => {
        await this.fetchFleetOwners();
      },
      fetchAndStoreCustomerFleet: async () => {
        await this.fetchCustomerFleet();
      },
      fetchAndStoreCommodities: async () => {
        await this.fetchCommodities();
      },
      fetchAndStoreChassis: async () => {
        await this.fetchChassis();
      },
      fetchAndStoreTrucks: async () => {
        await this.fetchTrucks();
      },
      fetchAndStoreCurrencies: async () => {
        await this.fetchCurrencies();
      },
      fetchAndStoreChargeCodes: async () => {
        await this.fetchChargeCodes();
      },
      fetchAndStoreDriverPayGroups: async () => {
        await this.fetchDriverPayGroups();
      },
      fetchAndStoreCityGroups: async () => {
        await this.fetchCityGroups();
      },
      fetchAndStoreZipCodeGroups: async () => {
        await this.fetchZipCodeGroups();
      },
      fetchAndStoreCSR: async () => {
        await this.fetchCSR();
      },
    };
  }

  // Fetch missing lookup data and return updated lookup data
  async fetchMissingLookupData(currentLookupData: LookupData, missingLookupIds: string[]): Promise<Partial<LookupData>> {
    const updates: Partial<LookupData> = {};

    for (const lookupId of missingLookupIds) {
      try {
        switch (lookupId) {
          case 'chassisOwners':
            updates.chassisOwnersData = await this.fetchChassisOwners();
            break;
          case 'chassisSizes':
            updates.chassisSizesData = await this.fetchChassisSizes();
            break;
          case 'chassisTypes':
            updates.chassisTypesData = await this.fetchChassisTypes();
            break;
          case 'branches':
            updates.branchesData = await this.fetchBranches();
            break;
          case 'driverProfileTypes':
            updates.driverProfileTypesData = await this.fetchDriverProfileTypes();
            break;
          case 'tmsCustomers':
            updates.customerData = await this.fetchCustomer();
            break;
          case 'fleetOwners':
            updates.fleetOwnersData = await this.fetchFleetOwners();
            break;
          case 'getTMSFleetCustomers':
            updates.customerFleetData = await this.fetchCustomerFleet();
            break;
          case 'commodities':
            updates.commoditiesData = await this.fetchCommodities();
            break;
          case 'chassis':
            updates.chassisData = await this.fetchChassis();
            break;
          case 'trucks':
            updates.trucksData = await this.fetchTrucks();
            break;
          case 'timezoneList':
            updates.timezoneListData = await this.fetchTimezoneList();
            break;
          case 'getAllPermissionRoles':
            updates.permissionRolesData = await this.fetchPermissionRoles();
            break;
          case 'currencies':
            updates.currenciesData = await this.fetchCurrencies();
            break;
          case 'chargeCodes':
            updates.chargeCodesData = await this.fetchChargeCodes();
            break;
          case 'driverPayGroups':
            updates.driverPayGroupsData = await this.fetchDriverPayGroups();
            break;
          case 'cityGroups':
            updates.cityGroupsData = await this.fetchCityGroups();
            break;
          case 'zipCodeGroups':
            updates.zipCodeGroupsData = await this.fetchZipCodeGroups();
            break;
          case 'CSR':
            updates.CSRData = await this.fetchCSR();
            break;
          default:
            console.warn(`Unknown lookup ID: ${lookupId}`);
        }
      } catch (error) {
        console.error(`Failed to fetch ${lookupId}:`, error);
        // Continue with other lookups even if one fails
      }
    }

    return updates;
  }
}