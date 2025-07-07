"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
import { getCustomerTypeLabels } from '@/utils/helpers';
import { EntitySchemaLookupIds } from '@/schema';
import { useEntityContext, STORAGE_KEYS } from '@/contexts/EntityContext';
import { ENTITY_NAME_STORAGE_KEY } from '@/lib/constants';

interface SmartLookupsCardProps {
  className?: string;
}

// Helper to generate simple hash of data for comparison
const generateDataHash = (columns: string[]) => {
  return btoa(JSON.stringify({ columns }));
};

export function SmartLookupsCard({ className }: SmartLookupsCardProps) {
  const { 
    detectedEntity,
    setDetectedEntity,
    fetchedLookups,
    setFetchedLookups,
    fileHash,
    setFileHash,
    clearEntityState
  } = useEntityContext();

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
    zipCodeGroupsData, fetchAndStoreZipCodeGroups, clearZipCodeGroupsData, zipCodeGroupsLastFetched,
    CSRData, fetchAndStoreCSR, clearCSRData, CSRLastFetched,
    driverGroupsData, fetchAndStoreDriverGroups, clearDriverGroupsData, driverGroupsLastFetched,
    carrierGroupsData, fetchAndStoreCarrierGroups, clearCarrierGroupsData, carrierGroupsLastFetched,
    chargeProfileData, fetchAndStoreChargeProfile, clearChargeProfileData, chargeProfileLastFetched,
  } = appContext;

  const [dataForViewing, setDataForViewing] = useState<{ name: string; data: any[]; columns: string[] } | null>(null);
  const [isFetchingSpecific, setIsFetchingSpecific] = useState<Record<string, boolean>>({});
  const [isDetectingEntity, setIsDetectingEntity] = useState(false);
  const [detectionError, setDetectionError] = useState<string | null>(null);
  const [currentEntityName, setCurrentEntityName] = useState<string | null>(null);
  
  // Pagination state for chargeProfileData
  const [displayedChargeProfileCount, setDisplayedChargeProfileCount] = useState(15);
  const [isLoadingMoreChargeProfiles, setIsLoadingMoreChargeProfiles] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Add state for search term
  const [searchTerm, setSearchTerm] = useState("");

  // Filtered data for Charge Profile
  const filteredChargeProfileData = useMemo(() => {
    if (dataForViewing?.name !== "Charge Profile" || !searchTerm.trim()) return dataForViewing?.data || [];
    const lower = searchTerm.toLowerCase();
    return dataForViewing.data.filter(row =>
      Object.values(row).some(val => String(val).toLowerCase().includes(lower))
    );
  }, [dataForViewing, searchTerm]);

  // Initial sync on mount
  useEffect(() => {
    const storedEntityName = typeof window !== 'undefined' ? localStorage.getItem(ENTITY_NAME_STORAGE_KEY) : null;
    const contextEntityName = entityName;
    const detectedEntityName = detectedEntity?.entityName;
    
    const effectiveEntityName = contextEntityName || detectedEntityName || storedEntityName;
    
    if (effectiveEntityName) {
      setCurrentEntityName(effectiveEntityName);
    }
  }, []); // Run only on mount

  // Sync entity name from all sources
  useEffect(() => {
    const storedEntityName = typeof window !== 'undefined' ? localStorage.getItem(ENTITY_NAME_STORAGE_KEY) : null;
    const contextEntityName = entityName;
    const detectedEntityName = detectedEntity?.entityName;
    
    // Priority: context entityName > detectedEntity > localStorage > null
    const effectiveEntityName = contextEntityName || detectedEntityName || storedEntityName;
    
    if (effectiveEntityName && effectiveEntityName !== currentEntityName) {
      setCurrentEntityName(effectiveEntityName);
    }
  }, [entityName, detectedEntity?.entityName, currentEntityName]); // Watch all relevant values

  // Check file changes on columns update only
  useEffect(() => {
    if (columns) {
      const currentHash = generateDataHash(columns);
      
      if (currentHash !== fileHash) {
        clearEntityState();
        setFileHash(currentHash);
        // Clear current entity name when file changes
        setCurrentEntityName(null);
      }
    }
  }, [columns]); 

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
    zipCodeGroupsData, zipCodeGroupsLastFetched,
    CSRData, CSRLastFetched,
    driverGroupsData, driverGroupsLastFetched,
    carrierGroupsData, carrierGroupsLastFetched,
    chargeProfileData, chargeProfileLastFetched,
  ]);

  // Modify detectEntityAndLookups
  const detectEntityAndLookups = async () => {
    if (!columns || columns.length === 0) {
      showToast({
        title: "No Data",
        description: "Please upload a file first to detect entities.",
        variant: "destructive",
      })
      return
    }

    setIsDetectingEntity(true);
    setDetectionError(null);

    try {
      const result = await fetch('/api/detect-entity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parsedDataContext: {
            columns: columns,
            data: data?.slice(0, 5) || [], 
          },
          columns,
          chatHistory: chatHistory || [],
          selectedAiProvider,
          selectedAiModelName,
        }),
      }).then(res => res.json());

      setDetectedEntity(result);
      setEntityName(result.entityName);

      // Wait a bit for state to update before fetching lookups
      setTimeout(async () => {
        try {
          await handleFetchAllNecessaryLookups();
          showToast({
            title: "Entity Detected",
            description: `Successfully detected entity: ${result.entityName} and fetched required lookups`,
          });
        } catch (error) {
          console.error('Error fetching lookups:', error);
          showToast({
            title: "Lookup Fetch Error",
            description: "Entity detected but some lookups failed to fetch.",
            variant: "destructive"
          });
        }
      }, 500);
      
    } catch (error) {
      console.error('Entity detection failed:', error);
      setDetectionError(error instanceof Error ? error.message : 'Unknown error');
      showToast({
        title: "Detection Failed",
        description: "Failed to detect entity. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDetectingEntity(false)
    }
  }

  // Modify handleIndividualFetch
  const handleIndividualFetch = async (source: LookupSourceDisplay) => {
    await source.fetchAction();
    
    if (getNecessaryLookups.some(lookup => lookup.id === source.id)) {
      setFetchedLookups(new Set([...fetchedLookups, source.id]));
    }
  };

  // Modify handleFetchAllNecessaryLookups
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
      
      setFetchedLookups(new Set([
        ...fetchedLookups,
        ...getNecessaryLookups.map(lookup => lookup.id)
      ]));

    } catch (error) {
      console.error('Error fetching lookups:', error);
      showToast({
        title: "Fetch Error",
        description: "Some lookups failed to fetch. Check individual lookup status.",
        variant: "destructive"
      });
    } finally {
      setIsFetchingSpecific({});
    }
  };

  // Modify auto-detection useEffect
  // useEffect(() => {
  //   if (data && data.length > 0 && columns && columns.length > 0 && selectedAiProvider && selectedAiModelName) {
  //     const currentHash = generateDataHash(columns);
      
  //     const savedEntity = sessionStorage.getItem(STORAGE_KEYS.DETECTED_ENTITY);
  //     const savedHash = sessionStorage.getItem(STORAGE_KEYS.FILE_HASH);

  //     if (currentHash !== fileHash || (!detectedEntity && !savedEntity)) {
  //       const timer = setTimeout(() => {
  //         detectEntityAndLookups();
  //       }, 1000);
  //       return () => clearTimeout(timer);
  //     }
  //   }
  // }, [columns, selectedAiProvider, selectedAiModelName]);

  // Function to get necessary lookups based on detected entity or stored entity name
  const getNecessaryLookups = useMemo(() => {
    // Use multiple sources to determine entity name
    const storedEntityName = typeof window !== 'undefined' ? localStorage.getItem(ENTITY_NAME_STORAGE_KEY) : null;
    const effectiveEntityName = currentEntityName || detectedEntity?.entityName || entityName || storedEntityName;
    
    if (!effectiveEntityName) return [];

    const requiredLookupIds = EntitySchemaLookupIds[effectiveEntityName] || [];
    
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
            case 'driverGroups':
              return normalizedCol.includes('drivergroup') || normalizedCol.includes('drivergroupname');
            case 'carrierGroups':
              return normalizedCol.includes('carriergroup') || normalizedCol.includes('carriergroupname');
            default:
              return false;
          }
        });

        necessaryLookups.push({
          ...baseLookup,
          relevantColumns: relevantColumns.length > 0 ? relevantColumns : undefined,
          matchReason: `Required for ${effectiveEntityName} entity${currentEntityName ? ' (From Storage)' : ' (Detected)'}`
        });
      }
    });

    return necessaryLookups;
  }, [currentEntityName, detectedEntity, entityName, allLookupSources, columns]);

  // Reset pagination when dialog closes
  useEffect(() => {
    if (!dataForViewing) setDisplayedChargeProfileCount(15);
  }, [dataForViewing]);

  // Handle scroll for chargeProfileData pagination
  const handleChargeProfileScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (!dataForViewing || dataForViewing.name !== 'Charge Profile') return;
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 50; // Reduced threshold for better detection

    console.log('Scroll event:', { scrollTop, scrollHeight, clientHeight, isNearBottom, displayedChargeProfileCount, totalItems: dataForViewing.data.length });

    if (
      isNearBottom &&
      !isLoadingMoreChargeProfiles &&
      displayedChargeProfileCount < dataForViewing.data.length
    ) {
      console.log('Loading more charge profiles...');
      setIsLoadingMoreChargeProfiles(true);
      
      // Simulate loading time - keep loading state visible for at least 1 second
      setTimeout(() => {
        setDisplayedChargeProfileCount((prev) => {
          const nextCount = prev + 15;
          const newCount = Math.min(nextCount, dataForViewing.data.length);
          console.log('Updated count:', { prev, nextCount, newCount });
          return newCount;
        });
        
        // Keep loading state visible for a bit longer to prevent glitching
        setTimeout(() => {
          setIsLoadingMoreChargeProfiles(false);
        }, 800); // Longer delay to ensure smooth transition
      }, 1000); // 1 second loading time
    }
  };

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

  // Auto-fetch lookups when entity is available
  useEffect(() => {
    const hasEntity = currentEntityName || detectedEntity?.entityName;
    const hasLookups = getNecessaryLookups.length > 0;
    
    // Only auto-fetch if:
    // 1. We have an entity
    // 2. We're not currently detecting
    // 3. We have lookups to fetch
    // 4. We haven't already fetched them (check if any lookups are already loaded)
    if (hasEntity && 
        !isDetectingEntity && 
        hasLookups &&
        getNecessaryLookups.some(lookup => !lookup.getData() || lookup.getData()?.length === 0)) {
      // Small delay to ensure all state has settled
      const timer = setTimeout(() => {
        handleFetchAllNecessaryLookups();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentEntityName, detectedEntity?.entityName, getNecessaryLookups.length, isDetectingEntity]);

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
            Required Lookups
          </CardTitle>
          <CardDescription className="text-xs">
            {(() => {
              const storedEntityName = typeof window !== 'undefined' ? localStorage.getItem(ENTITY_NAME_STORAGE_KEY) : null;
              const displayEntityName = currentEntityName || detectedEntity?.entityName || entityName || storedEntityName;
              
              if (displayEntityName) {
                const source = currentEntityName === entityName ? '(from context)' : 
                              detectedEntity?.entityName ? '(detected)' : '(from storage)';
                return <>Using <strong>{displayEntityName}</strong> entity {source}</>;
              } else if (isDetectingEntity) {
                return "Analyzing your data structure...";
              } else if (detectionError) {
                return "Entity detection failed";
              } else {
                return "Configure AI settings to enable smart detection";
              }
            })()}
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

          {(() => {
            const storedEntityName = typeof window !== 'undefined' ? localStorage.getItem(ENTITY_NAME_STORAGE_KEY) : null;
            const displayEntityName = currentEntityName || detectedEntity?.entityName || entityName || storedEntityName;
            return displayEntityName;
          })() && (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 border rounded bg-primary/5">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {(() => {
                      const storedEntityName = typeof window !== 'undefined' ? localStorage.getItem(ENTITY_NAME_STORAGE_KEY) : null;
                      return currentEntityName || detectedEntity?.entityName || entityName || storedEntityName;
                    })()}
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
          {!isDetectingEntity && !(() => {
            const storedEntityName = typeof window !== 'undefined' ? localStorage.getItem(ENTITY_NAME_STORAGE_KEY) : null;
            return currentEntityName || detectedEntity?.entityName || entityName || storedEntityName;
          })() && !detectionError && (
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
              {dataForViewing?.name === 'Charge Profile' ? (
                <>
                  Displaying {Math.min(displayedChargeProfileCount, dataForViewing?.data.length || 0)} of {dataForViewing?.data.length || 0} cached records. 
                  {dataForViewing?.data.length > 15 && ' Scroll down to load more.'}
                </>
              ) : (
                `Displaying ${dataForViewing?.data.length || 0} cached records. Use this data to understand valid values for your columns.`
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {dataForViewing && dataForViewing.data.length > 0 ? (
                              <div 
                  className="rounded-md border shadow-sm w-full h-[60vh] bg-card overflow-auto"
                  onScroll={dataForViewing.name === 'Charge Profile' ? handleChargeProfileScroll : undefined}
                  ref={scrollAreaRef}
                >
                <Table>
                  <TableHeader>
                    <TableRow>
                      {dataForViewing.columns.map((col) => (
                        <TableHead key={col} className="font-semibold whitespace-nowrap">{col}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      if (dataForViewing.name === 'Charge Profile') {
                        return (
                          <>
                            <TableRow>
                              <TableCell colSpan={dataForViewing.columns.length} className="text-center py-1.5">
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
                              </TableCell>
                            </TableRow>
                            {(dataForViewing.name === 'Charge Profile'
                              ? filteredChargeProfileData.slice(0, displayedChargeProfileCount)
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
                            {/* Show 'No results' if search yields nothing */}
                            {dataForViewing.name === 'Charge Profile' && filteredChargeProfileData.length === 0 && !isLoadingMoreChargeProfiles && (
                              <TableRow>
                                <TableCell colSpan={dataForViewing.columns.length} className="text-center py-8 text-muted-foreground">
                                  No charge profiles found.
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        );
                      } else {
                        return (
                          <>
                            {(dataForViewing.name === 'Charge Profile'
                              ? dataForViewing.data
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
                          </>
                        );
                      }
                    })()}
                  </TableBody>
                </Table>
                {/* End of data indicator for charge profile */}
                {dataForViewing.name === 'Charge Profile' && 
                 displayedChargeProfileCount >= (dataForViewing.data.length || 0) && 
                 dataForViewing.data.length > 15 && (
                  <div className="flex items-center justify-center p-4 border-t bg-muted/30">
                    <span className="text-sm text-muted-foreground">All charge profiles loaded</span>
                  </div>
                )}
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
    </TooltipProvider>
  );
} 