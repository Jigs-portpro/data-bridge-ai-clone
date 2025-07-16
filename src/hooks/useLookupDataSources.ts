import { useAppContext } from '@/hooks/useAppContext';

export const useLookupDataSources = () => {
  const {
    chassisOwnersData,
    chassisSizesData,
    chassisTypesData,
    branchesData,
    customerData,
    driverGroupsData,
    carrierGroupsData,
    chargeProfileData,
    containerSizesData,
    containerTypesData,
    containerOwnersData,
    commoditiesData,
    chassisData,
    driverProfileTypesData,
    permissionRolesData,
    fleetOwnersData,
    timezoneListData,
    trucksData,
    currenciesData,
    chargeCodesData,
    driverPayGroupsData,
    cityGroupsData,
    zipCodeGroupsData,
    CSRData,
    driverChargeProfileData,
    customerFleetData,
    fetchAndStoreChassisOwners,
    fetchAndStoreChassisSizes,
    fetchAndStoreChassisTypes,
    fetchAndStoreBranches,
    fetchAndStoreCustomer,
    fetchAndStoreContainerSizes,
    fetchAndStoreContainerTypes,
    fetchAndStoreContainerOwners,
    fetchAndStoreCommodities,
    fetchAndStoreChassis,
    fetchAndStoreDriverProfileTypes,
    fetchAndStoreFleetOwners,
    fetchAndStoreTimezoneList,
    fetchAndStoreTrucks,
    fetchAndStoreCurrencies,
    fetchAndStoreChargeCodes,
    fetchAndStoreDriverPayGroups,
    fetchAndStoreCityGroups,
    fetchAndStoreZipCodeGroups,
    fetchAndStoreCSR,
    fetchAndStoreChargeProfile,
    fetchAndStoreDriverChargeProfile,
    fetchAndStoreCustomerFleet,
    fetchAndStoreDriverGroups,
    fetchAndStoreCarrierGroups
  } = useAppContext();

  // Complete lookup data sources mapping
  const lookupDataSources: Record<
    string,
    {
      getData: () => any[] | null;
      field: string;
      name: string;
      fetchFunction?: () => Promise<void>;
    }
  > = {
    chassisOwners: {
      getData: () => chassisOwnersData,
      field: "company_name",
      name: "Chassis Owners",
      fetchFunction: fetchAndStoreChassisOwners,
    },
    chassisSizes: {
      getData: () => chassisSizesData,
      field: "name",
      name: "Chassis Sizes",
      fetchFunction: fetchAndStoreChassisSizes,
    },
    chassisTypes: {
      getData: () => chassisTypesData,
      field: "name",
      name: "Chassis Types",
      fetchFunction: fetchAndStoreChassisTypes,
    },
    driverProfileTypes: {
      getData: () =>
        driverProfileTypesData
          ? driverProfileTypesData.map((type) => ({ type }))
          : null,
      field: "type",
      name: "Driver Profile Types",
      fetchFunction: fetchAndStoreDriverProfileTypes,
    },
    branches: {
      getData: () => branchesData,
      field: "name",
      name: "Branches",
      fetchFunction: fetchAndStoreBranches,
    },
    tmsCustomers: {
      getData: () => customerData,
      field: "company_name",
      name: "TMS Customers",
      fetchFunction: fetchAndStoreCustomer,
    },
    getAllPermissionRoles: {
      getData: () => permissionRolesData,
      field: "roleName",
      name: "Permission Roles",
    },
    fleetOwners: {
      getData: () => fleetOwnersData,
      field: "company_name",
      name: "Fleet Owners",
      fetchFunction: fetchAndStoreFleetOwners,
    },
    getTMSFleetCustomers: {
      getData: () => customerFleetData,
      field: "company_name",
      name: "Customer Fleet",
      fetchFunction: fetchAndStoreCustomerFleet,
    },
    timezoneList: {
      getData: () =>
        timezoneListData ? timezoneListData.map((type) => ({ type })) : null,
      field: "type",
      name: "Timezone List",
      fetchFunction: fetchAndStoreTimezoneList,
    },
    commodities: {
      getData: () => commoditiesData,
      field: "name",
      name: "Commodities",
      fetchFunction: fetchAndStoreCommodities,
    },
    chassis: {
      getData: () => chassisData,
      field: "chassisNo",
      name: "chassisNo",
      fetchFunction: fetchAndStoreChassis,
    },
    trucks: {
      getData: () => trucksData,
      field: "equipmentID",
      name: "Truck Number",
      fetchFunction: fetchAndStoreTrucks,
    },
    currencies: {
      getData: () => currenciesData,
      field: "currencyCode",
      name: "Currencies",
      fetchFunction: fetchAndStoreCurrencies,
    },
    chargeCodes: {
      getData: () => chargeCodesData,
      field: "value",
      name: "chargeCodes",
      fetchFunction: fetchAndStoreChargeCodes,
    },
    containerSizes: {
      getData: () => containerSizesData,
      field: "name",
      name: "Container Sizes",
      fetchFunction: fetchAndStoreContainerSizes,
    },
    containerTypes: {
      getData: () => containerTypesData,
      field: "name",
      name: "Container Types",
      fetchFunction: fetchAndStoreContainerTypes,
    },
    containerOwners: {
      getData: () => containerOwnersData,
      field: "company_name",
      name: "Container Owners",
      fetchFunction: fetchAndStoreContainerOwners,
    },
    driverPayGroups: {
      getData: () => driverPayGroupsData,
      field: "name",
      name: "Driver Pay Groups",
      fetchFunction: fetchAndStoreDriverPayGroups,
    },
    cityGroups: {
      getData: () => cityGroupsData,
      field: "name",
      name: "City Groups",
      fetchFunction: fetchAndStoreCityGroups,
    },
    zipCodeGroups: {
      getData: () => zipCodeGroupsData,
      field: "name",
      name: "Zip Code Groups",
      fetchFunction: fetchAndStoreZipCodeGroups,
    },
    CSR: {
      getData: () => CSRData,
      field: "name",
      name: "CSR",
      fetchFunction: fetchAndStoreCSR,
    },
    driverGroups: {
      getData: () => driverGroupsData,
      field: "name",
      name: "Driver Groups",
      fetchFunction: fetchAndStoreDriverGroups,
    },
    carrierGroups: {
      getData: () => carrierGroupsData,
      field: "name",
      name: "Carrier Groups",
      fetchFunction: fetchAndStoreCarrierGroups,
    },
    chargeProfile: {
      getData: () => chargeProfileData,
      field: "name",
      name: "Charge Profile",
      fetchFunction: fetchAndStoreChargeProfile,
    },
    driverChargeProfile: {
      getData: () => driverChargeProfileData,
      field: "name",
      name: "Driver Charge Profile",
      fetchFunction: fetchAndStoreDriverChargeProfile,
    },
  };

  return lookupDataSources;
}; 