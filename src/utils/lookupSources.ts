import { Dispatch, SetStateAction } from 'react';

export interface LookupSourceDisplay {
  id: string;
  name: string;
  fetchAction: () => Promise<void>;
  clearAction: () => void;
  getData: () => any[] | null;
  getLastFetched: () => Date | null;
  isFetchingData: boolean;
  relevantColumns?: string[];
  matchReason?: string;
}

interface CreateLookupSourcesParams {
  // State management
  isFetchingSpecific: Record<string, boolean>;
  setIsFetchingSpecific: Dispatch<SetStateAction<Record<string, boolean>>>;
  appIsLoading: boolean;
  
  // Lookup data and functions from context
  chassisOwnersData: any[] | null;
  fetchAndStoreChassisOwners: () => Promise<void>;
  clearChassisOwnersData: () => void;
  chassisOwnersLastFetched: Date | null;
  
  chassisSizesData: any[] | null;
  fetchAndStoreChassisSizes: () => Promise<void>;
  clearChassisSizesData: () => void;
  chassisSizesLastFetched: Date | null;
  
  chassisTypesData: any[] | null;
  fetchAndStoreChassisTypes: () => Promise<void>;
  clearChassisTypesData: () => void;
  chassisTypesLastFetched: Date | null;
  
  containerSizesData: any[] | null;
  fetchAndStoreContainerSizes: () => Promise<void>;
  clearContainerSizesData: () => void;
  containerSizesLastFetched: Date | null;
  
  containerTypesData: any[] | null;
  fetchAndStoreContainerTypes: () => Promise<void>;
  clearContainerTypesData: () => void;
  containerTypesLastFetched: Date | null;
  
  containerOwnersData: any[] | null;
  fetchAndStoreContainerOwners: () => Promise<void>;
  clearContainerOwnersData: () => void;
  containerOwnersLastFetched: Date | null;
  
  branchesData: any[] | null;
  fetchAndStoreBranches: () => Promise<void>;
  clearBranchesData: () => void;
  branchesLastFetched: Date | null;
  
  driverProfileTypesData: any[] | null;
  fetchAndStoreDriverProfileTypes: () => Promise<void>;
  clearDriverProfileTypesData: () => void;
  driverProfileTypesLastFetched: Date | null;
  driverProfileTypesRows: any[] | null;
  
  customerData: any[] | null;
  fetchAndStoreCustomer: () => Promise<void>;
  clearCustomerData: () => void;
  customerLastFetched: Date | null;
  
  permissionRolesData: any[] | null;
  fetchAndStorePermissionRoles: () => Promise<void>;
  clearPermissionRolesData: () => void;
  permissionRolesLastFetched: Date | null;
  
  fleetOwnersData: any[] | null;
  fetchAndStoreFleetOwners: () => Promise<void>;
  clearFleetOwnersData: () => void;
  fleetOwnersLastFetched: Date | null;
  
  customerFleetData: any[] | null;
  fetchAndStoreCustomerFleet: () => Promise<void>;
  clearCustomerFleetData: () => void;
  customerFleetLastFetched: Date | null;
  
  timezoneListData: any[] | null;
  fetchAndStoreTimezoneList: () => Promise<void>;
  clearTimezoneListData: () => void;
  timezoneListLastFetched: Date | null;
  timezoneListRows: any[] | null;
  
  commoditiesData: any[] | null;
  fetchAndStoreCommodities: () => Promise<void>;
  clearCommoditiesData: () => void;
  commoditiesLastFetched: Date | null;
  
  chassisData: any[] | null;
  fetchAndStoreChassis: () => Promise<void>;
  clearChassisData: () => void;
  chassisLastFetched: Date | null;
  
  trucksData: any[] | null;
  fetchAndStoreTrucks: () => Promise<void>;
  clearTrucksData: () => void;
  trucksLastFetched: Date | null;
  
  currenciesData: any[] | null;
  fetchAndStoreCurrencies: () => Promise<void>;
  clearCurrenciesData: () => void;
  currenciesLastFetched: Date | null;

  chargeCodesData: any[] | null;
  fetchAndStoreChargeCodes: () => Promise<void>;
  clearChargeCodesData: () => void;
  chargeCodesLastFetched: Date | null;

