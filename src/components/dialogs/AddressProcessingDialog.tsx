"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useAppContext } from '@/hooks/useAppContext';
import { processAddressesBatch, type ProcessAddressesBatchClientInput, type ProcessAddressOutput } from '@/ai/flows/process-address-flow';
import { MapPin, Loader2, CheckCircle, Plus, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

type AddressFieldMapping = {
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type RowSelection = {
  mode: 'range' | 'individual' | 'mixed';
  ranges: Array<{ from: number; to: number }>;
  individualRows: number[];
};

const NOT_MAPPED_VALUE = "__NOT_MAPPED_PLACEHOLDER__";
const CHUNK_SIZE = 100;

export function AddressProcessingDialog() {
  const {
    data,
    columns,
    setData,
    setDataState,
    setColumns,
    activeDialog,
    closeDialog,
    showToast,
    isLoading: isAppLoading,
    setIsLoading: setIsAppLoading,
    selectedAiProvider,
    selectedAiModelName,
    dataTable,
    setDataTable,
    currentPage,
    totalPages,
    rowsPerPage,
    totalRows,
    setViewData,
    getCarrierId,
  } = useAppContext();

  const [fieldMappings, setFieldMappings] = useState<AddressFieldMapping>({
    streetAddress: '', city: '', state: '', postalCode: '', country: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [processingErrorCount, setProcessingErrorCount] = useState(0);
  const [totalDataLength, setTotalDataLength] = useState(0);
  
  // Row selection state
  const [rowSelection, setRowSelection] = useState<RowSelection>({
    mode: 'range',
    ranges: [{ from: 1, to: 1 }],
    individualRows: []
  });
  
  // Individual row input
  const [individualRowInput, setIndividualRowInput] = useState('');

  useEffect(() => {
    // Auto-select common column names if they exist
    if (columns.length > 0 && activeDialog === 'addressProcessing') {
      const commonMappings: Partial<AddressFieldMapping> = {};
      const findColumn = (patterns: string[]) => columns.find(col => patterns.some(p => col.toLowerCase().includes(p.toLowerCase()))) || '';
      
      commonMappings.streetAddress = findColumn(['street address', 'address1', 'address line 1', 'street']);
      commonMappings.city = findColumn(['city', 'town']);
      commonMappings.state = findColumn(['state', 'province', 'region']);
      commonMappings.postalCode = findColumn(['zip', 'postal', 'post code']);
      commonMappings.country = findColumn(['country']);
      
      setFieldMappings(prev => ({ ...prev, ...commonMappings }));
      setProcessedCount(0);
      setProcessingErrorCount(0);
      const totalRowsCount = totalRows || data?.length || 0;
      setTotalDataLength(totalRowsCount);
      
      // Initialize with default range
      setRowSelection({
        mode: 'range',
        ranges: [{ from: 1, to: totalRowsCount }],
        individualRows: []
      });
    }
  }, [columns, activeDialog, totalRows, data?.length]);

  const handleMappingChange = (addressField: keyof AddressFieldMapping, sourceColumnName: string) => {
    setFieldMappings(prev => ({
      ...prev,
      [addressField]: sourceColumnName === NOT_MAPPED_VALUE ? '' : sourceColumnName,
    }));
  };

  // Range selection handlers
  const handleRangeChange = (index: number, field: 'from' | 'to', value: string) => {
    const numValue = parseInt(value) || 0;
    setRowSelection(prev => ({
      ...prev,
      ranges: prev.ranges.map((range, i) => 
        i === index ? { ...range, [field]: numValue } : range
      )
    }));
  };

  const addRange = () => {
    setRowSelection(prev => ({
      ...prev,
      ranges: [...prev.ranges, { from: 1, to: 1 }]
    }));
  };

  const removeRange = (index: number) => {
    setRowSelection(prev => ({
      ...prev,
      ranges: prev.ranges.filter((_, i) => i !== index)
    }));
  };

  // Individual row handlers
  const handleIndividualRowInput = (value: string) => {
    setIndividualRowInput(value);
  };

  const addIndividualRows = () => {
    const rows = individualRowInput
      .split(',')
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n) && n > 0 && n <= (totalRows || data?.length || 0));
    
    if (rows.length > 0) {
      setRowSelection(prev => ({
        ...prev,
        individualRows: [...new Set([...prev.individualRows, ...rows])].sort((a, b) => a - b)
      }));
      setIndividualRowInput('');
    }
  };

  const removeIndividualRow = (row: number) => {
    setRowSelection(prev => ({
      ...prev,
      individualRows: prev.individualRows.filter(r => r !== row)
    }));
  };

  // Get all selected row numbers
  const getSelectedRows = (): number[] => {
    const selectedRows: number[] = [];
    
    if (rowSelection.mode === 'range') {
      // Only add ranges for range mode
      rowSelection.ranges.forEach(range => {
        for (let i = range.from; i <= range.to; i++) {
          if (i <= (totalRows || data?.length || 0)) {
            selectedRows.push(i);
          }
        }
      });
    } else if (rowSelection.mode === 'individual') {
      // Only add individual rows for individual mode
      selectedRows.push(...rowSelection.individualRows);
    } else if (rowSelection.mode === 'mixed') {
      // Add both ranges and individual rows for mixed mode
      rowSelection.ranges.forEach(range => {
        for (let i = range.from; i <= range.to; i++) {
          if (i <= (totalRows || data?.length || 0)) {
            selectedRows.push(i);
          }
        }
      });
      selectedRows.push(...rowSelection.individualRows);
    }
    
    // Remove duplicates and sort
    return [...new Set(selectedRows)].sort((a, b) => a - b);
  };

  const selectedRows = getSelectedRows();
  const totalSelectedRows = selectedRows.length;

  const handleProcessAddresses = async () => {
    if (!fieldMappings.streetAddress) {
      showToast({ title: 'Mapping Required', description: 'Please map the "Street Address" field.', variant: 'destructive' });
      return;
    }
    if (!selectedAiProvider || !selectedAiModelName) {
      showToast({ title: 'AI Not Configured', description: 'Please select an AI provider and model in AI Settings.', variant: 'destructive'});
      return;
    }

    if (totalSelectedRows === 0) {
      showToast({ title: 'No Rows Selected', description: 'Please select at least one row to process.', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    setIsAppLoading(true);
    setProcessedCount(0);
    setProcessingErrorCount(0);

    // Get the complete dataset from all cached pages
    let completeData: Record<string, any>[] = [];
    
    // If we have cached data for all pages, use that
    if (Object.keys(dataTable).length > 0) {
      // Sort pages and combine all data
      const sortedPages = Object.keys(dataTable).map(Number).sort((a, b) => a - b);
      completeData = sortedPages.flatMap(pageNum => dataTable[pageNum] || []);
    } else {
      // Fallback to current data if no cached pages
      completeData = [...data];
    }
    
    // If we don't have all the data cached, we need to fetch it
    if (totalRows > 0 && completeData.length < totalRows) {
      console.warn(`Address processing: Expected ${totalRows} rows but only have ${completeData.length} rows. Fetching all data...`);
      
      try {
        // Fetch all data from the API
        const carrierId = getCarrierId();
        if (carrierId) {
          const response = await fetch(`/api/data?carrier=${carrierId}`);
          if (response.ok) {
            const payload = await response.json();
            completeData = payload.data || [];
            console.log(`Fetched ${completeData.length} rows for address processing`);
          }
        }
      } catch (error) {
        console.error('Error fetching complete data for address processing:', error);
      }
    }
    
    // Extract only the selected rows (convert from 1-based to 0-based indexing)
    const selectedData = selectedRows.map(rowNum => completeData[rowNum - 1]).filter(Boolean);
    
    const newData = [...completeData]; // Create a mutable copy of the complete data
    setTotalDataLength(selectedData.length); // Set the total length for progress display
    console.log(`Address processing: Processing ${selectedRows.length} selected rows`);
    let currentColumns = [...columns];

    // Define new columns to potentially add
    const newColNames = {
        lat: 'Latitude',
        lon: 'Longitude',
        status: 'AddressProcessStatus',
        reason: 'AddressAIRasoning'
    };

    // Add new columns if they don't exist
    Object.values(newColNames).forEach(newColName => {
        if (!currentColumns.includes(newColName)) {
            currentColumns.push(newColName);
        }
    });
    // If columns were added, update context (this will also trigger a re-render of DataTable)
    if (currentColumns.length > columns.length) {
        setColumns(currentColumns);
    }

    // Process addresses in chunks using batch processing
    for (let chunkStart = 0; chunkStart < selectedData.length; chunkStart += CHUNK_SIZE) {
      const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, selectedData.length);
      const chunk = selectedData.slice(chunkStart, chunkEnd);
      
      // Prepare batch input for the entire chunk
      const batchInput: ProcessAddressesBatchClientInput = {
        addresses: chunk.map(row => ({
          streetAddress: String(row[fieldMappings.streetAddress] ?? ''),
          city: fieldMappings.city ? String(row[fieldMappings.city] ?? '') : undefined,
          state: fieldMappings.state ? String(row[fieldMappings.state] ?? '') : undefined,
          postalCode: fieldMappings.postalCode ? String(row[fieldMappings.postalCode] ?? '') : undefined,
          country: fieldMappings.country ? String(row[fieldMappings.country] ?? '') : undefined,
        })),
        aiProvider: selectedAiProvider,
        aiModelName: selectedAiModelName,
      };

      try {
        // Process the entire chunk in a single API call
        const batchResult = await processAddressesBatch(batchInput);
        
        // Update each row with the results
        chunk.forEach((row, index) => {
          const result = batchResult.results[index];
          const originalRowIndex = selectedRows[chunkStart + index] - 1; // Convert back to 0-based
          
          // Update row with cleaned data and new geocoded data
          if (fieldMappings.streetAddress && result.cleanedStreetAddress !== null) {
            newData[originalRowIndex][fieldMappings.streetAddress] = result.cleanedStreetAddress;
          }
          if (fieldMappings.city && result.cleanedCity !== null) {
            newData[originalRowIndex][fieldMappings.city] = result.cleanedCity;
          }
          if (fieldMappings.state && result.cleanedState !== null) {
            newData[originalRowIndex][fieldMappings.state] = result.cleanedState;
          }
          if (fieldMappings.postalCode && result.cleanedPostalCode !== null) {
            newData[originalRowIndex][fieldMappings.postalCode] = result.cleanedPostalCode;
          }
          if (fieldMappings.country && result.cleanedCountry !== null) {
            newData[originalRowIndex][fieldMappings.country] = result.cleanedCountry;
          }
          
          newData[originalRowIndex][newColNames.lat] = result.latitude;
          newData[originalRowIndex][newColNames.lon] = result.longitude;
          newData[originalRowIndex][newColNames.status] = result.status;
          newData[originalRowIndex][newColNames.reason] = result.aiReasoning;
          
          setProcessedCount(prev => prev + 1);
        });

      } catch (error) {
        console.error(`Error processing chunk starting at ${chunkStart}:`, error);
        
        // Handle error for the entire chunk
        chunk.forEach((row, index) => {
          const originalRowIndex = selectedRows[chunkStart + index] - 1;
          newData[originalRowIndex][newColNames.lat] = null;
          newData[originalRowIndex][newColNames.lon] = null;
          newData[originalRowIndex][newColNames.status] = 'ERROR_CLIENT_SIDE';
          newData[originalRowIndex][newColNames.reason] = `Batch processing error: ${error instanceof Error ? error.message : 'Unknown error'}`;
          setProcessingErrorCount(prev => prev + 1);
          setProcessedCount(prev => prev + 1);
        });
      }
    }

    // Update the main data in context without resetting pagination
    setDataState(newData);
    
    // Preserve current pagination state by updating cached data
    const currentDataTable = dataTable;
    const updatedDataTable = { ...currentDataTable };
    
    // Update ALL pages (not just cached ones) with the new data including lat/lng columns
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const startIndex = (pageNum - 1) * rowsPerPage;
      const endIndex = startIndex + rowsPerPage;
      updatedDataTable[pageNum] = newData.slice(startIndex, endIndex);
    }
    
    // Update the current view data if we're on a valid page
    if (currentPage <= totalPages) {
      const startIndex = (currentPage - 1) * rowsPerPage;
      const endIndex = startIndex + rowsPerPage;
      const currentPageData = newData.slice(startIndex, endIndex);
      setViewData(currentPageData);
    }
    
    setDataTable(updatedDataTable);
    setIsProcessing(false);
    setIsAppLoading(false);
    
    const rowList = selectedRows.length <= 10 
      ? selectedRows.join(', ') 
      : `${selectedRows.slice(0, 5).join(', ')}...${selectedRows.slice(-5).join(', ')}`;
    
    showToast({ 
      title: 'Address Processing Complete', 
      description: `${selectedData.length - processingErrorCount} addresses processed (rows: ${rowList}). ${processingErrorCount} errors.` 
    });
  };
  
  const addressFields: Array<{key: keyof AddressFieldMapping, label: string, required?: boolean}> = [
    { key: 'streetAddress', label: 'Street Address', required: true },
    { key: 'city', label: 'City / Town' },
    { key: 'state', label: 'State / Province / Region' },
    { key: 'postalCode', label: 'Postal / ZIP Code' },
    { key: 'country', label: 'Country' },
  ];

  const maxRows = totalRows || data?.length || 0;

  return (
    <Dialog open={activeDialog === 'addressProcessing'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center"><MapPin className="mr-2 h-5 w-5 text-primary"/>AI Address Processing</DialogTitle>
          <DialogDescription>
            Map your data columns to address fields and select which rows to process. AI will attempt to clean, standardize, and geocode the selected data (add Latitude/Longitude).
            New columns 'Latitude', 'Longitude', 'AddressProcessStatus', and 'AddressAIRasoning' will be added/updated.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] p-1 pr-3">
            <div className="grid gap-4 py-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Row Selection:</p>
                <Badge variant="secondary">
                  {totalSelectedRows} rows selected
                </Badge>
              </div>
              
              <Tabs value={rowSelection.mode} onValueChange={(value) => setRowSelection(prev => ({ ...prev, mode: value as 'range' | 'individual' | 'mixed' }))}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="range">Range Selection</TabsTrigger>
                  <TabsTrigger value="individual">Individual Rows</TabsTrigger>
                  <TabsTrigger value="mixed">Mixed Selection</TabsTrigger>
                </TabsList>
                
                <TabsContent value="range" className="space-y-4">
                  <div className="space-y-3">
                    {rowSelection.ranges.map((range, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Label className="text-xs w-12">From:</Label>
                        <Input
                          type="number"
                          min="1"
                          max={maxRows}
                          value={range.from}
                          onChange={(e) => handleRangeChange(index, 'from', e.target.value)}
                          disabled={isProcessing || isAppLoading}
                          className="w-20 h-8 text-xs"
                        />
                        <Label className="text-xs w-8">To:</Label>
                        <Input
                          type="number"
                          min={range.from}
                          max={maxRows}
                          value={range.to}
                          onChange={(e) => handleRangeChange(index, 'to', e.target.value)}
                          disabled={isProcessing || isAppLoading}
                          className="w-20 h-8 text-xs"
                        />
                        {rowSelection.ranges.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRange(index)}
                            disabled={isProcessing || isAppLoading}
                            className="h-8 w-8 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addRange}
                      disabled={isProcessing || isAppLoading}
                      className="h-8"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Range
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="individual" className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Enter row numbers (e.g., 3, 88, 200, 400)"
                        value={individualRowInput}
                        onChange={(e) => handleIndividualRowInput(e.target.value)}
                        disabled={isProcessing || isAppLoading}
                        className="flex-1 h-8 text-xs"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addIndividualRows}
                        disabled={isProcessing || isAppLoading || !individualRowInput.trim()}
                        className="h-8"
                      >
                        Add
                      </Button>
                    </div>
                    
                    {rowSelection.individualRows.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {rowSelection.individualRows.map((row) => (
                          <Badge key={row} variant="outline" className="flex items-center gap-1">
                            Row {row}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeIndividualRow(row)}
                              disabled={isProcessing || isAppLoading}
                              className="h-4 w-4 p-0 hover:bg-transparent"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="mixed" className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium mb-2">Ranges:</p>
                      <div className="space-y-3">
                        {rowSelection.ranges.map((range, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Label className="text-xs w-12">From:</Label>
                            <Input
                              type="number"
                              min="1"
                              max={maxRows}
                              value={range.from}
                              onChange={(e) => handleRangeChange(index, 'from', e.target.value)}
                              disabled={isProcessing || isAppLoading}
                              className="w-20 h-8 text-xs"
                            />
                            <Label className="text-xs w-8">To:</Label>
                            <Input
                              type="number"
                              min={range.from}
                              max={maxRows}
                              value={range.to}
                              onChange={(e) => handleRangeChange(index, 'to', e.target.value)}
                              disabled={isProcessing || isAppLoading}
                              className="w-20 h-8 text-xs"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeRange(index)}
                              disabled={isProcessing || isAppLoading}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addRange}
                          disabled={isProcessing || isAppLoading}
                          className="h-8"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Range
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs font-medium mb-2">Individual Rows:</p>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Enter row numbers (e.g., 3, 88, 200, 400)"
                            value={individualRowInput}
                            onChange={(e) => handleIndividualRowInput(e.target.value)}
                            disabled={isProcessing || isAppLoading}
                            className="flex-1 h-8 text-xs"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addIndividualRows}
                            disabled={isProcessing || isAppLoading || !individualRowInput.trim()}
                            className="h-8"
                          >
                            Add
                          </Button>
                        </div>
                        
                        {rowSelection.individualRows.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {rowSelection.individualRows.map((row) => (
                              <Badge key={row} variant="outline" className="flex items-center gap-1">
                                Row {row}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeIndividualRow(row)}
                                  disabled={isProcessing || isAppLoading}
                                  className="h-4 w-4 p-0 hover:bg-transparent"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              
              <p className="text-xs text-muted-foreground">
                Total rows available: {maxRows} | Selected: {totalSelectedRows} rows
                {totalSelectedRows > 0 && (
                  <span className="block mt-1">
                    Rows: {selectedRows.length <= 10 
                      ? selectedRows.join(', ') 
                      : `${selectedRows.slice(0, 5).join(', ')}...${selectedRows.slice(-5).join(', ')}`
                    }
                  </span>
                )}
              </p>
            </div>
            
            <p className="text-sm font-medium mt-4">Map Your Columns to Address Fields:</p>
            {addressFields.map(fieldInfo => (
                <div key={fieldInfo.key} className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor={`map-${fieldInfo.key}`} className="text-right text-xs">
                    {fieldInfo.label}
                    {fieldInfo.required ? <span className="text-destructive ml-1">*</span> : ''}
                </Label>
                <Select
                    value={fieldMappings[fieldInfo.key] || NOT_MAPPED_VALUE}
                    onValueChange={(sourceCol) => handleMappingChange(fieldInfo.key, sourceCol)}
                    disabled={isProcessing || isAppLoading}
                >
                    <SelectTrigger id={`map-${fieldInfo.key}`} className="col-span-2 h-8 text-xs">
                    <SelectValue placeholder="Select source column" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value={NOT_MAPPED_VALUE} className="text-xs">-- Not Mapped --</SelectItem>
                    {columns.map((col) => (
                        <SelectItem key={col} value={col} className="text-xs">
                        {col}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                </div>
            ))}
            </div>
        </ScrollArea>
        

        {isProcessing && totalDataLength > 0 && (
          <div className="space-y-2 mt-4">
            <Progress value={(processedCount / totalDataLength) * 100} className="w-full h-2" />
            <p className="text-xs text-muted-foreground text-center">
              Processing {totalSelectedRows} selected rows: {processedCount} of {totalDataLength} rows... ({processingErrorCount > 0 ? `${processingErrorCount} errors` : 'No errors so far'})
            </p>
          </div>
        )}

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={closeDialog} disabled={isProcessing || isAppLoading}>
            Close
          </Button>
          <Button 
            onClick={handleProcessAddresses} 
            disabled={isProcessing || isAppLoading || !fieldMappings.streetAddress || (!selectedAiProvider || !selectedAiModelName) || totalSelectedRows === 0}
          >
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            {isProcessing ? 'Processing...' : `Process ${totalSelectedRows} Selected Rows`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
