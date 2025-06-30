"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAppContext } from '@/hooks/useAppContext';
import { DownloadCloud, Loader2, Eye, DatabaseZap, RefreshCw, AlertCircle, Sparkles, Info } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { createLookupSources, LookupSourceDisplay } from '@/utils/lookupSources';
import { EntitySchemaLookupIds } from '@/schema';

// Define the type locally since we can't import it from server-side code
interface EntityProcessingResult {
  entityName: string;
  entitySchema: any;
  entityFields: string;
  parsedDataContext: any;
}

interface SmartLookupsCardProps {
  className?: string;
}

export function SmartLookupsCard({ className }: SmartLookupsCardProps) {
  const appContext = useAppContext();
  const { 
    data,
    columns,
    fileName,
    entityName,
    setEntityName,
    isLoading: appIsLoading,
    chatHistory,
    selectedAiProvider,
    selectedAiModelName,
    showToast,
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
    chargeCodesData, fetchAndStoreChargeCodes, clearChargeCodesData, chargeCodesLastFetched,
    driverPayGroupsData, fetchAndStoreDriverPayGroups, clearDriverPayGroupsData, driverPayGroupsLastFetched,
    cityGroupsData, fetchAndStoreCityGroups, clearCityGroupsData, cityGroupsLastFetched,
    CSRData, fetchAndStoreCSR, clearCSRData, CSRLastFetched,
  } = appContext;

  const [dataForViewing, setDataForViewing] = useState<{ name: string; data: any[]; columns: string[] } | null>(null);
  const [isFetchingSpecific, setIsFetchingSpecific] = useState<Record<string, boolean>>({});
  const [isDetectingEntity, setIsDetectingEntity] = useState(false);
  const [detectedEntity, setDetectedEntity] = useState<EntityProcessingResult | null>(null);
  const [detectionError, setDetectionError] = useState<string | null>(null);
  const [aiFetchedLookups, setAiFetchedLookups] = useState<Set<string>>(new Set());

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
      CSRData,
      fetchAndStoreCSR,
      clearCSRData,
      CSRLastFetched,
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
    currenciesData, currenciesLastFetched,
    chargeCodesData, chargeCodesLastFetched,
    driverPayGroupsData, driverPayGroupsLastFetched,
    cityGroupsData, cityGroupsLastFetched,
    CSRData, CSRLastFetched,
  ]);

  // Function to detect entity using AI via API
  const detectEntityAndLookups = async () => {
    if (!columns || columns.length === 0) {
      showToast({
        title: "No Data",
        description: "Please upload a file first to detect entities.",
        variant: "destructive",
      })
      return
    }

    if (!selectedAiProvider || !selectedAiModelName) {
      showToast({
        title: "AI Configuration Missing",
        description: "Please configure your AI provider and model in settings.",
        variant: "destructive",
      })
      return
    }

    setIsDetectingEntity(true)
    setDetectionError(null)

    try {
      const parsedDataContext = {
        columns: columns,
        data: data?.slice(0, 5) || [], // Use first 5 rows for context
      }

      const response = await fetch('/api/detect-entity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parsedDataContext,
          columns,
          chatHistory: chatHistory || [],
          selectedAiProvider,
          selectedAiModelName,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to detect entity')
      }

      const result = await response.json()
      setDetectedEntity(result)
      setEntityName(result.entityName)
      showToast({
        title: "Entity Detected",
        description: `Successfully detected entity: ${result.entityName}`,
      })
    } catch (error) {
      console.error('Entity detection failed:', error)
      setDetectionError(error instanceof Error ? error.message : 'Unknown error')
      showToast({
        title: "Detection Failed",
        description: "Failed to detect entity. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDetectingEntity(false)
    }
  }

  // Auto-detect entity when data changes
  useEffect(() => {
    if (data && data.length > 0 && columns && columns.length > 0 && selectedAiProvider && selectedAiModelName) {
      // Auto-detect with a small delay to avoid too many calls
      const timer = setTimeout(() => {
        detectEntityAndLookups();
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setDetectedEntity(null);
      setDetectionError(null);
    }
  }, [data, columns, selectedAiProvider, selectedAiModelName]);

  // Function to get necessary lookups based on detected entity
  const getNecessaryLookups = useMemo(() => {
    if (!detectedEntity || !detectedEntity.entityName) return [];

    const entityName = detectedEntity.entityName;
    const requiredLookupIds = EntitySchemaLookupIds[entityName] || [];
    
    const necessaryLookups: LookupSourceDisplay[] = [];

    requiredLookupIds.forEach(lookupId => {
      const baseLookup = allLookupSources.find(l => l.id === lookupId);
      if (baseLookup) {
        // Find relevant columns for this lookup based on the detected entity's fields
        const relevantColumns = columns.filter(col => {
          const normalizedCol = col.toLowerCase().replace(/[^a-z0-9]/g, '');
          
          // Enhanced pattern matching based on lookup ID
          switch (lookupId) {
            case 'chassisOwners':
              return normalizedCol.includes('chassisowner') || normalizedCol.includes('chassisownership');
            case 'chassisSizes':
              return normalizedCol.includes('chassissize') || normalizedCol.includes('chassislength');
            case 'chassisTypes':
              return normalizedCol.includes('chassistype') || normalizedCol.includes('chassiscategory');
            case 'containerSizes':
              return normalizedCol.includes('containersize') || normalizedCol.includes('containerlength');
            case 'containerTypes':
              return normalizedCol.includes('containertype') || normalizedCol.includes('containercategory');
            case 'containerOwners':
              return normalizedCol.includes('containerowner') || normalizedCol.includes('containerownership');
            case 'branches':
              return normalizedCol.includes('branch') || normalizedCol.includes('terminal') || normalizedCol.includes('office') || normalizedCol.includes('location');
            case 'driverProfileTypes':
              return normalizedCol.includes('profiletype') || normalizedCol.includes('driverprofile') || normalizedCol.includes('drivertype');
            case 'customers':
            case 'tmsCustomers':
              return normalizedCol.includes('customer') || normalizedCol.includes('client') || normalizedCol.includes('shipper') || normalizedCol.includes('consignee');
            case 'getAllPermissionRoles':
              return normalizedCol.includes('permission') || normalizedCol.includes('role') || normalizedCol.includes('access');
            case 'fleetOwners':
              return normalizedCol.includes('fleetowner') || normalizedCol.includes('truckowner');
            case 'getTMSFleetCustomers':
              return normalizedCol.includes('fleetcustomer');
            case 'timezoneList':
              return normalizedCol.includes('timezone') || normalizedCol.includes('tz');
            case 'commodities':
              return normalizedCol.includes('commodity') || normalizedCol.includes('goods') || normalizedCol.includes('product') || normalizedCol.includes('cargo');
            case 'chassis':
              return normalizedCol.includes('chassis') || normalizedCol.includes('chassisno') || normalizedCol.includes('chassisnumber');
            case 'trucks':
              return normalizedCol.includes('truck') || normalizedCol.includes('equipment') || normalizedCol.includes('trucknumber');
            case 'currencies':
              return normalizedCol.includes('currency') || normalizedCol.includes('currencycode');
            case 'driverPayGroups':
              return normalizedCol.includes('driverpaygroup') || normalizedCol.includes('driverpaygroupname');
            case 'cityGroups':
              return normalizedCol.includes('citygroup') || normalizedCol.includes('citygroupname');
            case 'CSR':
              return normalizedCol.includes('csr') || normalizedCol.includes('csrname');
            default:
              return false;
          }
        });

        necessaryLookups.push({
          ...baseLookup,
          relevantColumns: relevantColumns.length > 0 ? relevantColumns : undefined,
          matchReason: `Required for ${entityName} entity (AI detected)`
        });
      }
    });

    return necessaryLookups;
  }, [detectedEntity, allLookupSources, columns]);

  const handleViewData = (source: LookupSourceDisplay) => {
    const data = source.getData();
    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      setDataForViewing({ name: source.name, data, columns });
    } else {
      setDataForViewing(null);
      showToast({ 
        title: "No Data", 
        description: `No data cached for ${source.name}. Fetch it first.`, 
        variant: "default" 
      });
    }
  };

  // Enhanced fetch function that tracks 
  const handleIndividualFetch = async (source: LookupSourceDisplay) => {
    await source.fetchAction();
    
    // If this lookup is part of necessary lookups
    if (getNecessaryLookups.some(lookup => lookup.id === source.id)) {
      setAiFetchedLookups(prev => {
        const newSet = new Set(prev);
        newSet.add(source.id);
        return newSet;
      });
    }
  };

  // Auto-fetch all necessary lookups when entity is detected
  const handleFetchAllNecessaryLookups = async () => {
    if (getNecessaryLookups.length === 0) return;

    setIsFetchingSpecific(prev => {
      const newState = { ...prev };
      getNecessaryLookups.forEach(lookup => {
        newState[lookup.id] = true;
      });
      return newState;
    });

    try {
      const fetchPromises = getNecessaryLookups.map(lookup => lookup.fetchAction());
      await Promise.all(fetchPromises);
      
      setAiFetchedLookups(prev => {
        const newSet = new Set(prev);
        getNecessaryLookups.forEach(lookup => newSet.add(lookup.id));
        return newSet;
      });

    } catch (error) {
      console.error('Error fetching lookups:', error);
      showToast({
        title: "Fetch Error",
        description: "Some lookups failed to fetch. Check individual lookup status.",
        variant: "destructive"
      });
    } finally {
      setIsFetchingSpecific(prev => {
        const newState = { ...prev };
        getNecessaryLookups.forEach(lookup => {
          newState[lookup.id] = false;
        });
        return newState;
      });
    }
  };

  // Clear lookups tracking when data changes
  useEffect(() => {
    if (!data || data.length === 0) {
      setAiFetchedLookups(new Set());
    }
  }, [data]);

  // Don't show the card if no data is loaded
  if (!data || data.length === 0 || !columns || columns.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <Card className={`${className} flex flex-col h-full`}>
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            AI-Detected Lookups
          </CardTitle>
          <CardDescription className="text-xs">
            {detectedEntity ? (
              <>AI detected <strong>{detectedEntity.entityName}</strong> entity</>
            ) : isDetectingEntity ? (
              "Analyzing your data structure..."
            ) : detectionError ? (
              "Entity detection failed"
            ) : (
              "Configure AI settings to enable smart detection"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 flex-1 min-h-0">
      <ScrollArea className="h-full">
        <div className="space-y-3 pr-4">
          {/* Entity Detection Status */}
          {isDetectingEntity && (
            <div className="flex items-center gap-2 p-3 border rounded bg-muted/30">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm">Detecting entity type...</span>
            </div>
          )}

          {detectionError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Detection Error</AlertTitle>
              <AlertDescription className="text-xs">{detectionError}</AlertDescription>
            </Alert>
          )}

          {detectedEntity && (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 border rounded bg-primary/5">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {detectedEntity.entityName}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {getNecessaryLookups.length} lookups required
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={detectEntityAndLookups}
                        disabled={isDetectingEntity || !selectedAiProvider || !selectedAiModelName}
                        className="h-6 w-6 p-0"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Re-detect entity</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleFetchAllNecessaryLookups}
                        disabled={getNecessaryLookups.length === 0 || Object.values(isFetchingSpecific).some(Boolean)}
                        className="h-6 w-6 p-0"
                      >
                        <DownloadCloud className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Fetch all required lookups</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          )}

          {/* Necessary Lookups List */}
          <div className="space-y-2">
            {getNecessaryLookups.map((source) => {
              const data = source.getData();
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
                          onClick={() => handleIndividualFetch(source)} 
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

          {/* Empty state when no entity detected */}
          {!isDetectingEntity && !detectedEntity && !detectionError && (
            <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-muted/30 text-center">
              <DatabaseZap className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-2">
                {!selectedAiProvider || !selectedAiModelName 
                  ? "Configure AI settings to enable smart lookup detection"
                  : "Upload data to detect necessary lookups"
                }
              </p>
              {selectedAiProvider && selectedAiModelName && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={detectEntityAndLookups}
                  disabled={!columns || columns.length === 0}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Detect Entity
                </Button>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
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