  driverPayGroupsData: any[] | null;
  fetchAndStoreDriverPayGroups: () => Promise<void>;
  clearDriverPayGroupsData: () => void;
  driverPayGroupsLastFetched: Date | null;

  cityGroupsData: any[] | null;
  fetchAndStoreCityGroups: () => Promise<void>;
  clearCityGroupsData: () => void;
  cityGroupsLastFetched: Date | null;

  zipCodeGroupsData: any[] | null;
  fetchAndStoreZipCodeGroups: () => Promise<void>;
  clearZipCodeGroupsData: () => void;
  zipCodeGroupsLastFetched: Date | null;

  CSRData: any[] | null;
  fetchAndStoreCSR: () => Promise<void>;
  clearCSRData: () => void;
  CSRLastFetched: Date | null;

  driverGroupsData: any[] | null;
  fetchAndStoreDriverGroups: () => Promise<void>;
  clearDriverGroupsData: () => void;
  driverGroupsLastFetched: Date | null;

  carrierGroupsData: any[] | null;
  fetchAndStoreCarrierGroups: () => Promise<void>;
  clearCarrierGroupsData: () => void;
  carrierGroupsLastFetched: Date | null;

  chargeProfileData: any[] | null;
  fetchAndStoreChargeProfile: () => Promise<void>;
  clearChargeProfileData: () => void;
  chargeProfileLastFetched: Date | null;

  driverChargeProfileData: any[] | null;
  fetchAndStoreDriverChargeProfile: () => Promise<void>;
  clearDriverChargeProfileData: () => void;
  driverChargeProfileLastFetched: Date | null;
}

