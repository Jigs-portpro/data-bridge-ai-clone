"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAppContext } from '@/hooks/useAppContext';
import { DownloadCloud, Trash2, Loader2, Eye, DatabaseZap, Info, RefreshCw, FileJson } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';
import { createLookupSources, LookupSourceDisplay } from '@/utils/lookupSources';
import { transformCustomerType, getCustomerTypeLabels } from '@/utils/helpers';
import { Badge } from '@/components/ui/badge';

export default function LookupsPage() {
  const appContext = useAppContext();
  const { 
    isLoading: appIsLoading, // Global loading state
    isAuthenticated,
    isAuthLoading,
    // Chassis Owners
    chassisOwnersData, 
    fetchAndStoreChassisOwners, 
    clearChassisOwnersData, 
    chassisOwnersLastFetched,
    // Chassis Sizes
    chassisSizesData,
    fetchAndStoreChassisSizes,
    clearChassisSizesData,
    chassisSizesLastFetched,
    // Chassis Types
    chassisTypesData,
    fetchAndStoreChassisTypes,
    clearChassisTypesData,
    chassisTypesLastFetched,
    // Container Sizes
    containerSizesData,
    fetchAndStoreContainerSizes,
    clearContainerSizesData,
    containerSizesLastFetched,
    // Container Types
    containerTypesData,
    fetchAndStoreContainerTypes,
    clearContainerTypesData,
    containerTypesLastFetched,
    // Container Owners
    containerOwnersData,
    fetchAndStoreContainerOwners,
    clearContainerOwnersData,
    containerOwnersLastFetched,
    // Branches
    branchesData,
    fetchAndStoreBranches,
    clearBranchesData,
    branchesLastFetched,
    // Driver Profile Types
    driverProfileTypesData,
    fetchAndStoreDriverProfileTypes,
    clearDriverProfileTypesData,
    driverProfileTypesLastFetched,
    // Customer
    customerData,
    fetchAndStoreCustomer,
    clearCustomerData,
    customerLastFetched,
    // Permissions
    permissionRolesData,
    clearPermissionRolesData,
    fetchAndStorePermissionRoles,
    permissionRolesLastFetched,
    // Fleet Owners
    fleetOwnersData,
    fetchAndStoreFleetOwners,
    clearFleetOwnersData,
    fleetOwnersLastFetched,
    // TMS Fleet Customers
    customerFleetData,
    fetchAndStoreCustomerFleet,
    clearCustomerFleetData,
    customerFleetLastFetched,
    // Timezone List
    timezoneListData,
    fetchAndStoreTimezoneList,
    clearTimezoneListData,
    timezoneListLastFetched,
    // Commodities
    commoditiesData,
    fetchAndStoreCommodities,
    clearCommoditiesData,
    commoditiesLastFetched,
    // Chassis
    chassisData,
    fetchAndStoreChassis,
    clearChassisData,
    chassisLastFetched,
    // Trucks
    trucksData,
    fetchAndStoreTrucks,
    clearTrucksData,
    trucksLastFetched,
    // Currencies
    currenciesData,
    fetchAndStoreCurrencies,
    clearCurrenciesData,
    currenciesLastFetched,
    // Charge Codes
    chargeCodesData,
    fetchAndStoreChargeCodes,
    clearChargeCodesData,
    chargeCodesLastFetched,
    // Driver Pay Groups
    driverPayGroupsData,
    fetchAndStoreDriverPayGroups,
    clearDriverPayGroupsData,
    driverPayGroupsLastFetched,
    // City Groups
    cityGroupsData,
    fetchAndStoreCityGroups,
    clearCityGroupsData,
    cityGroupsLastFetched,
    // Zip Code Groups
    zipCodeGroupsData,
    fetchAndStoreZipCodeGroups,
    clearZipCodeGroupsData,
    zipCodeGroupsLastFetched,
    // CSR
    CSRData,
    fetchAndStoreCSR,
    clearCSRData,
    CSRLastFetched,
    // Driver Groups
    driverGroupsData,
    fetchAndStoreDriverGroups,
    clearDriverGroupsData,
    driverGroupsLastFetched,
    // Carrier Groups
    carrierGroupsData,
    fetchAndStoreCarrierGroups,
    clearCarrierGroupsData,
    carrierGroupsLastFetched,
    // Charge Profile
    chargeProfileData,
    fetchAndStoreChargeProfile,
    clearChargeProfileData,
    chargeProfileLastFetched,
    // Driver Charge Profile
    driverChargeProfileData,
    fetchAndStoreDriverChargeProfile,
    clearDriverChargeProfileData,
    driverChargeProfileLastFetched,
  } = appContext;

  const [dataForViewing, setDataForViewing] = useState<{ name: string; data: any[]; columns: string[] } | null>(null);
  const [isFetchingSpecific, setIsFetchingSpecific] = useState<Record<string, boolean>>({});
  // Pagination state for chargeProfileData
  const [displayedChargeProfileCount, setDisplayedChargeProfileCount] = useState(15);
  const [isLoadingMoreChargeProfiles, setIsLoadingMoreChargeProfiles] = useState(false);
  // Loading state for driver charge profile API calls
  const [isLoadingMoreDriverChargeProfiles, setIsLoadingMoreDriverChargeProfiles] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  // Add state for search term
  const [searchTerm, setSearchTerm] = useState("");
  const [driverChargeProfileSearchTerm, setDriverChargeProfileSearchTerm] = useState("");

  // Reset pagination when dialog closes
  useEffect(() => {
    if (!dataForViewing) {
      setDisplayedChargeProfileCount(15);
    }
  }, [dataForViewing]);

  // Handle scroll for chargeProfileData pagination
  const handleChargeProfileScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    if (!dataForViewing || dataForViewing.name !== 'Charge Profile') return;
    
    const target = event.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = target;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 50;
    
    if (
      isNearBottom &&
      !isLoadingMoreChargeProfiles &&
      displayedChargeProfileCount < dataForViewing.data.length
    ) {
      setIsLoadingMoreChargeProfiles(true);
      
      // Simulate loading delay
      setTimeout(() => {
        setDisplayedChargeProfileCount((prev) => {
          const nextCount = prev + 15;
          const newCount = Math.min(nextCount, dataForViewing.data.length);
          return newCount;
        });
        
        setTimeout(() => {
          setIsLoadingMoreChargeProfiles(false);
        }, 800);
      }, 1000);
    }
  }, [dataForViewing, displayedChargeProfileCount, isLoadingMoreChargeProfiles]);

  // Handle scroll for driverChargeProfileData pagination
  const handleDriverChargeProfileScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    if (!dataForViewing || dataForViewing.name !== 'Driver Charge Profile') return;
    
    const target = event.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = target;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 50;
    
    if (
      isNearBottom &&
      !isLoadingMoreDriverChargeProfiles &&
      !appIsLoading
    ) {
      setIsLoadingMoreDriverChargeProfiles(true);
      
      // Delay to show loading state
      setTimeout(() => {
        fetchAndStoreDriverChargeProfile(true)
          .then(() => {
            // Successfully loaded more data
          })
          .catch((error) => {
            console.error('Error loading more driver charge profiles:', error);
          })
          .finally(() => {
            setIsLoadingMoreDriverChargeProfiles(false);
          });
      }, 1500);
    }
  }, [dataForViewing, isLoadingMoreDriverChargeProfiles, appIsLoading, fetchAndStoreDriverChargeProfile]);

  // Memoize the mapped driver profile types rows to avoid infinite render loop
  const driverProfileTypesRows = React.useMemo(
    () => driverProfileTypesData ? driverProfileTypesData.map(type => ({ type })) : null,
    [driverProfileTypesData]
  );

  const timezoneListRows = React.useMemo(
    () => timezoneListData ? timezoneListData.map(type => ({ type })) : null,
    [timezoneListData]
  );

  // Create lookup sources using the shared utility
  const lookupSources: LookupSourceDisplay[] = React.useMemo(() => {
    return createLookupSources({
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
    });
  }, [
    isFetchingSpecific,
    appIsLoading,
    chassisOwnersData,
    chassisOwnersLastFetched,
    chassisSizesData,
    chassisSizesLastFetched,
    chassisTypesData,
    chassisTypesLastFetched,
    containerSizesData,
    containerSizesLastFetched,
    containerTypesData,
    containerTypesLastFetched,
    containerOwnersData,
    containerOwnersLastFetched,
    branchesData,
    branchesLastFetched,
    driverProfileTypesRows,
    driverProfileTypesLastFetched,
    customerData,
    customerLastFetched,
    permissionRolesData,
    permissionRolesLastFetched,
    fleetOwnersData,
    fleetOwnersLastFetched,
    customerFleetData,
    customerFleetLastFetched,
    timezoneListRows,
    timezoneListLastFetched,
    commoditiesData,
    commoditiesLastFetched,
    chassisData,
    chassisLastFetched,
    trucksData,
    trucksLastFetched,
    currenciesData,
    currenciesLastFetched,
    chargeCodesData,
    chargeCodesLastFetched,
    driverPayGroupsData,
    driverPayGroupsLastFetched,
    cityGroupsData,
    cityGroupsLastFetched,
    zipCodeGroupsData,
    zipCodeGroupsLastFetched,
    CSRData,
    CSRLastFetched,
    driverGroupsData,
    driverGroupsLastFetched,
    carrierGroupsData,
    carrierGroupsLastFetched,
    chargeProfileData,
    chargeProfileLastFetched,
    driverChargeProfileData,
    driverChargeProfileLastFetched,
  ]);

  const handleViewData = (source: LookupSourceDisplay) => {
    const data = source.getData();
    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      setDataForViewing({ name: source.name, data, columns });
    } else {
      setDataForViewing(null);
      appContext.showToast({ title: "No Data", description: `No data cached for ${source.name}. Fetch it first.`, variant: "default" });
    }
  };
  
  useEffect(() => {
    if (dataForViewing) {
      const currentSource = lookupSources.find(ls => ls.name === dataForViewing.name);
      if (currentSource) {
        const data = currentSource.getData();
        if (!data || data.length === 0) {
          setDataForViewing(null);
        } else if (data !== dataForViewing.data) { // If data was refreshed
           const columns = data.length > 0 ? Object.keys(data[0]) : [];
           setDataForViewing({ name: currentSource.name, data, columns });
        }
      }
    }
  }, [
      chassisOwnersData, chassisSizesData, chassisTypesData, 
      containerSizesData, containerTypesData, containerOwnersData, 
      branchesData, driverProfileTypesData, customerData, permissionRolesData,
      fleetOwnersData, customerFleetData, timezoneListData, commoditiesData,
      chassisData, trucksData, currenciesData, chargeCodesData,
      driverPayGroupsData, cityGroupsData, zipCodeGroupsData, CSRData,
      driverGroupsData, carrierGroupsData, chargeProfileData,
      driverChargeProfileData, // Add this to watch for driver charge profile data changes
      dataForViewing, 
    ]);

  // Filtered data for Charge Profile
  const filteredChargeProfileData = useMemo(() => {
    if (dataForViewing?.name !== "Charge Profile" || !searchTerm.trim()) return dataForViewing?.data || [];
    const lower = searchTerm.toLowerCase();
    return dataForViewing.data.filter(row =>
      Object.values(row).some(val => String(val).toLowerCase().includes(lower))
    );
  }, [dataForViewing, searchTerm]);

  // Filtered data for Driver Charge Profile
  const filteredDriverChargeProfileData = useMemo(() => {
    if (dataForViewing?.name !== "Driver Charge Profile" || !driverChargeProfileSearchTerm.trim()) return dataForViewing?.data || [];
    const lower = driverChargeProfileSearchTerm.toLowerCase();
    return dataForViewing.data.filter(row =>
      Object.values(row).some(val => String(val).toLowerCase().includes(lower))
    );
  }, [dataForViewing, driverChargeProfileSearchTerm]);

  if (isAuthLoading || !isAuthenticated) {
    return (
      <AppLayout pageTitle="Loading Lookups...">
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Manage Lookup Data">
      <div className="h-full flex flex-col gap-2"> 

          <Alert>
            <DatabaseZap className="h-4 w-4" />
            <AlertTitle>Lookup Data Sources</AlertTitle>
            <AlertDescription className="space-y-1">
              <p>
                Fetch and cache frequently used lookup data from external APIs. This data can be used for validation during the "Export Data" process.
                Data is cached in your browser session.
              </p>
              <p className="flex items-center text-xs">
                <FileJson className="h-3 w-3 mr-1.5 text-muted-foreground"/>
                Use the <strong className="mx-1">Lookup ID</strong> shown in the table below when configuring 
                <code className="bg-muted text-muted-foreground px-1 py-0.5 rounded-sm text-xs mx-1">lookupValidation</code> 
                in your <code className="bg-muted text-muted-foreground px-1 py-0.5 rounded-sm text-xs ml-1">exportEntities.json</code> file.
              </p>
            </AlertDescription>
          </Alert>



          <Card className="h-full flex flex-col flex-1 min-h-0">
            <CardHeader className="flex-shrink-0">
              <CardTitle>Available Lookup Datasets</CardTitle>
              <CardDescription>Manage and view cached lookup data.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
              <ScrollArea className="h-full border rounded-md">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Lookup ID</TableHead>
                    <TableHead className="text-center">Status / Last Fetched</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lookupSources.map((source) => {
                    const data = source.getData();
                    const lastFetched = source.getLastFetched();
                    const isDataPresent = data && data.length > 0;
                    return (
                      <TableRow key={source.id}>
                        <TableCell className="font-medium">{source.name}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1 py-0.5 rounded-sm">{source.id}</code>
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          {source.isFetchingData ? (
                            <span className="flex items-center justify-center text-muted-foreground">
                              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> Fetching...
                            </span>
                          ) : isDataPresent && lastFetched ? (
                            <>
                              {data?.length} records
                              <br />
                              {format(lastFetched, "MMM d, yyyy HH:mm:ss")}
                            </>
                          ) : (
                            "Not Cached"
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                           <Button variant="link" size="sm" className="h-auto p-1 text-xs" onClick={() => source.fetchAction()} disabled={source.isFetchingData || appIsLoading}>
                            {isDataPresent ? <RefreshCw className="mr-1 h-3 w-3"/> : <DownloadCloud className="mr-1 h-3 w-3"/>}
                            {isDataPresent ? 'Refresh' : 'Fetch'}
                          </Button>
                          <Button variant="link" size="sm" className="h-auto p-1 text-xs" onClick={() => handleViewData(source)} disabled={source.isFetchingData || !isDataPresent}>
                            <Eye className="mr-1 h-3 w-3"/>View
                          </Button>
                          <Button variant="link" size="sm" className="h-auto p-1 text-xs text-destructive" onClick={() => { source.clearAction(); if(dataForViewing?.name === source.name) setDataForViewing(null);}} disabled={source.isFetchingData || !isDataPresent}>
                            <Trash2 className="mr-1 h-3 w-3"/>Clear
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>


        <Dialog open={!!dataForViewing} onOpenChange={(open) => !open && setDataForViewing(null)}>
          <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cached Data Viewer: {dataForViewing?.name}</DialogTitle>
              <DialogDescription>
                {dataForViewing?.name === 'Charge Profile' ? (
                  <>
                    Displaying {Math.min(displayedChargeProfileCount, dataForViewing?.data.length || 0)} of {dataForViewing?.data.length || 0} cached records. 
                    {dataForViewing?.data.length > 15 && ' Scroll down to load more.'}
                  </>
                ) : dataForViewing?.name === 'Driver Charge Profile' ? (
                  <>
                    Displaying {dataForViewing?.data.length || 0} cached records. 
                    Scroll down to load more from API.
                  </>
                ) : (
                  `Displaying ${dataForViewing?.data.length || 0} cached records. Columns are dynamically generated.`
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              {dataForViewing && dataForViewing.data.length > 0 ? (
                <div 
                  className="rounded-md border shadow-sm w-full h-[60vh] bg-card overflow-auto"
                  onScroll={
                    dataForViewing.name === 'Charge Profile' ? handleChargeProfileScroll : 
                    dataForViewing.name === 'Driver Charge Profile' ? handleDriverChargeProfileScroll : 
                    undefined
                  }
                  ref={scrollAreaRef}
                >
                  {dataForViewing?.name === 'Charge Profile' && (
                    <div className="mt-2 mb-2 flex items-center justify-end gap-2">
                      <label htmlFor="charge-profile-search" className="text-sm font-medium text-muted-foreground">Search:</label>
                      <input
                        id="charge-profile-search"
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search charge profiles..."
                        className="border rounded px-2 py-1 w-64 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        autoFocus
                      />
                    </div>
                  )}
                  {dataForViewing?.name === 'Driver Charge Profile' && (
                    <div className="mt-2 mb-2 flex items-center justify-end gap-2">
                      <label htmlFor="driver-charge-profile-search" className="text-sm font-medium text-muted-foreground">Search:</label>
                      <input
                        id="driver-charge-profile-search"
                        type="text"
                        value={driverChargeProfileSearchTerm}
                        onChange={e => setDriverChargeProfileSearchTerm(e.target.value)}
                        placeholder="Search driver charge profiles..."
                        className="border rounded px-2 py-1 w-64 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        autoFocus
                      />
                    </div>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {dataForViewing.columns.map((col) => (
                          <TableHead key={col} className="font-semibold whitespace-nowrap">{col}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(dataForViewing.name === 'Charge Profile'
                        ? filteredChargeProfileData.slice(0, displayedChargeProfileCount)
                        : dataForViewing.name === 'Driver Charge Profile'
                        ? filteredDriverChargeProfileData
                        : dataForViewing.data
                      ).map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {dataForViewing.columns.map((col) => (
                            <TableCell key={`${rowIndex}-${col}`} className="whitespace-nowrap text-xs">
                              {col.toLowerCase() === 'customertype' 
                                ? (
                                    <div className="flex flex-wrap gap-1">
                                      {getCustomerTypeLabels(row[col]).map(label => (
                                        <Badge key={label} variant="secondary">{label}</Badge>
                                      ))}
                                    </div>
                                  )
                                : typeof row[col] === 'boolean' 
                                  ? String(row[col]) 
                                  : typeof row[col] === 'object' 
                                    ? JSON.stringify(row[col]) 
                                    : (row[col] ?? '')
                              }
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                      {/* Loading row for charge profile pagination */}
                      {dataForViewing.name === 'Charge Profile' && isLoadingMoreChargeProfiles && (
                        <TableRow>
                          <TableCell colSpan={dataForViewing.columns.length} className="text-center py-4">
                            <div className="flex items-center justify-center">
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              <span className="text-sm text-muted-foreground">Loading more charge profiles...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      {/* Loading row for driver charge profile pagination */}
                      {dataForViewing.name === 'Driver Charge Profile' && isLoadingMoreDriverChargeProfiles && (
                        <TableRow>
                          <TableCell colSpan={dataForViewing.columns.length} className="text-center py-4">
                            <div className="flex items-center justify-center">
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              <span className="text-sm text-muted-foreground">Loading more driver charge profiles...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      {dataForViewing.name === 'Charge Profile' && filteredChargeProfileData.length === 0 && !isLoadingMoreChargeProfiles && (
                        <TableRow>
                          <TableCell colSpan={dataForViewing.columns.length} className="text-center py-8 text-muted-foreground">
                            No charge profiles found.
                          </TableCell>
                        </TableRow>
                      )}
                      {dataForViewing.name === 'Driver Charge Profile' && filteredDriverChargeProfileData.length === 0 && !isLoadingMoreDriverChargeProfiles && (
                        <TableRow>
                          <TableCell colSpan={dataForViewing.columns.length} className="text-center py-8 text-muted-foreground">
                            No driver charge profiles found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 border rounded-lg bg-muted/30 text-center p-6">
                  <Info className="h-8 w-8 text-muted-foreground mb-2"/>
                  <p className="text-sm text-muted-foreground">No data to display for {dataForViewing?.name}.</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
        {!dataForViewing && !appIsLoading && (
          <div className="mb-1 text-center text-sm text-muted-foreground">
            Click "View" on a lookup source to see its cached data here.
          </div>
        )}
      </div>
    </AppLayout>
  );
}

