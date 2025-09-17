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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppContext } from '@/hooks/useAppContext';
import { MapPin, Loader2, CheckCircle, AlertTriangle, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface CitySearchResult {
  id: number;
  city: string;
  state_name: string;
  state_id: string;
}

interface CityValidationResult {
  originalCity: string;
  validatedCity: string;
  stateId: string;
  isExactMatch: boolean;
  searchResults: CitySearchResult[];
}

interface RowSelection {
  mode: 'range' | 'individual' | 'mixed';
  ranges: Array<{ from: number; to: number }>;
  individualRows: number[];
}

const NOT_MAPPED_VALUE = "__NOT_MAPPED_PLACEHOLDER__";
const CHUNK_SIZE = 50;

export function CityValidationDialog() {
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
    getApiToken,
    getBaseUrl,
    dataTable,
    setDataTable,
    currentPage,
    totalPages,
    rowsPerPage,
    totalRows,
    setViewData,
    currentCompanyName,
  } = useAppContext();

  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [processingErrorCount, setProcessingErrorCount] = useState(0);
  const [totalDataLength, setTotalDataLength] = useState(0);
  const [currentProcessingStep, setCurrentProcessingStep] = useState('');
  
  // Column mapping state
  const [citiesColumn, setCitiesColumn] = useState<string>('');
  const [showColumnMapping, setShowColumnMapping] = useState(true);
  
  // Row selection state
  const [rowSelection, setRowSelection] = useState<RowSelection>({
    mode: 'range',
    ranges: [{ from: 1, to: 1 }],
    individualRows: []
  });
  
  // Individual row input
  const [individualRowInput, setIndividualRowInput] = useState('');
  
  // City validation results
  const [validationResults, setValidationResults] = useState<CityValidationResult[]>([]);
  const [currentValidationIndex, setCurrentValidationIndex] = useState(0);
  const [showCitySelection, setShowCitySelection] = useState(false);
  const [selectedCityForValidation, setSelectedCityForValidation] = useState<CitySearchResult | null>(null);

  // Auto-detect cities column on mount
  useEffect(() => {
    if (columns.length > 0 && activeDialog === 'cityValidation') {
      // Look for columns that might contain city names
      const possibleColumns = columns.filter(col => 
        col.toLowerCase().includes('city') && 
        !col.toLowerCase().includes('group') &&
        !col.toLowerCase().includes('name')
      );
      
      if (possibleColumns.length > 0) {
        setCitiesColumn(possibleColumns[0]);
      }
    }
  }, [columns, activeDialog]);

  const searchCities = async (searchTerm: string): Promise<CitySearchResult[]> => {
    const token = getApiToken();
    const baseUrl = getBaseUrl();
    
    if (!token) {
      throw new Error('API token is missing');
    }

    const response = await fetch(`${baseUrl}/getCities?limit=10&searchTerm=${encodeURIComponent(searchTerm)}`, {
      method: 'GET',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data || [];
  };

  const validateCitiesInRow = async (rowData: Record<string, any>, rowIndex: number): Promise<CityValidationResult[]> => {
    const citiesValue = rowData[citiesColumn];
    if (!citiesValue) return [];

    // Handle both string and array inputs
    let cities: string[];
    if (Array.isArray(citiesValue)) {
      // Already an array, use as is
      cities = citiesValue.filter(Boolean);
    } else {
      // Handle quoted strings separated by comma (new format)
      if (citiesValue.includes('","')) {
        // Remove all quotes and split by comma
        const cleanString = citiesValue.replace(/"/g, '');
        cities = cleanString.split(',').map((city: string) => city.trim()).filter(Boolean);
      } else if (citiesValue.includes(' : ')) {
        // Handle old : separator format
        cities = citiesValue.split(' : ').map((city: string) => city.trim()).filter(Boolean);
      } else {
        // Handle regular comma separation
        cities = citiesValue.split(',').map((city: string) => city.trim()).filter(Boolean);
      }
    }

    const results: CityValidationResult[] = [];

    for (const city of cities) {
      try {
        const searchResults = await searchCities(city);
        
        if (searchResults.length === 0) {
          results.push({
            originalCity: city,
            validatedCity: city,
            stateId: '',
            isExactMatch: false,
            searchResults: []
          });
        } else if (searchResults.length === 1) {
          // Exact match - use it directly
          results.push({
            originalCity: city,
            validatedCity: `${searchResults[0].city}, ${searchResults[0].state_id}`,
            stateId: searchResults[0].state_id,
            isExactMatch: true,
            searchResults: searchResults
          });
        } else {
          // Multiple matches - need user selection
          results.push({
            originalCity: city,
            validatedCity: city, // Keep original until user selects
            stateId: '',
            isExactMatch: false,
            searchResults: searchResults
          });
        }
      } catch (error) {
        console.error(`Error validating city "${city}":`, error);
        results.push({
          originalCity: city,
          validatedCity: city,
          stateId: '',
          isExactMatch: false,
          searchResults: []
        });
      }
    }

    return results;
  };

  const processCitiesValidation = async () => {
    if (!citiesColumn) {
      showToast({
        title: "Error",
        description: "Please select a column containing city names.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setProcessedCount(0);
    setProcessingErrorCount(0);
    setValidationResults([]);
    setCurrentValidationIndex(0);

    try {
      // Get all rows to process
      const allRows = Object.values(dataTable).flat();
      const totalRows = allRows.length;
      setTotalDataLength(totalRows);

      const allValidationResults: CityValidationResult[] = [];
      let processed = 0;
      let errors = 0;

      for (let i = 0; i < allRows.length; i++) {
        const rowData = allRows[i];
        setCurrentProcessingStep(`Processing row ${i + 1} of ${totalRows}`);
        
        try {
          const rowValidationResults = await validateCitiesInRow(rowData, i);
          allValidationResults.push(...rowValidationResults);
          processed++;
        } catch (error) {
          console.error(`Error processing row ${i + 1}:`, error);
          errors++;
        }

        setProcessedCount(processed);
        setProcessingErrorCount(errors);
      }

      setValidationResults(allValidationResults);
      
      // Check if we need user input for any cities
      const needsUserInput = allValidationResults.some(result => 
        result.searchResults.length > 1 && !result.isExactMatch
      );

      if (needsUserInput) {
        setShowCitySelection(true);
        setCurrentValidationIndex(0);
      } else {
        // All cities were automatically validated
        await applyValidationResults(allValidationResults);
      }

    } catch (error) {
      console.error('Error during city validation:', error);
      showToast({
        title: "Error",
        description: "An error occurred during city validation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };


  const saveDataToDatabase = async (updatedData: Record<string, any>[]) => {
    try {
      const response = await fetch(`/api/update?carrier=${encodeURIComponent(currentCompanyName || '')}&page=1&limit=500&data=${encodeURIComponent(JSON.stringify(updatedData))}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Failed to save data to database:', response.statusText);
        return false;
      }

      const result = await response.json();
      console.log('Data saved to database successfully:', result);
      return true;
    } catch (error) {
      console.error('Error saving data to database:', error);
      return false;
    }
  };

  const applyValidationResults = async (results: CityValidationResult[]) => {
    // Work with structured dataTable instead of flat data array
    const updatedDataTable = { ...dataTable };
    let resultIndex = 0;

    // Process each row in the structured data
    for (const pageKey in updatedDataTable) {
      const pageData = updatedDataTable[pageKey];
      
      for (let i = 0; i < pageData.length; i++) {
        const rowData = pageData[i];
        const citiesValue = rowData[citiesColumn];
        
        if (citiesValue) {
          // Handle both string and array inputs
          let cities: string[];
          if (Array.isArray(citiesValue)) {
            cities = citiesValue.filter(Boolean);
          } else {
            // Handle quoted strings separated by comma (new format)
            if (citiesValue.includes('","')) {
              // Remove all quotes and split by comma
              const cleanString = citiesValue.replace(/"/g, '');
              cities = cleanString.split(',').map((city: string) => city.trim()).filter(Boolean);
            } else if (citiesValue.includes(' : ')) {
              // Handle old : separator format
              cities = citiesValue.split(' : ').map((city: string) => city.trim()).filter(Boolean);
            } else {
              // Handle regular comma separation
              cities = citiesValue.split(',').map((city: string) => city.trim()).filter(Boolean);
            }
          }
          
          const rowResults = results.slice(resultIndex, resultIndex + cities.length);
          
          // Store validated cities as simple comma-separated string
          const validatedCities = rowResults.map(result => result.validatedCity);
          const citiesString = validatedCities.join(', ');
          console.log('CityValidationDialog - Storing cities as string:', citiesString);
          
          // Update the row with the cities string
          updatedDataTable[pageKey][i] = {
            ...rowData,
            [citiesColumn]: citiesString // Store as simple comma-separated string
          };
          
          // Debug: Verify what was stored
          
          console.log('Type of stored value:', typeof updatedDataTable[pageKey][i][citiesColumn], Array.isArray(updatedDataTable[pageKey][i][citiesColumn]));
          
          resultIndex += cities.length;
        }
      }
    }

    // Update both dataTable and data structures
    setDataTable(updatedDataTable);
    
    // Also update the flat data array for consistency
    const flatData = Object.values(updatedDataTable).flat();
    setData(flatData);
    
    // Save the updated data to the database
    const saveSuccess = await saveDataToDatabase(flatData);
    if (!saveSuccess) {
      showToast({
        title: "Warning",
        description: "Cities were validated but failed to save to database. Please try again.",
        variant: "destructive"
      });
      return;
    }
    
    showToast({
      title: "City Validation Complete",
      description: "The selected cities have been validated and updated.",
    });
    setIsProcessing(false);
    closeDialog();
  };

  const handleCitySelection = (selectedCity: CitySearchResult) => {
    setSelectedCityForValidation(selectedCity);
  };

  const confirmCitySelection = async () => {
    if (!selectedCityForValidation) return;

    const currentResult = validationResults[currentValidationIndex];
    const updatedResults = [...validationResults];
    updatedResults[currentValidationIndex] = {
      ...currentResult,
      validatedCity: `${selectedCityForValidation.city}, ${selectedCityForValidation.state_id}`,
      stateId: selectedCityForValidation.state_id,
      isExactMatch: true
    };

    setValidationResults(updatedResults);
    setSelectedCityForValidation(null);

    // Move to next city that needs selection
    const nextIndex = updatedResults.findIndex((result, index) => 
      index > currentValidationIndex && result.searchResults.length > 1 && !result.isExactMatch
    );

    if (nextIndex === -1) {
      // All cities have been processed
      setShowCitySelection(false);
      applyValidationResults(updatedResults);
    } else {
      setCurrentValidationIndex(nextIndex);
    }
  };

  const skipCitySelection = async () => {
    // Move to next city that needs selection
    const nextIndex = validationResults.findIndex((result, index) => 
      index > currentValidationIndex && result.searchResults.length > 1 && !result.isExactMatch
    );

    if (nextIndex === -1) {
      // All cities have been processed
      setShowCitySelection(false);
      await applyValidationResults(validationResults);
    } else {
      setCurrentValidationIndex(nextIndex);
    }
  };

  const startValidation = () => {
    if (!citiesColumn) {
      showToast({
        title: "Error",
        description: "Please select a column containing city names.",
        variant: "destructive"
      });
      return;
    }
    setShowColumnMapping(false);
    processCitiesValidation();
  };

  const currentResult = validationResults[currentValidationIndex];

  return (
    <Dialog open={activeDialog === 'cityValidation'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            City Validation
          </DialogTitle>
          <DialogDescription>
            Validate and standardize city names using the PortPro cities database.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {showColumnMapping && (
            <div className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cities-column" className="text-sm font-medium">
                    Select Column Containing City Names
                  </Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Choose the column that contains the individual city names (not the group name).
                  </p>
                  <Select value={citiesColumn} onValueChange={setCitiesColumn}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a column..." />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((column) => (
                        <SelectItem key={column} value={column}>
                          {column}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {citiesColumn && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Preview of selected column:</p>
                    <div className="text-sm text-muted-foreground">
                      {data.slice(0, 3).map((row, index) => (
                        <div key={index} className="truncate">
                          Row {index + 1}: {Array.isArray(row[citiesColumn]) 
                            ? row[citiesColumn].join(', ') 
                            : row[citiesColumn] || '(empty)'
                          }
                        </div>
                      ))}
                      {data.length > 3 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          ... and {data.length - 3} more rows
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={startValidation} 
                  disabled={!citiesColumn}
                  className="w-full"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Start City Validation
                </Button>
              </div>
            </div>
          )}

          {!showColumnMapping && !isProcessing && !showCitySelection && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Ready to Validate Cities</h3>
                <p className="text-muted-foreground mb-4">
                  This tool will search for each city in your data and match it with the official cities database.
                </p>
                <Button onClick={processCitiesValidation} className="w-full">
                  <Search className="h-4 w-4 mr-2" />
                  Start City Validation
                </Button>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-4">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Validating Cities</h3>
                <p className="text-muted-foreground">{currentProcessingStep}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{processedCount} / {totalDataLength}</span>
                </div>
                <Progress value={(processedCount / totalDataLength) * 100} className="w-full" />
              </div>

              {processingErrorCount > 0 && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{processingErrorCount} errors occurred</span>
                </div>
              )}
            </div>
          )}

          {showCitySelection && currentResult && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Select Correct City</CardTitle>
                  <CardDescription>
                    Multiple matches found for: <strong>"{currentResult.originalCity}"</strong>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={selectedCityForValidation?.id.toString() || ''}
                    onValueChange={(value) => {
                      const city = currentResult.searchResults.find(c => c.id.toString() === value);
                      if (city) handleCitySelection(city);
                    }}
                    className="space-y-3"
                  >
                    {currentResult.searchResults.map((city) => (
                      <div key={city.id} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                        <RadioGroupItem value={city.id.toString()} id={city.id.toString()} />
                        <Label htmlFor={city.id.toString()} className="flex-1 cursor-pointer">
                          <div className="font-medium">{city.city}</div>
                          <div className="text-sm text-muted-foreground">
                            {city.state_name} ({city.state_id})
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={skipCitySelection}>
                  Skip
                </Button>
                <Button 
                  onClick={confirmCitySelection} 
                  disabled={!selectedCityForValidation}
                >
                  Confirm Selection
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={closeDialog}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
