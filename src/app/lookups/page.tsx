
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useAppContext } from '@/hooks/useAppContext';
import { DownloadCloud, Trash2, Loader2, Eye, DatabaseZap, Info, RefreshCw, FileJson } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';

interface LookupSourceDisplay {
  id: string; // This is the lookupId to be used in exportEntities.json
  name: string;
  fetchAction: () => Promise<void>;
  clearAction: () => void;
  getData: () => any[] | null;
  getLastFetched: () => Date | null;
  isFetchingData: boolean; // Specific loading state for this source
}

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
  } = appContext;

  const [dataForViewing, setDataForViewing] = useState<{ name: string; data: any[]; columns: string[] } | null>(null);
  const [isFetchingSpecific, setIsFetchingSpecific] = useState<Record<string, boolean>>({});


  const lookupSources: LookupSourceDisplay[] = [
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
    },
  ];

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
      dataForViewing, 
      // lookupSources is memoized or stable, but including it for safety if it were dynamic
      // However, if lookupSources itself is not changing identity, its direct inclusion isn't strictly necessary for this effect's purpose
      // For simplicity, we'll keep it focused on the data properties that change.
      // lookupSources 
    ]);


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
      <div className="space-y-6 p-1">
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

        <Card>
          <CardHeader>
            <CardTitle>Available Lookup Datasets</CardTitle>
            <CardDescription>Manage and view cached lookup data.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full">
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

        {dataForViewing && (
          <Card>
            <CardHeader>
              <CardTitle>Cached Data Viewer: {dataForViewing.name}</CardTitle>
              <CardDescription>
                Displaying {dataForViewing.data.length} cached records. Columns are dynamically generated.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dataForViewing.data.length > 0 ? (
                <ScrollArea className="rounded-md border shadow-sm w-full bg-card max-h-[500px]">
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
                  <p className="text-sm text-muted-foreground">No data to display for {dataForViewing.name}.</p>
                </div>
              )}
            </CardContent>
            <CardFooter>
                 <Button variant="outline" size="sm" onClick={() => setDataForViewing(null)}>Close Viewer</Button>
            </CardFooter>
          </Card>
        )}
         {!dataForViewing && !appIsLoading && (
             <div className="text-center py-4 text-sm text-muted-foreground">
                Click "View" on a lookup source to see its cached data here.
             </div>
        )}
      </div>
    </AppLayout>
  );
}

