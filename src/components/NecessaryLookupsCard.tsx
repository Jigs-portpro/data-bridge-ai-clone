"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAppContext } from '@/hooks/useAppContext';
import { DownloadCloud, Trash2, Loader2, Eye, DatabaseZap, Info, RefreshCw, AlertCircle } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface LookupSourceDisplay {
  id: string;
  name: string;
  fetchAction: () => Promise<void>;
  clearAction: () => void;
  getData: () => any[] | null;
  getLastFetched: () => Date | null;
  isFetchingData: boolean;
  relevantColumns: string[];
  matchReason: string;
}

interface NecessaryLookupsCardProps {
  className?: string;
}

export function NecessaryLookupsCard({ className }: NecessaryLookupsCardProps) {
  const appContext = useAppContext();
  const { 
    data,
    columns,
    fileName,
    isLoading: appIsLoading,
    // Lookup data and functions
    chassisOwnersData, fetchAndStoreChassisOwners, clearChassisOwnersData, chassisOwnersLastFetched,
    chassisSizesData, fetchAndStoreChassisSizes, clearChassisSizesData, chassisSizesLastFetched,
    chassisTypesData, fetchAndStoreChassisTypes, clearChassisTypesData, chassisTypesLastFetched,
    containerSizesData, fetchAndStoreContainerSizes, clearContainerSizesData, containerSizesLastFetched,
    containerTypesData, fetchAndStoreContainerTypes, clearContainerTypesData, containerTypesLastFetched,
    containerOwnersData, fetchAndStoreContainerOwners, clearContainerOwnersData, containerOwnersLastFetched,
    branchesData, fetchAndStoreBranches, clearBranchesData, branchesLastFetched,
    driverProfileTypesData, fetchAndStoreDriverProfileTypes, clearDriverProfileTypesData, driverProfileTypesLastFetched,
    customerData, fetchAndStoreCustomer, clearCustomerData, customerLastFetched,
    permissionRolesData, fetchAndStorePermissionRoles, clearPermissionRolesData, permissionRolesLastFetched,
    fleetOwnersData, fetchAndStoreFleetOwners, clearFleetOwnersData, fleetOwnersLastFetched,
    customerFleetData, fetchAndStoreCustomerFleet, clearCustomerFleetData, customerFleetLastFetched,
    timezoneListData, fetchAndStoreTimezoneList, clearTimezoneListData, timezoneListLastFetched,
    commoditiesData, fetchAndStoreCommodities, clearCommoditiesData, commoditiesLastFetched,
    chassisData, fetchAndStoreChassis, clearChassisData, chassisLastFetched,
    trucksData, fetchAndStoreTrucks, clearTrucksData, trucksLastFetched,
    currenciesData, fetchAndStoreCurrencies, clearCurrenciesData, currenciesLastFetched,
  } = appContext;

  const [dataForViewing, setDataForViewing] = useState<{ name: string; data: any[]; columns: string[] } | null>(null);
  const [isFetchingSpecific, setIsFetchingSpecific] = useState<Record<string, boolean>>({});

  // Memoize the mapped driver profile types and timezone list rows
  const driverProfileTypesRows = useMemo(
    () => driverProfileTypesData ? driverProfileTypesData.map(type => ({ type })) : null,
    [driverProfileTypesData]
  );

  const timezoneListRows = useMemo(
    () => timezoneListData ? timezoneListData.map(type => ({ type })) : null,
    [timezoneListData]
  );

  // Define all available lookup sources
  const allLookupSources: LookupSourceDisplay[] = useMemo(() => [
    {
      id: 'chassisOwners',
      name: 'Chassis Owners',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, chassisOwners: true }));
        await fetchAndStoreChassisOwners();
        setIsFetchingSpecific(prev => ({ ...prev, chassisOwners: false }));
      },
      clearAction: clearChassisOwnersData,
      getData: () => chassisOwnersData,
      getLastFetched: () => chassisOwnersLastFetched,
      isFetchingData: isFetchingSpecific['chassisOwners'] || (appIsLoading && !chassisOwnersData && !chassisOwnersLastFetched),
      relevantColumns: [],
      matchReason: ''
    },
    {
      id: 'chassisSizes',
      name: 'Chassis Sizes',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, chassisSizes: true }));
        await fetchAndStoreChassisSizes();
        setIsFetchingSpecific(prev => ({ ...prev, chassisSizes: false }));
      },
      clearAction: clearChassisSizesData,
      getData: () => chassisSizesData,
      getLastFetched: () => chassisSizesLastFetched,
      isFetchingData: isFetchingSpecific['chassisSizes'] || (appIsLoading && !chassisSizesData && !chassisSizesLastFetched),
      relevantColumns: [],
      matchReason: ''
    },
    {
      id: 'chassisTypes',
      name: 'Chassis Types',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, chassisTypes: true }));
        await fetchAndStoreChassisTypes();
        setIsFetchingSpecific(prev => ({ ...prev, chassisTypes: false }));
      },
      clearAction: clearChassisTypesData,
      getData: () => chassisTypesData,
      getLastFetched: () => chassisTypesLastFetched,
      isFetchingData: isFetchingSpecific['chassisTypes'] || (appIsLoading && !chassisTypesData && !chassisTypesLastFetched),
      relevantColumns: [],
      matchReason: ''
    },
    {
      id: 'containerSizes',
      name: 'Container Sizes',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, containerSizes: true }));
        await fetchAndStoreContainerSizes();
        setIsFetchingSpecific(prev => ({ ...prev, containerSizes: false }));
      },
      clearAction: clearContainerSizesData,
      getData: () => containerSizesData,
      getLastFetched: () => containerSizesLastFetched,
      isFetchingData: isFetchingSpecific['containerSizes'] || (appIsLoading && !containerSizesData && !containerSizesLastFetched),
      relevantColumns: [],
      matchReason: ''
    },
    {
      id: 'containerTypes',
      name: 'Container Types',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, containerTypes: true }));
        await fetchAndStoreContainerTypes();
        setIsFetchingSpecific(prev => ({ ...prev, containerTypes: false }));
      },
      clearAction: clearContainerTypesData,
      getData: () => containerTypesData,
      getLastFetched: () => containerTypesLastFetched,
      isFetchingData: isFetchingSpecific['containerTypes'] || (appIsLoading && !containerTypesData && !containerTypesLastFetched),
      relevantColumns: [],
      matchReason: ''
    },
    {
      id: 'containerOwners',
      name: 'Container Owners',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, containerOwners: true }));
        await fetchAndStoreContainerOwners();
        setIsFetchingSpecific(prev => ({ ...prev, containerOwners: false }));
      },
      clearAction: clearContainerOwnersData,
      getData: () => containerOwnersData,
      getLastFetched: () => containerOwnersLastFetched,
      isFetchingData: isFetchingSpecific['containerOwners'] || (appIsLoading && !containerOwnersData && !containerOwnersLastFetched),
      relevantColumns: [],
      matchReason: ''
    },
    {
      id: 'branches',
      name: 'Branches',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, branches: true }));
        await fetchAndStoreBranches();
        setIsFetchingSpecific(prev => ({ ...prev, branches: false }));
      },
      clearAction: clearBranchesData,
      getData: () => branchesData,
      getLastFetched: () => branchesLastFetched,
      isFetchingData: isFetchingSpecific['branches'] || (appIsLoading && !branchesData && !branchesLastFetched),
      relevantColumns: [],
      matchReason: ''
    },
    {
      id: 'driverProfileTypes',
      name: 'Driver Profile Types',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, driverProfileTypes: true }));
        await fetchAndStoreDriverProfileTypes();
        setIsFetchingSpecific(prev => ({ ...prev, driverProfileTypes: false }));
      },
      clearAction: clearDriverProfileTypesData,
      getData: () => driverProfileTypesRows,
      getLastFetched: () => driverProfileTypesLastFetched,
      isFetchingData: isFetchingSpecific['driverProfileTypes'] || (appIsLoading && !driverProfileTypesData && !driverProfileTypesLastFetched),
      relevantColumns: [],
      matchReason: ''
    },
    {
      id: 'tmsCustomers',
      name: 'Customers',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, customer: true }));
        await fetchAndStoreCustomer();
        setIsFetchingSpecific(prev => ({ ...prev, customer: false }));
      },
      clearAction: clearCustomerData,
      getData: () => customerData,
      getLastFetched: () => customerLastFetched,
      isFetchingData: isFetchingSpecific['customer'] || (appIsLoading && !customerData && !customerLastFetched),
      relevantColumns: [],
      matchReason: ''
    },
    {
      id: 'getAllPermissionRoles',
      name: 'Permission Roles',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, permissions: true }));
        await fetchAndStorePermissionRoles();
        setIsFetchingSpecific(prev => ({ ...prev, permissions: false }));
      },
      clearAction: clearPermissionRolesData,
      getData: () => permissionRolesData,
      getLastFetched: () => permissionRolesLastFetched,
      isFetchingData: isFetchingSpecific['permissions'] || (appIsLoading && !permissionRolesData && !permissionRolesLastFetched),
      relevantColumns: [],
      matchReason: ''
    },
    {
      id: 'fleetOwners',
      name: 'Fleet Owners',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, fleetOwners: true }));
        await fetchAndStoreFleetOwners();
        setIsFetchingSpecific(prev => ({ ...prev, fleetOwners: false }));
      },
      clearAction: clearFleetOwnersData,
      getData: () => fleetOwnersData,
      getLastFetched: () => fleetOwnersLastFetched,
      isFetchingData: isFetchingSpecific['fleetOwners'] || (appIsLoading && !fleetOwnersData && !fleetOwnersLastFetched),
      relevantColumns: [],
      matchReason: ''
    },
    {
      id: 'getTMSFleetCustomers',
      name: 'Fleet Customers',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, customerFleet: true }));
        await fetchAndStoreCustomerFleet();
        setIsFetchingSpecific(prev => ({ ...prev, customerFleet: false }));
      },
      clearAction: clearCustomerFleetData,
      getData: () => customerFleetData,
      getLastFetched: () => customerFleetLastFetched,
      isFetchingData: isFetchingSpecific['customerFleet'] || (appIsLoading && !customerFleetData && !customerFleetLastFetched),
      relevantColumns: [],
      matchReason: ''
    },
    {
      id: 'timezoneList',
      name: 'Timezone List',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, timezoneList: true }));
        await fetchAndStoreTimezoneList();
        setIsFetchingSpecific(prev => ({ ...prev, timezoneList: false }));
      },
      clearAction: clearTimezoneListData,
      getData: () => timezoneListRows,
      getLastFetched: () => timezoneListLastFetched,
      isFetchingData: isFetchingSpecific['timezoneList'] || (appIsLoading && !timezoneListData && !timezoneListLastFetched),
      relevantColumns: [],
      matchReason: ''
    },
    {
      id: 'commodities',
      name: 'Commodities',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, commodities: true }));
        await fetchAndStoreCommodities();
        setIsFetchingSpecific(prev => ({ ...prev, commodities: false }));
      },
      clearAction: clearCommoditiesData,
      getData: () => commoditiesData,
      getLastFetched: () => commoditiesLastFetched,
      isFetchingData: isFetchingSpecific['commodities'] || (appIsLoading && !commoditiesData && !commoditiesLastFetched),
      relevantColumns: [],
      matchReason: ''
    },
    {
      id: 'chassis',
      name: 'Chassis',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, chassis: true }));
        await fetchAndStoreChassis();
        setIsFetchingSpecific(prev => ({ ...prev, chassis: false }));
      },
      clearAction: clearChassisData,
      getData: () => chassisData,
      getLastFetched: () => chassisLastFetched,
      isFetchingData: isFetchingSpecific['chassis'] || (appIsLoading && !chassisData && !chassisLastFetched),
      relevantColumns: [],
      matchReason: ''
    },
    {
      id: 'trucks',
      name: 'Trucks',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, trucks: true }));
        await fetchAndStoreTrucks();
        setIsFetchingSpecific(prev => ({ ...prev, trucks: false }));
      },
      clearAction: clearTrucksData,
      getData: () => trucksData,
      getLastFetched: () => trucksLastFetched,
      isFetchingData: isFetchingSpecific['trucks'] || (appIsLoading && !trucksData && !trucksLastFetched),
      relevantColumns: [],
      matchReason: ''
    },
    {
      id: 'currencies',
      name: 'Currencies',
      fetchAction: async () => {
        setIsFetchingSpecific(prev => ({ ...prev, currencies: true }));
        await fetchAndStoreCurrencies();
        setIsFetchingSpecific(prev => ({ ...prev, currencies: false }));
      },
      clearAction: clearCurrenciesData,
      getData: () => currenciesData,
      getLastFetched: () => currenciesLastFetched,
      isFetchingData: isFetchingSpecific['currencies'] || (appIsLoading && !currenciesData && !currenciesLastFetched),
      relevantColumns: [],
      matchReason: ''
    }
  ], [
    // Dependencies for memoization
    isFetchingSpecific, appIsLoading,
    chassisOwnersData, chassisOwnersLastFetched,
    chassisSizesData, chassisSizesLastFetched,
    chassisTypesData, chassisTypesLastFetched,
    containerSizesData, containerSizesLastFetched,
    containerTypesData, containerTypesLastFetched,
    containerOwnersData, containerOwnersLastFetched,
    branchesData, branchesLastFetched,
    driverProfileTypesRows, driverProfileTypesLastFetched,
    customerData, customerLastFetched,
    permissionRolesData, permissionRolesLastFetched,
    fleetOwnersData, fleetOwnersLastFetched,
    customerFleetData, customerFleetLastFetched,
    timezoneListRows, timezoneListLastFetched,
    commoditiesData, commoditiesLastFetched,
    chassisData, chassisLastFetched,
    trucksData, trucksLastFetched,
    currenciesData, currenciesLastFetched
  ]);

  // Function to analyze columns and determine necessary lookups
  const analyzeNecessaryLookups = useMemo(() => {
    if (!columns || columns.length === 0) return [];

    const necessaryLookups: LookupSourceDisplay[] = [];
    const normalizeColumnName = (col: string) => col.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Define column patterns and their corresponding lookups
    const lookupPatterns = [
      {
        patterns: ['chassisowner', 'chassisowners', 'chassisownership'],
        lookupId: 'chassisOwners',
        reason: 'chassis owner'
      },
      {
        patterns: ['chassissize', 'chassissizes', 'chassislength'],
        lookupId: 'chassisSizes',
        reason: 'chassis size'
      },
      {
        patterns: ['chassistype', 'chassistypes', 'chassiscategory'],
        lookupId: 'chassisTypes',
        reason: 'chassis type'
      },
      {
        patterns: ['containersize', 'containersizes', 'containerlength'],
        lookupId: 'containerSizes',
        reason: 'container size'
      },
      {
        patterns: ['containertype', 'containertypes', 'containercategory'],
        lookupId: 'containerTypes',
        reason: 'container type'
      },
      {
        patterns: ['containerowner', 'containerowners', 'containerownership'],
        lookupId: 'containerOwners',
        reason: 'container owner'
      },
      {
        patterns: ['branch', 'branches', 'terminal', 'terminals', 'office', 'location'],
        lookupId: 'branches',
        reason: 'branch/terminal'
      },
      {
        patterns: ['profiletype', 'driverprofile', 'drivertype', 'drivercategory'],
        lookupId: 'driverProfileTypes',
        reason: 'driver profile type'
      },
      {
        patterns: ['customer', 'customers', 'client', 'clients', 'shipper', 'consignee'],
        lookupId: 'tmsCustomers',
        reason: 'customer'
      },
      {
        patterns: ['permission', 'permissions', 'role', 'roles', 'access'],
        lookupId: 'getAllPermissionRoles',
        reason: 'permission role'
      },
      {
        patterns: ['fleetowner', 'fleetowners', 'truckowner', 'truckowners'],
        lookupId: 'fleetOwners',
        reason: 'fleet owner'
      },
      {
        patterns: ['fleetcustomer', 'fleetcustomers'],
        lookupId: 'getTMSFleetCustomers',
        reason: 'fleet customer'
      },
      {
        patterns: ['timezone', 'timezones', 'tz'],
        lookupId: 'timezoneList',
        reason: 'timezone'
      },
      {
        patterns: ['commodity', 'commodities', 'goods', 'product', 'cargo'],
        lookupId: 'commodities',
        reason: 'commodity'
      },
      {
        patterns: ['chassis', 'chassisno', 'chassisnumber', 'chassisid'],
        lookupId: 'chassis',
        reason: 'chassis number'
      },
      {
        patterns: ['truck', 'trucks', 'equipment', 'equipmentid', 'trucknumber'],
        lookupId: 'trucks',
        reason: 'truck/equipment'
      },
      {
        patterns: ['currency', 'currencies', 'currencycode', 'currencytype'],
        lookupId: 'currencies',
        reason: 'currency'
      }
    ];

    // Check each column against patterns
    columns.forEach(column => {
      const normalizedColumn = normalizeColumnName(column);
      
      lookupPatterns.forEach(({ patterns, lookupId, reason }) => {
        const matches = patterns.some(pattern => normalizedColumn.includes(pattern));
        
        if (matches) {
          const existingLookup = necessaryLookups.find(l => l.id === lookupId);
          if (existingLookup) {
            existingLookup.relevantColumns.push(column);
          } else {
            const baseLookup = allLookupSources.find(l => l.id === lookupId);
            if (baseLookup) {
              necessaryLookups.push({
                ...baseLookup,
                relevantColumns: [column],
                matchReason: `Contains ${reason} data`
              });
            }
          }
        }
      });
    });

    return necessaryLookups;
  }, [columns, allLookupSources]);

  const handleViewData = (source: LookupSourceDisplay) => {
    const data = source.getData();
    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      setDataForViewing({ name: source.name, data, columns });
    } else {
      setDataForViewing(null);
      appContext.showToast({ 
        title: "No Data", 
        description: `No data cached for ${source.name}. Fetch it first.`, 
        variant: "default" 
      });
    }
  };

  // Don't show the card if no data is loaded
  if (!data || data.length === 0 || !columns || columns.length === 0) {
    return null;
  }

  // Don't show if no necessary lookups found
  if (analyzeNecessaryLookups.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <DatabaseZap className="h-4 w-4 text-primary" />
            Necessary Lookups
          </CardTitle>
          <CardDescription className="text-xs">
            Lookups needed for your data validation
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {analyzeNecessaryLookups.map((source) => {
              const data = source.getData();
              const lastFetched = source.getLastFetched();
              const isDataPresent = data && data.length > 0;
              
              return (
                <div key={source.id} className="flex items-center justify-between p-2 border rounded bg-card/30 hover:bg-card/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 mb-1">
                      <h4 className="font-medium text-xs truncate">{source.name}</h4>
                      {isDataPresent && (
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {source.relevantColumns.slice(0, 2).map((col, idx) => (
                        <span key={col} className="inline-block">
                          <code className="bg-muted px-1 py-0.5 rounded text-xs">{col}</code>
                          {idx < Math.min(source.relevantColumns.length - 1, 1) && ', '}
                        </span>
                      ))}
                      {source.relevantColumns.length > 2 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs text-muted-foreground cursor-help">
                              +{source.relevantColumns.length - 2} more
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs">
                              {source.relevantColumns.slice(2).map((col, idx) => (
                                <div key={col}>
                                  <code className="bg-muted px-1 py-0.5 rounded text-xs">{col}</code>
                                </div>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => source.fetchAction()} 
                          disabled={source.isFetchingData || appIsLoading}
                          className="h-6 w-6 p-0"
                        >
                          {source.isFetchingData ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : isDataPresent ? (
                            <RefreshCw className="h-3 w-3" />
                          ) : (
                            <DownloadCloud className="h-3 w-3" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          {source.isFetchingData ? 'Fetching...' : isDataPresent ? 'Refresh data' : 'Fetch data'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleViewData(source)} 
                          disabled={source.isFetchingData || !isDataPresent}
                          className="h-6 w-6 p-0"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">View lookup data</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Data Viewing Dialog */}
      <Dialog open={!!dataForViewing} onOpenChange={(open) => !open && setDataForViewing(null)}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lookup Data Viewer: {dataForViewing?.name}</DialogTitle>
            <DialogDescription>
              Displaying {dataForViewing?.data.length || 0} cached records. Use this data to understand valid values for your columns.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {dataForViewing && dataForViewing.data.length > 0 ? (
              <ScrollArea className="rounded-md border shadow-sm w-full h-[60vh] bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {dataForViewing.columns.map((col) => (
                        <TableHead key={col} className="font-semibold whitespace-nowrap">{col}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dataForViewing.data.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {dataForViewing.columns.map((col) => (
                          <TableCell key={`${rowIndex}-${col}`} className="whitespace-nowrap text-xs">
                            {typeof row[col] === 'boolean' ? String(row[col]) : (row[col] ?? '')}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 border rounded-lg bg-muted/30 text-center p-6">
                <Info className="h-8 w-8 text-muted-foreground mb-2"/>
                <p className="text-sm text-muted-foreground">No data to display for {dataForViewing?.name}.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
} 