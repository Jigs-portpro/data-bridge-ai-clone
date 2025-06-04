
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
import { useAppContext } from '@/hooks/useAppContext';
import { processAddress, type ProcessAddressClientInput, type ProcessAddressOutput } from '@/ai/flows/process-address-flow';
import { MapPin, Loader2, CheckCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';

type AddressFieldMapping = {
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

const NOT_MAPPED_VALUE = "__NOT_MAPPED_PLACEHOLDER__";

export function AddressProcessingDialog() {
  const {
    data,
    columns,
    setData,
    setColumns, // To add new columns like Latitude, Longitude
    activeDialog,
    closeDialog,
    showToast,
    isLoading: isAppLoading, // Renamed to avoid conflict
    setIsLoading: setIsAppLoading, // Renamed to avoid conflict
    selectedAiProvider,
    selectedAiModelName,
  } = useAppContext();

  const [fieldMappings, setFieldMappings] = useState<AddressFieldMapping>({
    streetAddress: '', city: '', state: '', postalCode: '', country: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [processingErrorCount, setProcessingErrorCount] = useState(0);

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
    }
  }, [columns, activeDialog]);

  const handleMappingChange = (addressField: keyof AddressFieldMapping, sourceColumnName: string) => {
    setFieldMappings(prev => ({
      ...prev,
      [addressField]: sourceColumnName === NOT_MAPPED_VALUE ? '' : sourceColumnName,
    }));
  };

  const handleProcessAddresses = async () => {
    if (!fieldMappings.streetAddress) {
      showToast({ title: 'Mapping Required', description: 'Please map the "Street Address" field.', variant: 'destructive' });
      return;
    }
    if (!selectedAiProvider || !selectedAiModelName) {
      showToast({ title: 'AI Not Configured', description: 'Please select an AI provider and model in AI Settings.', variant: 'destructive'});
      return;
    }

    setIsProcessing(true);
    setIsAppLoading(true);
    setProcessedCount(0);
    setProcessingErrorCount(0);

    const newData = [...data]; // Create a mutable copy
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


    for (let i = 0; i < newData.length; i++) {
      const row = newData[i];
      const inputForFlow: Omit<ProcessAddressClientInput, 'aiProvider' | 'aiModelName'> = {
        streetAddress: String(row[fieldMappings.streetAddress] ?? ''),
        city: fieldMappings.city ? String(row[fieldMappings.city] ?? '') : undefined,
        state: fieldMappings.state ? String(row[fieldMappings.state] ?? '') : undefined,
        postalCode: fieldMappings.postalCode ? String(row[fieldMappings.postalCode] ?? '') : undefined,
        country: fieldMappings.country ? String(row[fieldMappings.country] ?? '') : undefined,
      };

      try {
        const result: ProcessAddressOutput = await processAddress({
          ...inputForFlow,
          aiProvider: selectedAiProvider,
          aiModelName: selectedAiModelName,
        });

        // Update row with cleaned data and new geocoded data
        if (fieldMappings.streetAddress && result.cleanedStreetAddress !== null) row[fieldMappings.streetAddress] = result.cleanedStreetAddress;
        if (fieldMappings.city && result.cleanedCity !== null) row[fieldMappings.city] = result.cleanedCity;
        if (fieldMappings.state && result.cleanedState !== null) row[fieldMappings.state] = result.cleanedState;
        if (fieldMappings.postalCode && result.cleanedPostalCode !== null) row[fieldMappings.postalCode] = result.cleanedPostalCode;
        if (fieldMappings.country && result.cleanedCountry !== null) row[fieldMappings.country] = result.cleanedCountry;
        
        row[newColNames.lat] = result.latitude;
        row[newColNames.lon] = result.longitude;
        row[newColNames.status] = result.status;
        row[newColNames.reason] = result.aiReasoning;

      } catch (error) {
        console.error(`Error processing row ${i}:`, error);
        row[newColNames.lat] = null;
        row[newColNames.lon] = null;
        row[newColNames.status] = 'ERROR_CLIENT_SIDE';
        row[newColNames.reason] = `Client-side error during processing: ${error instanceof Error ? error.message : 'Unknown error'}`;
        setProcessingErrorCount(prev => prev + 1);
      }
      setProcessedCount(prev => prev + 1);
    }

    setData(newData); // Update the main data in context
    setIsProcessing(false);
    setIsAppLoading(false);
    showToast({ title: 'Address Processing Complete', description: `${data.length - processingErrorCount} addresses processed. ${processingErrorCount} errors.` });
  };
  
  const addressFields: Array<{key: keyof AddressFieldMapping, label: string, required?: boolean}> = [
    { key: 'streetAddress', label: 'Street Address', required: true },
    { key: 'city', label: 'City / Town' },
    { key: 'state', label: 'State / Province / Region' },
    { key: 'postalCode', label: 'Postal / ZIP Code' },
    { key: 'country', label: 'Country' },
  ];


  return (
    <Dialog open={activeDialog === 'addressProcessing'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center"><MapPin className="mr-2 h-5 w-5 text-primary"/>AI Address Processing</DialogTitle>
          <DialogDescription>
            Map your data columns to address fields. AI will attempt to clean, standardize, and geocode (add Latitude/Longitude).
            New columns 'Latitude', 'Longitude', 'AddressProcessStatus', and 'AddressAIRasoning' will be added/updated.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] p-1 pr-3">
            <div className="grid gap-4 py-4">
            <p className="text-sm font-medium">Map Your Columns to Address Fields:</p>
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
        

        {isProcessing && data.length > 0 && (
          <div className="space-y-2 mt-4">
            <Progress value={(processedCount / data.length) * 100} className="w-full h-2" />
            <p className="text-xs text-muted-foreground text-center">
              Processing row {processedCount} of {data.length}... ({processingErrorCount > 0 ? `${processingErrorCount} errors` : 'No errors so far'})
            </p>
          </div>
        )}

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={closeDialog} disabled={isProcessing || isAppLoading}>
            Close
          </Button>
          <Button 
            onClick={handleProcessAddresses} 
            disabled={isProcessing || isAppLoading || !fieldMappings.streetAddress || (!selectedAiProvider || !selectedAiModelName)}
          >
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            {isProcessing ? 'Processing...' : `Process ${data.length} Addresses`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
