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
import { createLookupSources, LookupSourceDisplay } from '@/utils/lookupSources';
import { EntitySchemaLookupIds } from '@/schema';

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

  // Create all lookup sources using the shared utility
  const allLookupSources: LookupSourceDisplay[] = useMemo(() => {
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
    });
  }, [
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

    // Get all unique lookup IDs from the EntitySchemaLookupIds mapping
    const allRequiredLookupIds = new Set<string>();
    Object.values(EntitySchemaLookupIds).forEach(lookupIds => {
      lookupIds.forEach(id => allRequiredLookupIds.add(id));
    });

    // Create a reverse mapping from lookup ID to entity types that use it
    const lookupToEntities: Record<string, string[]> = {};
    Object.entries(EntitySchemaLookupIds).forEach(([entityType, lookupIds]) => {
      lookupIds.forEach(lookupId => {
        if (!lookupToEntities[lookupId]) {
          lookupToEntities[lookupId] = [];
        }
        lookupToEntities[lookupId].push(entityType);
      });
    });

    // Define column patterns that might indicate specific entity types or lookup needs
    const entityPatterns = [
      { patterns: ['load'], entities: ['Load'] },
      { patterns: ['carrier'], entities: ['Carrier'] },
      { patterns: ['trailer'], entities: ['Trailers'] },
      { patterns: ['truck'], entities: ['Trucks'] },
      { patterns: ['user'], entities: ['Users'] },
      { patterns: ['chassis'], entities: ['Chassis'] },
      { patterns: ['people'], entities: ['People'] },
      { patterns: ['organization'], entities: ['Organization'] },
      { patterns: ['driver'], entities: ['Drivers'] },
    ];

    // Check columns for entity-specific patterns
    const detectedEntities = new Set<string>();
    columns.forEach(column => {
      const normalizedColumn = normalizeColumnName(column);
      
      entityPatterns.forEach(({ patterns, entities }) => {
        if (patterns.some(pattern => normalizedColumn.includes(pattern))) {
          entities.forEach(entity => detectedEntities.add(entity));
        }
      });
    });

    // If no specific entities detected, include all common lookups
    if (detectedEntities.size === 0) {
      // Add common lookups that are frequently used
      const commonLookups = ['branches', 'customers', 'tmsCustomers', 'currencies'];
      commonLookups.forEach(lookupId => {
        const baseLookup = allLookupSources.find(l => l.id === lookupId);
        if (baseLookup) {
          necessaryLookups.push({
            ...baseLookup,
            relevantColumns: columns.filter(col => {
              const normalized = normalizeColumnName(col);
              // Basic pattern matching for common fields
              if (lookupId === 'branches') return normalized.includes('branch') || normalized.includes('terminal') || normalized.includes('location');
              if (lookupId === 'customers' || lookupId === 'tmsCustomers') return normalized.includes('customer') || normalized.includes('client');
              if (lookupId === 'currencies') return normalized.includes('currency');
              return false;
            }),
            matchReason: `Common lookup for data validation`
          });
        }
      });
    } else {
      // Add lookups for detected entities
      detectedEntities.forEach(entityType => {
        const lookupIds = EntitySchemaLookupIds[entityType] || [];
        lookupIds.forEach(lookupId => {
          if (!necessaryLookups.find(l => l.id === lookupId)) {
            const baseLookup = allLookupSources.find(l => l.id === lookupId);
            if (baseLookup) {
              // Find relevant columns for this lookup
              const relevantColumns = columns.filter(col => {
                const normalized = normalizeColumnName(col);
                // Enhanced pattern matching based on lookup ID
                switch (lookupId) {
                  case 'chassisOwners':
                    return normalized.includes('chassisowner') || normalized.includes('chassisownership');
                  case 'chassisSizes':
                    return normalized.includes('chassissize') || normalized.includes('chassislength');
                  case 'chassisTypes':
                    return normalized.includes('chassistype') || normalized.includes('chassiscategory');
                  case 'containerSizes':
                    return normalized.includes('containersize') || normalized.includes('containerlength');
                  case 'containerTypes':
                    return normalized.includes('containertype') || normalized.includes('containercategory');
                  case 'containerOwners':
                    return normalized.includes('containerowner') || normalized.includes('containerownership');
                  case 'branches':
                    return normalized.includes('branch') || normalized.includes('terminal') || normalized.includes('office') || normalized.includes('location');
                  case 'driverProfileTypes':
                    return normalized.includes('profiletype') || normalized.includes('driverprofile') || normalized.includes('drivertype');
                  case 'customers':
                  case 'tmsCustomers':
                    return normalized.includes('customer') || normalized.includes('client') || normalized.includes('shipper') || normalized.includes('consignee');
                  case 'getAllPermissionRoles':
                    return normalized.includes('permission') || normalized.includes('role') || normalized.includes('access');
                  case 'fleetOwners':
                    return normalized.includes('fleetowner') || normalized.includes('truckowner');
                  case 'getTMSFleetCustomers':
                    return normalized.includes('fleetcustomer');
                  case 'timezoneList':
                    return normalized.includes('timezone') || normalized.includes('tz');
                  case 'commodities':
                    return normalized.includes('commodity') || normalized.includes('goods') || normalized.includes('product') || normalized.includes('cargo');
                  case 'chassis':
                    return normalized.includes('chassis') || normalized.includes('chassisno') || normalized.includes('chassisnumber');
                  case 'trucks':
                    return normalized.includes('truck') || normalized.includes('equipment') || normalized.includes('trucknumber');
                  case 'currencies':
                    return normalized.includes('currency') || normalized.includes('currencycode');
                  default:
                    return false;
                }
              });

              necessaryLookups.push({
                ...baseLookup,
                relevantColumns: relevantColumns.length > 0 ? relevantColumns : undefined,
                matchReason: `Required for ${entityType} entity validation`
              });
            }
          }
        });
      });
    }

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
                      {(source.relevantColumns || []).slice(0, 2).map((col, idx) => (
                        <span key={col} className="inline-block">
                          <code className="bg-muted px-1 py-0.5 rounded text-xs">{col}</code>
                          {idx < Math.min((source.relevantColumns || []).length - 1, 1) && ', '}
                        </span>
                      ))}
                      {(source.relevantColumns || []).length > 2 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs text-muted-foreground cursor-help">
                              +{(source.relevantColumns || []).length - 2} more
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs">
                              {(source.relevantColumns || []).slice(2).map((col, idx) => (
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