export function createLookupSources(params: CreateLookupSourcesParams): LookupSourceDisplay[] {
  const {
    isFetchingSpecific,
    setIsFetchingSpecific,
    appIsLoading,
    chassisOwnersData,
    fetchAndStoreChassisOwners,
    clearChassisOwnersData,
    chassisOwnersLastFetched,
    chassisSizesData,
    fetchAndStoreChassisSizes,
    clearChassisSizesData,
    chassisSizesLastFetched,
    chassisTypesData,
    fetchAndStoreChassisTypes,
    clearChassisTypesData,
    chassisTypesLastFetched,
    containerSizesData,
    fetchAndStoreContainerSizes,
    clearContainerSizesData,
    containerSizesLastFetched,
    containerTypesData,
    fetchAndStoreContainerTypes,
    clearContainerTypesData,
    containerTypesLastFetched,
    containerOwnersData,
    fetchAndStoreContainerOwners,
    clearContainerOwnersData,
    containerOwnersLastFetched,
    branchesData,
    fetchAndStoreBranches,
    clearBranchesData,
    branchesLastFetched,
    driverProfileTypesData,
    fetchAndStoreDriverProfileTypes,
    clearDriverProfileTypesData,
    driverProfileTypesLastFetched,
    driverProfileTypesRows,
    customerData,
    fetchAndStoreCustomer,
    clearCustomerData,
    customerLastFetched,
    permissionRolesData,
    fetchAndStorePermissionRoles,
    clearPermissionRolesData,
    permissionRolesLastFetched,
    fleetOwnersData,
    fetchAndStoreFleetOwners,
    clearFleetOwnersData,
    fleetOwnersLastFetched,
    customerFleetData,
    fetchAndStoreCustomerFleet,
    clearCustomerFleetData,
    customerFleetLastFetched,
    timezoneListData,
    fetchAndStoreTimezoneList,
    clearTimezoneListData,
    timezoneListLastFetched,
    timezoneListRows,
    commoditiesData,
    fetchAndStoreCommodities,
    clearCommoditiesData,
    commoditiesLastFetched,
    chassisData,
    fetchAndStoreChassis,
    clearChassisData,
    chassisLastFetched,
    trucksData,
    fetchAndStoreTrucks,
    clearTrucksData,
    trucksLastFetched,
    currenciesData,
    fetchAndStoreCurrencies,
    clearCurrenciesData,
    currenciesLastFetched,
    chargeCodesData,
    fetchAndStoreChargeCodes,
    clearChargeCodesData,
    chargeCodesLastFetched,
    driverPayGroupsData,
    fetchAndStoreDriverPayGroups,
    clearDriverPayGroupsData,
    driverPayGroupsLastFetched,
    cityGroupsData,
    fetchAndStoreCityGroups,
    clearCityGroupsData,
    cityGroupsLastFetched,
    zipCodeGroupsData,
    fetchAndStoreZipCodeGroups,
    clearZipCodeGroupsData,
    zipCodeGroupsLastFetched,
    CSRData,
    fetchAndStoreCSR,
    clearCSRData,
    CSRLastFetched,
    driverGroupsData,
    fetchAndStoreDriverGroups,
    clearDriverGroupsData,
    driverGroupsLastFetched,
    carrierGroupsData,
    fetchAndStoreCarrierGroups,
    clearCarrierGroupsData,
    carrierGroupsLastFetched,
    chargeProfileData,
    fetchAndStoreChargeProfile,
    clearChargeProfileData,
    chargeProfileLastFetched,
    driverChargeProfileData,
    fetchAndStoreDriverChargeProfile,
    clearDriverChargeProfileData,
    driverChargeProfileLastFetched,
  } = params;

  return [
    {
      id: 'chassisOwners',
      name: 'Chassis Owners',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, chassisOwners: true }));
        try {
          await fetchAndStoreChassisOwners();
        } catch (error) {
          console.error('Error fetching Chassis Owners:', error);
        } finally {
          setIsFetchingSpecific(prev => ({ ...prev, chassisOwners: false }));
        }
      },
      clearAction: clearChassisOwnersData,
      getData: () => chassisOwnersData,
      getLastFetched: () => chassisOwnersLastFetched,
      isFetchingData: isFetchingSpecific['chassisOwners'] || (appIsLoading && !chassisOwnersData && !chassisOwnersLastFetched),
    },
    {
      id: 'chassisSizes',
      name: 'Chassis Sizes',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, chassisSizes: true }));
        try {
          await fetchAndStoreChassisSizes();
        } catch (error) {
          console.error('Error fetching Chassis Sizes:', error);
        } finally {
          setIsFetchingSpecific(prev => ({ ...prev, chassisSizes: false }));
        }
      },
      clearAction: clearChassisSizesData,
      getData: () => chassisSizesData,
      getLastFetched: () => chassisSizesLastFetched,
      isFetchingData: isFetchingSpecific['chassisSizes'] || (appIsLoading && !chassisSizesData && !chassisSizesLastFetched),
    },
    {
      id: 'chassisTypes',
      name: 'Chassis Types',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, chassisTypes: true }));
        try {
          await fetchAndStoreChassisTypes();
        } catch (error) {
          console.error('Error fetching Chassis Types:', error);
        } finally {
          setIsFetchingSpecific(prev => ({ ...prev, chassisTypes: false }));
        }
      },
      clearAction: clearChassisTypesData,
      getData: () => chassisTypesData,
      getLastFetched: () => chassisTypesLastFetched,
      isFetchingData: isFetchingSpecific['chassisTypes'] || (appIsLoading && !chassisTypesData && !chassisTypesLastFetched),
    },
    {
      id: 'containerSizes',
      name: 'Container Sizes',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, containerSizes: true }));
        try {
          await fetchAndStoreContainerSizes();
        } catch (error) {
          console.error('Error fetching Container Sizes:', error);
        } finally {
          setIsFetchingSpecific(prev => ({ ...prev, containerSizes: false }));
        }
      },
      clearAction: clearContainerSizesData,
      getData: () => containerSizesData,
      getLastFetched: () => containerSizesLastFetched,
      isFetchingData: isFetchingSpecific['containerSizes'] || (appIsLoading && !containerSizesData && !containerSizesLastFetched),
    },
    {
      id: 'containerTypes',
      name: 'Container Types',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, containerTypes: true }));
        try {
          await fetchAndStoreContainerTypes();
        } catch (error) {
          console.error('Error fetching Container Types:', error);
        } finally {
          setIsFetchingSpecific(prev => ({ ...prev, containerTypes: false }));
        }
      },
      clearAction: clearContainerTypesData,
      getData: () => containerTypesData,
      getLastFetched: () => containerTypesLastFetched,
      isFetchingData: isFetchingSpecific['containerTypes'] || (appIsLoading && !containerTypesData && !containerTypesLastFetched),
    },
    {
      id: 'containerOwners',
      name: 'Container Owners',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, containerOwners: true }));
        try {
          await fetchAndStoreContainerOwners();
        } catch (error) {
          console.error('Error fetching Container Owners:', error);
        } finally {
          setIsFetchingSpecific(prev => ({ ...prev, containerOwners: false }));
        }
      },
      clearAction: clearContainerOwnersData,
      getData: () => containerOwnersData,
      getLastFetched: () => containerOwnersLastFetched,
      isFetchingData: isFetchingSpecific['containerOwners'] || (appIsLoading && !containerOwnersData && !containerOwnersLastFetched),
    },
    {
      id: 'branches',
      name: 'Branches',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, branches: true }));
        try {
          await fetchAndStoreBranches();
        } catch (error) {
          console.error('Error fetching Branches:', error);
        } finally {
          setIsFetchingSpecific(prev => ({ ...prev, branches: false }));
        }
      },
      clearAction: clearBranchesData,
      getData: () => branchesData,
      getLastFetched: () => branchesLastFetched,
      isFetchingData: isFetchingSpecific['branches'] || (appIsLoading && !branchesData && !branchesLastFetched),
    },
    {
      id: 'driverProfileTypes',
      name: 'Driver Profile Types',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, driverProfileTypes: true }));
        try {
          await fetchAndStoreDriverProfileTypes();
        } catch (error) {
          console.error('Error fetching Driver Profile Types:', error);
        } finally {
          setIsFetchingSpecific(prev => ({ ...prev, driverProfileTypes: false }));
        }
      },
      clearAction: clearDriverProfileTypesData,
      getData: () => driverProfileTypesRows,
      getLastFetched: () => driverProfileTypesLastFetched,
      isFetchingData: isFetchingSpecific['driverProfileTypes'] || (appIsLoading && !driverProfileTypesData && !driverProfileTypesLastFetched),
    },
    {
      id: 'tmsCustomers',
      name: 'Customers',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, customer: true }));
        try {
          await fetchAndStoreCustomer();
        } catch (error) {
          console.error('Error fetching TMS Customers:', error);
        } finally {
          setIsFetchingSpecific(prev => ({ ...prev, customer: false }));
        }
      },
      clearAction: clearCustomerData,
      getData: () => customerData,
      getLastFetched: () => customerLastFetched,
      isFetchingData: isFetchingSpecific['customer'] || (appIsLoading && !customerData && !customerLastFetched),
    },
    {
      id: 'getAllPermissionRoles',
      name: 'Permission Roles',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, permissions: true }));
        try {
          await fetchAndStorePermissionRoles();
        } catch (error) {
          console.error('Error fetching Permission Roles:', error);
        } finally {
          setIsFetchingSpecific(prev => ({ ...prev, permissions: false }));
        }
      },
      clearAction: clearPermissionRolesData,
      getData: () => permissionRolesData,
      getLastFetched: () => permissionRolesLastFetched,
      isFetchingData: isFetchingSpecific['permissions'] || (appIsLoading && !permissionRolesData && !permissionRolesLastFetched),
    },
    {
      id: 'fleetOwners',
      name: 'Fleet Owners',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, fleetOwners: true }));
        try {
          await fetchAndStoreFleetOwners();
        } catch (error) {
          console.error('Error fetching Fleet Owners:', error);
        } finally {
          setIsFetchingSpecific(prev => ({ ...prev, fleetOwners: false }));
        }
      },
      clearAction: clearFleetOwnersData,
      getData: () => fleetOwnersData,
      getLastFetched: () => fleetOwnersLastFetched,
      isFetchingData: isFetchingSpecific['fleetOwners'] || (appIsLoading && !fleetOwnersData && !fleetOwnersLastFetched),
    },
    {
      id: 'getTMSFleetCustomers',
      name: 'Fleet Customers',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, customerFleet: true }));
        try {
          await fetchAndStoreCustomerFleet();
        } catch (error) {
          console.error('Error fetching TMS Fleet Customers:', error);
        } finally {
          setIsFetchingSpecific(prev => ({ ...prev, customerFleet: false }));
        }
      },
      clearAction: clearCustomerFleetData,
      getData: () => customerFleetData,
      getLastFetched: () => customerFleetLastFetched,
      isFetchingData: isFetchingSpecific['customerFleet'] || (appIsLoading && !customerFleetData && !customerFleetLastFetched),
    },
    {
      id: 'timezoneList',
      name: 'Timezone List',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, timezoneList: true }));
        try {
          await fetchAndStoreTimezoneList();
        } catch (error) {
          console.error('Error fetching Timezone List:', error);
        } finally {
          setIsFetchingSpecific(prev => ({ ...prev, timezoneList: false }));
        }
      },
      clearAction: clearTimezoneListData,
      getData: () => timezoneListRows,
      getLastFetched: () => timezoneListLastFetched,
      isFetchingData: isFetchingSpecific['timezoneList'] || (appIsLoading && !timezoneListData && !timezoneListLastFetched),
    },
    {
      id: 'commodities',
      name: 'Commodities',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, commodities: true }));
        try {
          await fetchAndStoreCommodities();
        } catch (error) {
          console.error('Error fetching Commodities:', error);
        } finally {
          setIsFetchingSpecific(prev => ({ ...prev, commodities: false }));
        }
      },
      clearAction: clearCommoditiesData,
      getData: () => commoditiesData,
      getLastFetched: () => commoditiesLastFetched,
      isFetchingData: isFetchingSpecific['commodities'] || (appIsLoading && !commoditiesData && !commoditiesLastFetched),
    },
    {
      id: 'chassis',
      name: 'Chassis',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, chassis: true }));
        try {
          await fetchAndStoreChassis();
        } catch (error) {
          console.error('Error fetching Chassis:', error);
        } finally {
          setIsFetchingSpecific(prev => ({ ...prev, chassis: false }));
        }
      },
      clearAction: clearChassisData,
      getData: () => chassisData,
      getLastFetched: () => chassisLastFetched,
      isFetchingData: isFetchingSpecific['chassis'] || (appIsLoading && !chassisData && !chassisLastFetched),
    },
    {
      id: 'trucks',
      name: 'Trucks',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, trucks: true }));
        try {
          await fetchAndStoreTrucks();
        } catch (error) {
          console.error('Error fetching Trucks:', error);
        } finally {
          setIsFetchingSpecific(prev => ({ ...prev, trucks: false }));
        }
      },
      clearAction: clearTrucksData,
      getData: () => trucksData,
      getLastFetched: () => trucksLastFetched,
      isFetchingData: isFetchingSpecific['trucks'] || (appIsLoading && !trucksData && !trucksLastFetched),
    },
    {
      id: 'currencies',
      name: 'Currencies',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, currencies: true }));
        try {
          await fetchAndStoreCurrencies();
        } catch (error) {
          console.error('Error fetching Currencies:', error);
        } finally {
          setIsFetchingSpecific(prev => ({ ...prev, currencies: false }));
        }
      },
      clearAction: clearCurrenciesData,
      getData: () => currenciesData,
      getLastFetched: () => currenciesLastFetched,
      isFetchingData: isFetchingSpecific['currencies'] || (appIsLoading && !currenciesData && !currenciesLastFetched),
    },
    {
      id: 'chargeCodes',
      name: 'Charge Codes',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, chargeCodes: true }));
        await fetchAndStoreChargeCodes();
        setIsFetchingSpecific(prev => ({ ...prev, chargeCodes: false }));
      },
      clearAction: clearChargeCodesData,
      getData: () => chargeCodesData,
      getLastFetched: () => chargeCodesLastFetched,
      isFetchingData: isFetchingSpecific['chargeCodes'] || (appIsLoading && !chargeCodesData && !chargeCodesLastFetched),
    },
    {
      id: 'driverPayGroups',
      name: 'Driver Pay Groups',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, driverPayGroups: true }));
        try {
          await fetchAndStoreDriverPayGroups();
        } catch (error) {
          console.error('Error fetching Driver Pay Groups:', error);
        } finally {
          setIsFetchingSpecific(prev => ({ ...prev, driverPayGroups: false }));
        }
      },
      clearAction: clearDriverPayGroupsData,
      getData: () => driverPayGroupsData,
      getLastFetched: () => driverPayGroupsLastFetched,
      isFetchingData: isFetchingSpecific['driverPayGroups'] || (appIsLoading && !driverPayGroupsData && !driverPayGroupsLastFetched),
    },
    {
      id: 'cityGroups',
      name: 'City Groups',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, cityGroups: true }));
        try {
          await fetchAndStoreCityGroups();
        } catch (error) {
          console.error('Error fetching City Groups:', error);
        } finally {
          setIsFetchingSpecific(prev => ({ ...prev, cityGroups: false }));
        }
      },
      clearAction: clearCityGroupsData,
      getData: () => cityGroupsData,
      getLastFetched: () => cityGroupsLastFetched,
      isFetchingData: isFetchingSpecific['cityGroups'] || (appIsLoading && !cityGroupsData && !cityGroupsLastFetched),
    },
    {
      id: 'zipCodeGroups',
      name: 'Zip Code Groups',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, zipCodeGroups: true }));
        try {
          await fetchAndStoreZipCodeGroups();
        } catch (error) {
          console.error('Error fetching Zip Code Groups:', error);
        } finally {
          setIsFetchingSpecific(prev => ({ ...prev, zipCodeGroups: false }));
        }
      },
      clearAction: clearZipCodeGroupsData,
      getData: () => zipCodeGroupsData,
      getLastFetched: () => zipCodeGroupsLastFetched,
      isFetchingData: isFetchingSpecific['zipCodeGroups'] || (appIsLoading && !zipCodeGroupsData && !zipCodeGroupsLastFetched),
    },
    {
      id: 'CSR',
      name: 'CSR',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, CSR: true }));
        try {
          await fetchAndStoreCSR();
        } catch (error) {
          console.error('Error fetching CSR:', error);
        } finally {
          setIsFetchingSpecific(prev => ({ ...prev, CSR: false }));
        }
      },
      clearAction: clearCSRData,
      getData: () => CSRData,
      getLastFetched: () => CSRLastFetched,
      isFetchingData: isFetchingSpecific['CSR'] || (appIsLoading && !CSRData && !CSRLastFetched),
    },
    {
      id: 'driverGroups',
      name: 'Driver Groups',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, driverGroups: true }));
        try {
          await fetchAndStoreDriverGroups();
        } catch (error) {
          console.error('Error fetching Driver Groups:', error);
        } finally {
          setIsFetchingSpecific(prev => ({ ...prev, driverGroups: false }));
        }
      },
      clearAction: clearDriverGroupsData,
      getData: () => driverGroupsData,
      getLastFetched: () => driverGroupsLastFetched,
      isFetchingData: isFetchingSpecific['driverGroups'] || (appIsLoading && !driverGroupsData && !driverGroupsLastFetched),
    },
    {
      id: 'carrierGroups',
      name: 'Carrier Groups',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, carrierGroups: true }));
        try {
          await fetchAndStoreCarrierGroups();
        } catch (error) {
          console.error('Error fetching Carrier Groups:', error);
        } finally {
          setIsFetchingSpecific(prev => ({ ...prev, carrierGroups: false }));
        }
      },
      clearAction: clearCarrierGroupsData,
      getData: () => carrierGroupsData,
      getLastFetched: () => carrierGroupsLastFetched,
      isFetchingData: isFetchingSpecific['carrierGroups'] || (appIsLoading && !carrierGroupsData && !carrierGroupsLastFetched),
    },
    {
      id: 'chargeProfile',
      name: 'Charge Profile',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, chargeProfile: true }));
        try {
          await fetchAndStoreChargeProfile();
        } catch (error) {
          console.error('Error fetching Charge Profile:', error);
        } finally {
          setIsFetchingSpecific(prev => ({ ...prev, chargeProfile: false }));
        }
      },
      clearAction: clearChargeProfileData,
      getData: () => chargeProfileData,
      getLastFetched: () => chargeProfileLastFetched,
      isFetchingData: isFetchingSpecific['chargeProfile'] || (appIsLoading && !chargeProfileData && !chargeProfileLastFetched),
    },
    {
      id: 'driverChargeProfile',
      name: 'Driver Charge Profile',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, driverChargeProfile: true }));
        try {
          await fetchAndStoreDriverChargeProfile();
        } catch (error) {
          console.error('Error fetching Driver Charge Profile:', error);
        } finally {
          setIsFetchingSpecific(prev => ({ ...prev, driverChargeProfile: false }));
        }
      },
      clearAction: clearDriverChargeProfileData,
      getData: () => driverChargeProfileData,
      getLastFetched: () => driverChargeProfileLastFetched,
      isFetchingData: isFetchingSpecific['driverChargeProfile'] || (appIsLoading && !driverChargeProfileData && !driverChargeProfileLastFetched),
    },
  ];
} 