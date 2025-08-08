import { useCallback, useState } from 'react';
import { useAppContext } from '@/hooks/useAppContext';
import { useSelector, useDispatch } from 'react-redux';
import { AUTH_TOKEN_STORAGE_KEY, wrapPayloadInDataArray, LookupKeyMapper, radiusRate, nonRulesConstant, unitOfMeasureOptions, requiresNullValueFiltering } from '@/lib/constants';
import { objectsToCsv } from "@/lib/csvUtils";
import { transformPayload, filterNullValues } from "@/utils/fieldMapper";
import { setFailedRows, setShowFailedRows, setErrorRows, setErrorCells, setErrorMessages, setTotalErrorCount, setPageValidationStatus, setHasValidated } from '@/store/slices/exportDataSlice';
import { isValid, parseISO } from 'date-fns';
import type { RootState } from '@/store';
import { isValidDateString, convertDateForPayload, getDateFormatForField } from '@/utils/dateUtils';

// Type for failed rows with email conflict information
type FailedRow = {
  row: Record<string, any>;
  error: string;
  isEmailConflict?: boolean;
  emailField?: string;
  emailValue?: string;
  errorFields?: string[]; // Specific fields that have errors
  errorDetails?: Record<string, string>; // Detailed error information
};

// Utility functions

const isAllLookupValue = (value: string, lookupName: string): boolean => {
  if (!value || typeof value !== 'string') return false;
  const normalizedValue = value.toLowerCase().trim();
  const normalizedLookupName = lookupName.toLowerCase().trim();
  
  return (
    normalizedValue === 'all' ||
    normalizedValue === `all ${normalizedLookupName}` ||
    normalizedValue === `all ${normalizedLookupName}s` ||
    normalizedValue === `${normalizedLookupName} all` ||
    normalizedValue === `${normalizedLookupName}s all`
  );
};

const getAllLookupValues = (lookupData: any[], lookupField: string): string[] => {
  if (!lookupData || !Array.isArray(lookupData) || lookupData.length === 0) {
    return [];
  }
  
  return lookupData
    .map(item => String(item[lookupField] || '').trim())
    .filter(value => value !== '');
};

export const useExport = (lookupDataSources: any, validChargeProfileList: any[]) => {
  const [isExporting, setIsExporting] = useState(false);
  const dispatch = useDispatch();
  
  const { 
    showToast,
    setIsLoading: setAppContextIsLoading,
    data,
    columns,
    viewData,
    setViewData,
    dataTable,
    currentPage,
    rowsPerPage,
    totalRows,
    datatableEditedCells,
    getCarrierId,
    customerData,
    driverGroupsData,
    branchesData,
    carrierGroupsData
  } = useAppContext();
  
  const { selectedEntityId, fieldMappings, allPagesValidated } = useSelector((state: RootState) => state.exportData);

  // Helper function to apply edits from datatableEditedCells to data
  const applyEditsToData = useCallback((originalData: Record<string, any>[], editedCells: Set<string>): Record<string, any>[] => {
    if (!editedCells || editedCells.size === 0) {
      return originalData;
    }

    const editedData = [...originalData];
    
    editedCells.forEach((cellKey) => {
      const [rowIndexStr, columnName] = cellKey.split(':');
      const rowIndex = parseInt(rowIndexStr, 10);
      
      if (rowIndex >= 0 && rowIndex < editedData.length && columnName) {
        let editedValue = null;
        
        const currentPageStartIndex = (currentPage - 1) * rowsPerPage;
        const currentPageEndIndex = currentPageStartIndex + rowsPerPage - 1;
        
        if (rowIndex >= currentPageStartIndex && rowIndex <= currentPageEndIndex) {
          const viewDataIndex = rowIndex - currentPageStartIndex;
          if (viewData[viewDataIndex] && viewData[viewDataIndex].hasOwnProperty(columnName)) {
            editedValue = viewData[viewDataIndex][columnName];
          }
        } else {
          const pageNumber = Math.floor(rowIndex / rowsPerPage) + 1;
          const pageRowIndex = rowIndex % rowsPerPage;
          
          if (dataTable[pageNumber] && dataTable[pageNumber][pageRowIndex] && 
              dataTable[pageNumber][pageRowIndex].hasOwnProperty(columnName)) {
            editedValue = dataTable[pageNumber][pageRowIndex][columnName];
          }
        }
        
        if (editedValue !== null) {
          editedData[rowIndex] = {
            ...editedData[rowIndex],
            [columnName]: editedValue
          };
        }
      }
    });
    
    return editedData;
  }, [viewData, dataTable, currentPage, rowsPerPage]);

  // Get all data for export (not just current page) - now includes edits
  const getAllDataForExport = useCallback(async (): Promise<Record<string, any>[]> => {
    try {
      const updatedDataTable = { ...dataTable };
      if (viewData.length > 0) {
        updatedDataTable[currentPage] = [...viewData];
      }

      // Step 2: Combine all DataTable pages
      const totalPagesNeeded = Math.ceil(totalRows / rowsPerPage);
      const allPageData: Record<string, any>[] = [];
      
      for (let page = 1; page <= totalPagesNeeded; page++) {
        if (updatedDataTable[page]) {
          allPageData.push(...updatedDataTable[page]);
        }
      }

      // Step 3: Apply edits from datatableEditedCells
      if (datatableEditedCells.size === 0) {
        return allPageData;
      }

      const editedData = [...allPageData];
      
      datatableEditedCells.forEach((cellKey) => {
        const [rowIndexStr, columnName] = cellKey.split(':');
        const rowIndex = parseInt(rowIndexStr, 10);
        
        if (rowIndex >= 0 && rowIndex < editedData.length && columnName) {
          const currentPageStartIndex = (currentPage - 1) * rowsPerPage;
          const currentPageEndIndex = currentPageStartIndex + rowsPerPage - 1;
          
          let editedValue = null;
          
          if (rowIndex >= currentPageStartIndex && rowIndex <= currentPageEndIndex) {
            const viewDataIndex = rowIndex - currentPageStartIndex;
            if (viewData[viewDataIndex]?.[columnName] !== undefined) {
              editedValue = viewData[viewDataIndex][columnName];
            }
          } else {
            const pageNumber = Math.floor(rowIndex / rowsPerPage) + 1;
            const pageRowIndex = rowIndex % rowsPerPage;
            
            if (updatedDataTable[pageNumber]?.[pageRowIndex]?.[columnName] !== undefined) {
              editedValue = updatedDataTable[pageNumber][pageRowIndex][columnName];
            }
          }
          
          if (editedValue !== null) {
            editedData[rowIndex] = {
              ...editedData[rowIndex],
              [columnName]: editedValue
            };
          }
        }
      });
      
      return editedData;
    } catch (error) {
      console.error('Error getting all data for export:', error);
      return applyEditsToData(data, datatableEditedCells);
    }
  }, [dataTable, viewData, currentPage, totalRows, rowsPerPage, datatableEditedCells, data, applyEditsToData]);

  // Transform data for export with lookup transformations
  const transformDataForExport = useCallback(async (exportConfig: any) => {
    if (!selectedEntityId || !exportConfig || !columns.length) return [];
    const selectedEntity = exportConfig.entities.find((e: any) => e.id === selectedEntityId);
    if (!selectedEntity) return [];

    const getLookupData = (lookupId: string): any[] | null => {
      let key = LookupKeyMapper[lookupId] ?? lookupId;
      const source = lookupDataSources[key];
      return source ? source.getData() : null;
    };

    const allDataForExport = await getAllDataForExport();
    
    return allDataForExport.map((row) => {
      const transformedRow: Record<string, any> = {};
      selectedEntity.fields.forEach((targetField: any) => {
        const sourceColumnName = fieldMappings[targetField.name];
        if (sourceColumnName && columns.includes(sourceColumnName)) {
          let valueToTransform = row[sourceColumnName];
          const stringValue = valueToTransform === null || valueToTransform === undefined ? "" : String(valueToTransform).trim();

          const isMultiValue = targetField?.isMulti;
          let list: string[] = [];

          if (isMultiValue) {
            list = stringValue?.split(",").map((d) => d?.trim());
          }

          let exportValue: any = isMultiValue ? [] : stringValue;

          if (targetField.lookupValidation && stringValue !== "") {
            const { lookupId, lookupField } = targetField.lookupValidation;
            const lookupData = getLookupData(lookupId);

            if (lookupData && lookupData.length > 0) {
              const lookupSource = lookupDataSources[lookupId];
              const lookupName = lookupSource?.name || lookupId;
              
              if (isAllLookupValue(stringValue, lookupName)) {
                const allLookupValues = getAllLookupValues(lookupData, lookupField);
                
                if (isMultiValue) {
                  allLookupValues.forEach((lookupValue) => {
                    const match = lookupData.find((ld) => String(ld[lookupField]).trim() === lookupValue);
                    if (match && match._id) {
                      exportValue.push(match._id);
                    } else if (match && match.id) {
                      exportValue.push(match.id);
                    }
                  });
                  exportValue = JSON.stringify(exportValue);
                } else {
                  const allIds = allLookupValues
                    .map((lookupValue) => {
                      const match = lookupData.find((ld) => String(ld[lookupField]).trim() === lookupValue);
                      if (match && match._id) {
                        return match._id;
                      } else if (match && match.id) {
                        return match.id;
                      }
                      return null;
                    })
                    .filter(id => id !== null);
                  exportValue = allIds;
                }
              } else {
                if (isMultiValue) {
                  list?.forEach((item) => {
                    const match = lookupData.find((ld) => String(ld[lookupField]).trim() === item);
                    if (match && match._id) {
                      exportValue.push(match._id);
                    } else if (match && match.id) {
                      exportValue.push(match.id);
                    } else {
                      exportValue.push(stringValue);
                    }
                  });
                  exportValue = JSON.stringify(exportValue);
                } else {
                  if (stringValue.includes(',')) {
                    // For Fleet Owners, don't split comma-separated values as they represent single entity names
                    const lookupSource = lookupDataSources[lookupId];
                    const lookupSourceName = lookupSource?.name || lookupId;
                    
                    if (lookupSourceName === "Fleet Owners") {
                      // Treat the entire value as a single entity name
                      const match = lookupData.find((ld) => {
                        return String(ld[lookupField]).trim() === stringValue.trim();
                      });
                      if (match && match._id) {
                        exportValue = match._id;
                      } else if (match && match.id) {
                        exportValue = match.id;
                      } else {
                        // If no ID field, fallback to original value
                        exportValue = stringValue;
                      }
                    } else {
                      // For other lookups, split by comma as usual
                      const commaSeparatedValues = stringValue.split(',').map(value => value.trim()).filter(value => value);
                      
                      const validIds = commaSeparatedValues
                        .map(value => {
                          const match = lookupData.find((ld) => String(ld[lookupField]).trim() === value);
                          if (match && match._id) {
                            return match._id;
                          } else if (match && match.id) {
                            return match.id;
                          }
                          return null;
                        })
                        .filter(id => id !== null);
                      
                      exportValue = validIds;
                    }
                  } else {
                    const match = lookupData.find((ld) => String(ld[lookupField]).trim() === stringValue);

                    if(lookupId === "chargeCodes") {
                      exportValue = {
                        chargeCode: match?.chargeName,
                        chargeName: match?.value,
                      };
                    } else if (match && match._id) {
                      exportValue = match._id;
                    } else if (match && match.id) {
                      exportValue = match.id;
                    } else {
                      exportValue = stringValue;
                    }
                  }
                }
              }
            }
          } else if (stringValue && isMultiValue) {
            exportValue = [stringValue];
          }

          if (stringValue === "" && !targetField.required) {
            transformedRow[targetField.name] = null;
          } else {
            switch (targetField.type) {
              case "boolean":
                transformedRow[targetField.name] = exportValue.toLowerCase() === "true" || exportValue === "1";
                break;
              case "number":
                const num = parseFloat(exportValue);
                transformedRow[targetField.name] = isNaN(num) ? targetField.required ? 0 : null : num;
                break;
              case "date":
                if (isValidDateString(exportValue)) {
                  const targetFormat = getDateFormatForField(selectedEntity.id, targetField.name);
                  const convertedDate = convertDateForPayload(exportValue, targetFormat);
                  transformedRow[targetField.name] = convertedDate || (targetField.required ? exportValue : null);
                } else {
                  transformedRow[targetField.name] = targetField.required ? exportValue : null;
                }
                break;
              default:
                transformedRow[targetField.name] = exportValue;
                break;
            }
          }
        } else {
          transformedRow[targetField.name] = null;
        }
      });

      const finalRowForExport: Record<string, any> = {};
      selectedEntity.fields.forEach((tf: any) => {
        if(tf.name === "Charge Name" && transformedRow.hasOwnProperty("Charge Name")) {
          const chargeNameValue = transformedRow['Charge Name'];
          finalRowForExport['Charge Name'] = chargeNameValue?.chargeName;
          finalRowForExport['Charge Code'] = chargeNameValue?.chargeCode;
        } else {
          finalRowForExport[tf.name] = transformedRow.hasOwnProperty(tf.name) ? transformedRow[tf.name] : null;
        }
      });
      return finalRowForExport;
    });
  }, [getAllDataForExport, columns, fieldMappings, selectedEntityId, lookupDataSources]);

  // Export to API
  const handleExportToApi = useCallback(async (exportConfig: any) => {
    
    if (!allPagesValidated) {
      showToast({
        title: "Validation Required",
        description: "Please validate all pages of data successfully before exporting to API.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedEntityId || !exportConfig) return;
    
    const selectedEntity = exportConfig.entities.find((e: any) => e.id === selectedEntityId);
    if (!selectedEntity) return;

    const selectedEntityName = selectedEntity.id;
    const isChargeProfileEntity = selectedEntityName === "Charge Profile";
    const carrierId = getCarrierId();

    setIsExporting(true);
    setAppContextIsLoading(true);

    try {
      const dataToExport = await transformDataForExport(exportConfig);
      
      let mappedPayload = await transformPayload(
        dataToExport, 
        selectedEntity, 
        carrierId || undefined, 
        customerData || undefined, 
        driverGroupsData || undefined, 
        branchesData || undefined, 
        carrierGroupsData || undefined, 
        validChargeProfileList || undefined
      );

      const authToken = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
      const requestHeaders: HeadersInit = {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
      };
      if (authToken) requestHeaders["Authorization"] = `Bearer ${authToken}`;

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URI || "https://api.axle.network";
      const fullApiUrl = (baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl) +
        (selectedEntity.url.startsWith("/") ? selectedEntity.url : "/" + selectedEntity.url);

      const isBulkUpload = selectedEntity?.isBulkUpload || fullApiUrl.includes("bulkupload");
      
      let vendorType = dataToExport[0]?.['Vendor'];
      if(vendorType) vendorType = vendorType?.toLowerCase();

      let failed: FailedRow[] = [];
      let successCount = 0;

      if (isBulkUpload) {
        let payload: any = {};

        if (Array.isArray(mappedPayload) && isChargeProfileEntity) {
          const nameMap = new Map<string, any>();
          for (const row of mappedPayload) {
            if (row && typeof row.name === "string") {
              if (!nameMap.has(row.name)) {
                nameMap.set(row.name, { ...row, charges: Array.isArray(row.charges) ? [...row.charges] : [] });
              } else {
                const existing = nameMap.get(row.name);
                if (Array.isArray(row.charges)) {
                  existing.charges = existing.charges.concat(row.charges);
                }
              }
            }
          }
          mappedPayload = Array.from(nameMap.values());
        } 

        if(isChargeProfileEntity) {
          payload = {
            chargeProfiles: mappedPayload,
            ...(vendorType && { vendorType }),
          }
        } else {
          // Apply null value filtering for specified entities in bulk upload
          let processedPayload = mappedPayload;
          if (requiresNullValueFiltering(selectedEntity.name)) {
            if (Array.isArray(mappedPayload)) {
              processedPayload = mappedPayload.map((item: any) => filterNullValues(item)).filter((item: any) => item !== undefined);
            } else if (mappedPayload && typeof mappedPayload === 'object' && 'rateRecords' in mappedPayload) {
              processedPayload = {
                ...mappedPayload,
                rateRecords: mappedPayload.rateRecords.map((item: any) => filterNullValues(item)).filter((item: any) => item !== undefined)
              };
            }
          }
          
          payload = wrapPayloadInDataArray(processedPayload, selectedEntity.name);
        }

        try {
          const response = await fetch(fullApiUrl, {
            method: "POST",
            headers: requestHeaders,
            body: JSON.stringify(payload),
          });

          // Parse response regardless of status code
            const responseData = await response.json();
            
          // Handle validation errors from API response
          if (response.status === 400 && responseData.message && !responseData.data?.rejected) {
            // Parse validation error messages like "0.customRole must be a string. data[1].customRole must be a string..."
            const validationErrors = responseData.message.split('. ');
            
            for (const errorMsg of validationErrors) {
              if (errorMsg.trim()) {
                // Extract row index and field name from error message
                // Handle both formats: "1.customRole" and "data[2].customRole"
                const match = errorMsg.match(/^(?:data\[)?(\d+)(?:\])?\.(\w+)\s+must\s+be\s+a\s+(\w+)/);
                if (match) {
                  const rowIndex = parseInt(match[1], 10);
                  const fieldName = match[2];
                  const expectedType = match[3];
                  
                  // Find the corresponding row in the original data
                  if (rowIndex >= 0 && rowIndex < dataToExport.length) {
                    const originalRow = dataToExport[rowIndex];
                    failed.push({
                      row: originalRow,
                      error: `${fieldName} must be a ${expectedType}`,
                      errorFields: [fieldName],
                      errorDetails: { [fieldName]: `must be a ${expectedType}` }
                    });
                  }
                } else {
                  // Handle other validation error formats
                  failed.push({
                    row: dataToExport[0] || {}, // Fallback to first row if can't determine
                    error: errorMsg.trim(),
                    errorFields: [],
                    errorDetails: { general: errorMsg.trim() }
                  });
                }
              }
            }
          } else if (!response.ok) {
            // Handle other non-200 responses that don't have the expected error structure
            const errorMessage = responseData.message || responseData.error || `HTTP ${response.status}`;
            failed.push({
              row: dataToExport[0] || {},
              error: errorMessage,
              errorFields: [],
              errorDetails: { general: errorMessage }
            });
          }
            
          // Process rejected rows and keep them in the data table
            if (isChargeProfileEntity && Array.isArray(responseData?.data?.inValidList) && responseData.data.inValidList.length > 0) {
              for (const item of responseData.data.inValidList) {
                let errorMessages: string[] = [];
                if (item.ruleErrorMessages) {
                  for (const [field, messages] of Object.entries(item.ruleErrorMessages)) {
                    if (Array.isArray(messages)) {
                      errorMessages.push(...messages);
                    }
                  }
                }
                if (errorMessages.length === 0 && item.errors) {
                  for (const [field, msg] of Object.entries(item.errors)) {
                    errorMessages.push(`${field}: ${msg}`);
                  }
                }
                const { ruleErrorMessages, errors, ...rest } = item;
                failed.push({
                  row: rest,
                  error: errorMessages.join(", "),
                });
              }
            }

            if (responseData?.data?.rejected) {
              for (const item of responseData.data.rejected) {
                const all_errors = Object.keys(item.errors).map((key) => {
                  return `${item[key]}: ${item.errors[key]}`;
                });
                const { errors, ...rest } = item;
                failed.push({
                  row: rest,
                  error: all_errors.join(", "),
                errorFields: Object.keys(errors), // Store the specific error fields
                errorDetails: errors // Store the full error details
                });
              }
            }

                    // Handle failed rows - keep them in the data table for validation errors
          if (failed.length > 0) {
            
            // For validation errors (400 status), remove successful rows and keep only failed ones
            if (response.status === 400 && !responseData.data?.rejected) {
              // Create a set of failed row indices for efficient lookup
              const failedRowIndices = new Set<number>();
              
              // Extract row indices from validation error messages
              if (responseData.message) {
                const validationErrors = responseData.message.split('. ');
                for (const errorMsg of validationErrors) {
                  if (errorMsg.trim()) {
                    const match = errorMsg.match(/^(?:data\[)?(\d+)(?:\])?\.(\w+)\s+must\s+be\s+a\s+(\w+)/);
                    if (match) {
                      const rowIndex = parseInt(match[1], 10);
                      if (rowIndex >= 0 && rowIndex < dataToExport.length) {
                        failedRowIndices.add(rowIndex);
                      }
                    }
                  }
                }
              }
              
              // Filter out successful rows (keep only failed rows)
              const updatedViewData = viewData.filter((_, index) => {
                // Calculate the actual row index in the original data
                const actualRowIndex = (currentPage - 1) * rowsPerPage + index;
                return failedRowIndices.has(actualRowIndex);
              });
              
              setViewData(updatedViewData);
            } else {
              // For other types of errors, remove successful rows and keep only failed ones
              // Create a set of failed row identifiers for efficient lookup
              const failedRowIdentifiers = new Set();
              failed.forEach(failedRow => {
                const email = failedRow.row.email || failedRow.row.Email || failedRow.row['Email*'];
                const firstName = failedRow.row.firstName || failedRow.row['First Name'] || failedRow.row['First Name*'];
                const lastName = failedRow.row.lastName || failedRow.row['Last Name'] || failedRow.row['Last Name*'];
                
                if (email) {
                  failedRowIdentifiers.add(email);
                } else if (firstName && lastName) {
                  failedRowIdentifiers.add(`${firstName}_${lastName}`);
                }
              });
              
              // Filter out successful rows (keep only failed rows)
              const updatedViewData = viewData.filter(dataRow => {
                const email = dataRow.email || dataRow.Email || dataRow['Email*'];
                const firstName = dataRow.firstName || dataRow['First Name'] || dataRow['First Name*'];
                const lastName = dataRow.lastName || dataRow['Last Name'] || dataRow['Last Name*'];
                
                if (email && failedRowIdentifiers.has(email)) {
                  return true; // Keep failed row
                } else if (firstName && lastName && failedRowIdentifiers.has(`${firstName}_${lastName}`)) {
                  return true; // Keep failed row
                }
                
                return false; // Remove successful row
              });
              
              setViewData(updatedViewData);
            }
            
                                      // Process failed rows for highlighting in bulk upload
             const processFailedRowsForHighlighting = () => {
  
               const errorRows = new Set<number>();
               const errorCells: Record<string, string[]> = {};
               const errorMessages: Record<string, string> = {};
               
               failed.forEach((failedRow, index) => {
              
              // Find the row index in the original data using a more reliable method
              let rowIndex = -1;
                
                // Extract email from error message if available (e.g., "ram@test.com: Email already exists")
                let extractedEmail = null;
                if (failedRow.error && failedRow.error.includes(':')) {
                  const emailMatch = failedRow.error.match(/^([^:]+):/);
                  if (emailMatch) {
                    extractedEmail = emailMatch[1].trim();
                  }
                }
                
                // Try to find the row by matching key fields
                for (let i = 0; i < dataToExport.length; i++) {
                  const originalRow = dataToExport[i];
                  
                  // Check if this is the same row by comparing key fields
                  const keyFields = ['Email', 'email', 'Login Email Address', 'Tender Email Address 1', 'Company Name', 'Profile Name'];
                  let hasMatchingKey = false;
                  
                  for (const keyField of keyFields) {
                    if (originalRow[keyField] && failedRow.row[keyField]) {
                      if (originalRow[keyField] === failedRow.row[keyField]) {
                        hasMatchingKey = true;
                        break;
                      }
                    }
                  }
                  
                  // Check email field variations (with and without asterisk)
                  if (!hasMatchingKey) {
                    const originalEmail = originalRow.email || originalRow.Email || originalRow['Email*'];
                    const failedEmail = failedRow.row.email || failedRow.row.Email || failedRow.row['Email*'];
                    if (originalEmail && failedEmail && originalEmail.toLowerCase() === failedEmail.toLowerCase()) {
                      hasMatchingKey = true;
                    }
                  }
                  
                  if (hasMatchingKey) {
                    rowIndex = i;
                    break;
                  }
                }
                
                // If still not found, try to find by extracted email from error message
                if (rowIndex === -1 && extractedEmail) {
                  for (let i = 0; i < dataToExport.length; i++) {
                    const originalRow = dataToExport[i];
                    const emailFields = ['Email', 'email', 'Login Email Address', 'Tender Email Address 1'];
                    
                    for (const emailField of emailFields) {
                      if (originalRow[emailField] === extractedEmail) {
                        rowIndex = i;
                        break;
                      }
                    }
                    if (rowIndex !== -1) break;
                  }
                }
                
                // If still not found, try to find by email value directly
                if (rowIndex === -1 && failedRow.emailValue) {
                  for (let i = 0; i < dataToExport.length; i++) {
                    const originalRow = dataToExport[i];
                    const emailFields = ['Email', 'email', 'Login Email Address', 'Tender Email Address 1'];
                    
                    for (const emailField of emailFields) {
                      if (originalRow[emailField] === failedRow.emailValue) {
                        rowIndex = i;
                        break;
                      }
                    }
                    if (rowIndex !== -1) break;
                  }
                }
                
                // If still not found and we have multiple rows, try to find by multiple key fields
                if (rowIndex === -1 && dataToExport.length > 1) {
                  for (let i = 0; i < dataToExport.length; i++) {
                    const originalRow = dataToExport[i];
                    const failedRowData = failedRow.row;
                    
                    // Check multiple fields to ensure we have the right row
                    const matchFields = [
                      'Email', 'email', 'Email*',
                      'First Name', 'firstName', 'First Name*',
                      'Last Name', 'lastName', 'Last Name*',
                      'Company Name', 'Profile Name',
                      'mobile', 'Mobile', 'Phone'
                    ];
                    let matchCount = 0;
                    let totalFields = 0;
                    
                    for (const field of matchFields) {
                      if (originalRow[field] && failedRowData[field]) {
                        totalFields++;
                        if (originalRow[field] === failedRowData[field]) {
                          matchCount++;
                        }
                      }
                    }
                    
                    // If we have a good match (at least 50% of fields match)
                    if (totalFields > 0 && matchCount / totalFields >= 0.5) {
                      rowIndex = i;
                      break;
                    }
                  }
                }
                
                // If still not found, try to find by exact email match (case-insensitive)
                if (rowIndex === -1) {
                  const failedEmail = failedRow.row.email || failedRow.row.Email || failedRow.row['Email*'];
                  if (failedEmail) {
                    for (let i = 0; i < dataToExport.length; i++) {
                      const originalRow = dataToExport[i];
                      const originalEmail = originalRow.email || originalRow.Email || originalRow['Email*'];
                      if (originalEmail && originalEmail.toLowerCase() === failedEmail.toLowerCase()) {
                        rowIndex = i;
                        break;
                      }
                    }
                  }
                }
                
                // If still not found, try JSON comparison as fallback
                if (rowIndex === -1) {
                  rowIndex = dataToExport.findIndex(row => 
                    JSON.stringify(row) === JSON.stringify(failedRow.row)
                  );
                }
                
                if (rowIndex !== -1) {
                  errorRows.add(rowIndex);
                  
                  // Handle specific error fields from API response
                  if (failedRow.errorFields && failedRow.errorFields.length > 0) {
                    
                    // Process each error field
                    failedRow.errorFields.forEach(errorField => {
                      // Try to find the correct column name (case-insensitive)
                      const possibleColumnNames = [
                        errorField,
                        `${errorField}*`,
                        errorField.replace('*', ''),
                        `${errorField.replace('*', '')}*`,
                        // Common field name variations
                        errorField.toLowerCase(),
                        errorField.toUpperCase(),
                        // Handle common field mappings
                        errorField === 'email' ? 'Email' : errorField,
                        errorField === 'Email' ? 'email' : errorField,
                        errorField === 'firstName' ? 'First Name' : errorField,
                        errorField === 'First Name' ? 'firstName' : errorField,
                        errorField === 'lastName' ? 'Last Name' : errorField,
                        errorField === 'Last Name' ? 'lastName' : errorField,
                        errorField === 'company_name' ? 'Company Name' : errorField,
                        errorField === 'Company Name' ? 'company_name' : errorField,
                        // Additional common API field mappings
                        errorField === 'mobile' ? 'Phone' : errorField,
                        errorField === 'Phone' ? 'mobile' : errorField,
                        errorField === 'phone' ? 'Mobile' : errorField,
                        errorField === 'Mobile' ? 'phone' : errorField,
                        // Custom role field mappings
                        errorField === 'customRole' ? 'Custom Role' : errorField,
                        errorField === 'Custom Role' ? 'customRole' : errorField,
                        errorField === 'custom_role' ? 'Custom Role' : errorField,
                        errorField === 'Custom Role' ? 'custom_role' : errorField,
                        // Additional field mappings
                        errorField === 'password' ? 'Password' : errorField,
                        errorField === 'Password' ? 'password' : errorField,
                        errorField === 'terminals' ? 'Terminals' : errorField,
                        errorField === 'Terminals' ? 'terminals' : errorField
                      ];
                      
                      // Find the first column name that exists in the data
                      let correctColumnName = errorField;
                      for (const colName of possibleColumnNames) {
                        // Check if this column exists in the original data
                        if (dataToExport.some(row => row.hasOwnProperty(colName))) {
                          correctColumnName = colName;
                          break;
                        }
                      }
                      
                      // Add error highlighting for this field
                      if (!errorCells[correctColumnName]) {
                        errorCells[correctColumnName] = [];
                      }
                      errorCells[correctColumnName].push(rowIndex.toString());
                      
                      // Add specific error message for this field
                      const fieldError = failedRow.errorDetails?.[errorField] || failedRow.error;
                      errorMessages[`${rowIndex}:${correctColumnName}`] = fieldError;
                    });
                  } else if (failedRow.isEmailConflict && failedRow.emailField) {
                    // Fallback to email conflict handling for backward compatibility
                    const emailColumnNames = ['Email', 'email', 'Login Email Address', 'Tender Email Address 1'];
                    let correctColumnName = failedRow.emailField;
                    
                    // Check if we need to use a different case
                    for (const colName of emailColumnNames) {
                      if (colName.toLowerCase() === failedRow.emailField.toLowerCase()) {
                        correctColumnName = colName;
                        break;
                      }
                    }
                    
                    // If the column name doesn't have an asterisk but the DataTable column does,
                    // we need to find the actual column name from the DataTable
                    const possibleColumnNames = [correctColumnName, `${correctColumnName}*`, correctColumnName.replace('*', ''), `${correctColumnName.replace('*', '')}*`];
                    
                    // Use the first one that matches the pattern
                    correctColumnName = possibleColumnNames[0];
                    
                    if (!errorCells[correctColumnName]) {
                      errorCells[correctColumnName] = [];
                    }
                    errorCells[correctColumnName].push(rowIndex.toString());
                    errorMessages[`${rowIndex}:${correctColumnName}`] = failedRow.error;
                  }
                            } else {
                 // As a last resort, try to find the best match or use the first row
                 if (dataToExport.length === 1) {
                   rowIndex = 0;
                   errorRows.add(rowIndex);
                 } else {
                    // For multiple rows, try to find the best match by email
                    if (failedRow.emailValue) {
                      for (let i = 0; i < dataToExport.length; i++) {
                        const originalRow = dataToExport[i];
                        const emailFields = ['Email', 'email', 'Login Email Address', 'Tender Email Address 1'];
                        
                        for (const emailField of emailFields) {
                          if (originalRow[emailField] === failedRow.emailValue) {
                            rowIndex = i;
                            break;
                          }
                        }
                        if (rowIndex !== -1) break;
                      }
                    }
                    
                    // If still not found, try to find by extracted email from error message
                    if (rowIndex === -1 && extractedEmail) {
                      for (let i = 0; i < dataToExport.length; i++) {
                        const originalRow = dataToExport[i];
                        const emailFields = ['Email', 'email', 'Login Email Address', 'Tender Email Address 1'];
                        
                        for (const emailField of emailFields) {
                          if (originalRow[emailField] === extractedEmail) {
                            rowIndex = i;
                            break;
                          }
                        }
                        if (rowIndex !== -1) break;
                      }
                    }
                    
                    // If still not found, use the first row as last resort
                    if (rowIndex === -1) {
                      rowIndex = 0;
                    }
                    
                    errorRows.add(rowIndex);
                  }
                  
                 
                 if (rowIndex !== -1) {
                   // Handle specific error fields from API response
                   if (failedRow.errorFields && failedRow.errorFields.length > 0) {
                     // Process each error field
                     failedRow.errorFields.forEach(errorField => {
                       // Map error field to column name
                       let columnName = errorField;
                       
                       // Handle common field mappings
                       if (errorField === 'email') {
                         columnName = 'Email';
                       } else if (errorField === 'Email') {
                         columnName = 'email';
                       }
                       
                       // Add error highlighting for this field
                       if (!errorCells[columnName]) {
                         errorCells[columnName] = [];
                       }
                       errorCells[columnName].push(rowIndex.toString());
                       
                       // Add specific error message for this field
                       const fieldError = failedRow.errorDetails?.[errorField] || failedRow.error;
                       errorMessages[`${rowIndex}:${columnName}`] = fieldError;
                     });
                   } else if (failedRow.isEmailConflict && failedRow.emailField) {
                      // Try to find the correct column name (case-insensitive)
                      const emailColumnNames = ['Email', 'email', 'Login Email Address', 'Tender Email Address 1'];
                      let correctColumnName = failedRow.emailField;
                      
                      // Check if we need to use a different case
                      for (const colName of emailColumnNames) {
                        if (colName.toLowerCase() === failedRow.emailField.toLowerCase()) {
                          correctColumnName = colName;
                          break;
                        }
                      }
                      
                      // If the column name doesn't have an asterisk but the DataTable column does,
                      // we need to find the actual column name from the DataTable
                      const possibleColumnNames = [correctColumnName, `${correctColumnName}*`, correctColumnName.replace('*', ''), `${correctColumnName.replace('*', '')}*`];
                      
                      // Use the first one that matches the pattern
                      correctColumnName = possibleColumnNames[0];
                      
                      if (!errorCells[correctColumnName]) {
                        errorCells[correctColumnName] = [];
                      }
                      errorCells[correctColumnName].push(rowIndex.toString());
                      errorMessages[`${rowIndex}:${correctColumnName}`] = failedRow.error;
                    }
                  }
                }
              });
              
              // Update Redux state with error highlighting
              dispatch(setErrorRows(Array.from(errorRows)));
              dispatch(setErrorCells(errorCells));
              dispatch(setErrorMessages(errorMessages));
              dispatch(setTotalErrorCount(failed.length));
              
              // Set page validation status to show errors
              dispatch(setPageValidationStatus({
                page: currentPage,
                isValid: false,
                errorCount: failed.length,
                errorRows: Array.from(errorRows)
              }));
              
              // Also set hasValidated to true so error highlighting works
              dispatch(setHasValidated(true));
            };
            
            // Process failed rows for highlighting
            processFailedRowsForHighlighting();
            
              showToast({
                title: "Partial Export",
              description: `${dataToExport.length - failed.length} succeeded, ${failed.length} failed.`,
                variant: "destructive",
              });
          } else {
            // All rows succeeded - clear the data table
            setViewData([]);
            
            showToast({
              title: "Export Successful",
              description: `${dataToExport.length} rows exported successfully to API.`,
            });
          }
        } catch (error: any) {
          // Handle network errors or other exceptions
          failed.push({
            row: dataToExport,
            error: error.message || "Network error",
          });
          
          showToast({
            title: "Export Error",
            description: error.message || "Failed to export data to API.",
            variant: "destructive",
          });
        }
      } else {
        // Handle single row exports
        const rowsToProcess = Array.isArray(mappedPayload) ? mappedPayload : mappedPayload.rateRecords;
        

        
        for (let i = 0; i < rowsToProcess.length; i++) {
          const row = rowsToProcess[i];

          // Find the corresponding row in the current data table for removal
          let rowIndex = -1;
          

          
          // Try to find the row in the current viewData by email
          const rowEmail = row.email || row.Email;
          if (rowEmail) {
            rowIndex = viewData.findIndex(dataRow => {
              const dataRowEmail = dataRow.email || dataRow.Email || dataRow['Email*'];
              return dataRowEmail === rowEmail;
            });
          }
          
          // If not found by email, try by name fields
          if (rowIndex === -1) {
            const rowFirstName = row.firstName || row['First Name'] || row['First Name*'];
            const rowLastName = row.lastName || row['Last Name'] || row['Last Name*'];
            
            if (rowFirstName && rowLastName) {
              rowIndex = viewData.findIndex(dataRow => {
                const dataRowFirstName = dataRow.firstName || dataRow['First Name'] || dataRow['First Name*'];
                const dataRowLastName = dataRow.lastName || dataRow['Last Name'] || dataRow['Last Name*'];
                return dataRowFirstName === rowFirstName && dataRowLastName === rowLastName;
              });
            }
          }




          // Apply null value filtering for specified entities
          let processedRow = row;
          if (requiresNullValueFiltering(selectedEntity.name)) {
            processedRow = filterNullValues(row);
          }

          try {
            const response = await fetch(fullApiUrl, {
              method: "POST",
              headers: requestHeaders,
              body: JSON.stringify(processedRow),
            });

            // Parse response JSON
              let json: any = null;
            let rawResponseText = "";
              try {
              rawResponseText = await response.text();
              json = JSON.parse(rawResponseText);
              } catch (e) {
                json = null;
            }

            // Check response status code
            const statusCode = json?.statusCode || response.status;

            if (statusCode === 201) {
              // Success - remove row from data table
              successCount++;
              if (rowIndex !== -1) {
                const updatedDataTable = viewData.filter((_, index) => index !== rowIndex);
                setViewData(updatedDataTable);
              }
            } else {
              // Failed - keep row in data table and add to failed list
              let errorMessage = json?.message || `HTTP ${response.status}`;
              
              // Handle specific error cases
              if (statusCode === 409 && errorMessage.includes("email")) {
                // Email conflict - highlight the email field
                const emailFields = ["Email", "email", "Login Email Address", "Tender Email Address 1"];
                let emailFieldFound = false;
                
                for (const emailField of emailFields) {
                  if (row[emailField]) {
                    failed.push({ 
                      row, 
                      error: errorMessage,
                      isEmailConflict: true,
                      emailField: emailField,
                      emailValue: row[emailField]
                    });
                    emailFieldFound = true;
                    break;
                  }
                }
                
                if (!emailFieldFound) {
                  failed.push({ row, error: errorMessage });
                }
              } else {
                failed.push({ row, error: errorMessage });
              }
            }

            if (selectedEntityName === "Charge Profile") {
              // Keep the existing Charge Profile logic for backward compatibility
              let chargeProfileJson: any = null;
              try {
                chargeProfileJson = JSON.parse(rawResponseText);
              } catch (e) {
                chargeProfileJson = null;
              }

              if (json && json.data && (Array.isArray(json.data.validList) || Array.isArray(json.data.inValidList))) {
                if (Array.isArray(json.data.validList)) {
                  successCount += json.data.validList.length;
                }
                if (Array.isArray(json.data.inValidList)) {
                  for (const invalidRow of json.data.inValidList) {
                    let errorMessages: string[] = [];
                    if (invalidRow.ruleErrorMessages) {
                      for (const [field, messages] of Object.entries(invalidRow.ruleErrorMessages)) {
                        if (Array.isArray(messages)) {
                          errorMessages.push(...messages);
                        }
                      }
                    }
                    failed.push({
                      row: invalidRow,
                      error: errorMessages.length > 0 ? errorMessages.join("; ") : "Invalid row",
                      errorFields: Object.keys(invalidRow.ruleErrorMessages || {}),
                      errorDetails: invalidRow.ruleErrorMessages || {}
                    });
                  }
                }
                if (
                  (!Array.isArray(json.data.validList) || json.data.validList.length === 0) &&
                  (!Array.isArray(json.data.inValidList) || json.data.inValidList.length === 0)
                ) {
                  failed.push({
                    row,
                    error: (json && json.message) || `HTTP ${response.status}`
                  });
                }
                continue;
              } else if (!response.ok) {
                let errorText = "";
                let errorData: any = {};
                try {
                  errorText = await response.text();
                  const errJson = JSON.parse(errorText);
                  errorText = errJson.message || errorText;
                  errorData = errJson;
                } catch {
                  /* ignore */
                }
                
                // Handle validation errors from API response
                if (response.status === 400 && errorData.message) {
                  // Parse validation error messages like "0.customRole must be a string. data[1].customRole must be a string..."
                  const validationErrors = errorData.message.split('. ');
                  
                  for (const errorMsg of validationErrors) {
                    if (errorMsg.trim()) {
                      // Extract row index and field name from error message
                      const match = errorMsg.match(/^(\d+)\.(\w+)\s+must\s+be\s+a\s+(\w+)/);
                      if (match) {
                        const rowIndex = parseInt(match[1], 10);
                        const fieldName = match[2];
                        const expectedType = match[3];
                        
                        // For single row exports, this should be the current row
                        failed.push({
                          row: row,
                          error: `${fieldName} must be a ${expectedType}`,
                          errorFields: [fieldName],
                          errorDetails: { [fieldName]: `must be a ${expectedType}` }
                        });
                        break; // Only process the first validation error for single row
                      }
                    }
                  }
                  
                  // If no specific validation errors were found, use the general error
                  if (failed.length === 0) {
                    failed.push({ 
                      row, 
                      error: errorText || `HTTP ${response.status}`,
                      errorFields: [],
                      errorDetails: { general: errorText || `HTTP ${response.status}` }
                    });
                  }
                } else {
                  failed.push({ row, error: errorText || `HTTP ${response.status}` });
                }
              } else {
                successCount++;
              }
            } else {
              if (!response.ok) {
                let errorText = "";
                let errorData: any = {};
                try {
                  errorText = await response.text();
                  const json = JSON.parse(errorText);
                  errorText = json.message || errorText;
                  errorData = json;
                } catch {
                  /* ignore */
                }
                
                // Handle specific error fields from the response
                if (errorData.errors && typeof errorData.errors === 'object') {
                  // Extract error fields and details
                  const errorFields = Object.keys(errorData.errors);
                  const errorDetails = errorData.errors;
                  
                  failed.push({ 
                    row, 
                    error: errorText,
                    errorFields: errorFields,
                    errorDetails: errorDetails
                  });
                } else if (response.status === 409 && errorData.message && errorData.message.includes("email")) {
                  // Handle 409 conflict errors specifically for email addresses (backward compatibility)
                  const emailFields = ["Email", "email", "Login Email Address", "Tender Email Address 1"];
                  let emailFieldFound = false;
                  
                  for (const emailField of emailFields) {
                    if (row[emailField]) {
                      // Create a specific error message for email conflict
                      const specificError = `Email "${row[emailField]}" is already in use. Please provide a different email address.`;
                      failed.push({ 
                        row, 
                        error: specificError,
                        isEmailConflict: true,
                        emailField: emailField,
                        emailValue: row[emailField]
                      });
                      emailFieldFound = true;
                      break;
                    }
                  }
                  
                  if (!emailFieldFound) {
                    failed.push({ row, error: errorText || `HTTP ${response.status}` });
                  }
                } else if (response.status === 400 && errorData.message) {
                  // Handle validation errors from API response
                  const validationErrors = errorData.message.split('. ');
                  
                  for (const errorMsg of validationErrors) {
                    if (errorMsg.trim()) {
                      // Extract row index and field name from error message
                      const match = errorMsg.match(/^(\d+)\.(\w+)\s+must\s+be\s+a\s+(\w+)/);
                      if (match) {
                        const rowIndex = parseInt(match[1], 10);
                        const fieldName = match[2];
                        const expectedType = match[3];
                        
                        // For single row exports, this should be the current row
                        failed.push({
                          row: row,
                          error: `${fieldName} must be a ${expectedType}`,
                          errorFields: [fieldName],
                          errorDetails: { [fieldName]: `must be a ${expectedType}` }
                        });
                        break; // Only process the first validation error for single row
                      }
                    }
                  }
                  
                  // If no specific validation errors were found, use the general error
                  if (failed.length === 0) {
                    failed.push({ 
                      row, 
                      error: errorText || `HTTP ${response.status}`,
                      errorFields: [],
                      errorDetails: { general: errorText || `HTTP ${response.status}` }
                    });
                  }
                } else {
                  failed.push({ row, error: errorText || `HTTP ${response.status}` });
                }
              } else {
                successCount++;
              }
            }
          } catch (error: any) {
            failed.push({
              row,
              error: error.message || "Network error"
            });
          }
        }

        if (failed.length === 0) {
          showToast({
            title: "Export Successful",
            description: `All ${rowsToProcess.length} rows exported successfully to API.`,
          });
        } else {
          // Process failed rows to highlight email conflicts
          const processFailedRowsForHighlighting = () => {
            const errorRows = new Set<number>();
            const errorCells: Record<string, string[]> = {};
            const errorMessages: Record<string, string> = {};
            

            

            
                        failed.forEach((failedRow, index) => {
                // Find the correct row by matching the email
                let rowIndex = -1;
                
                // Extract email from error message if available (e.g., "ram@test.com: Email already exists")
                let extractedEmail = null;
                if (failedRow.error && failedRow.error.includes(':')) {
                  const emailMatch = failedRow.error.match(/^([^:]+):/);
                  if (emailMatch) {
                    extractedEmail = emailMatch[1].trim();
                  }
                }
                
                // Try to find by email in failedRow.row first
                const failedEmail = failedRow.row.email || failedRow.row.Email;
                
                // Search through all rows to find the matching email
                for (let i = 0; i < dataToExport.length; i++) {
                  const originalRow = dataToExport[i];
                  const originalEmail = originalRow.Email || originalRow.email;
                  
                  if (originalEmail && originalEmail === failedEmail) {
                    rowIndex = i;
                    break;
                  }
                }
                
                // If not found by email, try extracted email from error message
                if (rowIndex === -1 && extractedEmail) {
                  for (let i = 0; i < dataToExport.length; i++) {
                    const originalRow = dataToExport[i];
                    const emailFields = ['Email', 'email', 'Login Email Address', 'Tender Email Address 1'];
                    
                    for (const emailField of emailFields) {
                      if (originalRow[emailField] === extractedEmail) {
                        rowIndex = i;
                        break;
                      }
                    }
                    if (rowIndex !== -1) break;
                  }
                }
                
                // If not found by email, try to find by email value
                if (rowIndex === -1 && failedRow.emailValue) {
                  for (let i = 0; i < dataToExport.length; i++) {
                    const originalRow = dataToExport[i];
                    const emailFields = ['Email', 'email', 'Login Email Address', 'Tender Email Address 1'];
                    
                    for (const emailField of emailFields) {
                      if (originalRow[emailField] === failedRow.emailValue) {
                        rowIndex = i;
                        break;
                      }
                    }
                    if (rowIndex !== -1) break;
                  }
                }
                
                // If not found by email, use index as fallback
                if (rowIndex === -1) {
                  rowIndex = index;
                  if (rowIndex >= dataToExport.length) {
                    rowIndex = dataToExport.length - 1;
                  }
                }
              

              
              if (rowIndex !== -1) {
                errorRows.add(rowIndex);
                
                                  // Handle specific error fields from API response
                  if (failedRow.errorFields && failedRow.errorFields.length > 0) {
                    
                    // Process each error field
                    failedRow.errorFields.forEach(errorField => {
                    // Map error field to column name
                    let columnName = errorField;
                    
                    // Handle common field mappings
                    if (errorField === 'email') {
                      columnName = 'Email';
                    } else if (errorField === 'Email') {
                      columnName = 'email';
                    }
                    
                    // Add error highlighting for this field
                    if (!errorCells[columnName]) {
                      errorCells[columnName] = [];
                    }
                    errorCells[columnName].push(rowIndex.toString());
                    
                    // Add specific error message for this field
                    const fieldError = failedRow.errorDetails?.[errorField] || failedRow.error;
                    errorMessages[`${rowIndex}:${columnName}`] = fieldError;
                    


                  });
                } else if (failedRow.isEmailConflict && failedRow.emailField) {
                  // Fallback to email conflict handling for backward compatibility
                  const emailColumnNames = ['Email', 'email', 'Login Email Address', 'Tender Email Address 1'];
                  let correctColumnName = failedRow.emailField;
                  
                  // Check if we need to use a different case
                  for (const colName of emailColumnNames) {
                    if (colName.toLowerCase() === failedRow.emailField.toLowerCase()) {
                      correctColumnName = colName;
                      break;
                    }
                  }
                  
                  // If the column name doesn't have an asterisk but the DataTable column does,
                  // we need to find the actual column name from the DataTable
                  const possibleColumnNames = [correctColumnName, `${correctColumnName}*`, correctColumnName.replace('*', ''), `${correctColumnName.replace('*', '')}*`];
                  
                  // Use the first one that matches the pattern
                  correctColumnName = possibleColumnNames[0];
                  
                  if (!errorCells[correctColumnName]) {
                    errorCells[correctColumnName] = [];
                  }
                  errorCells[correctColumnName].push(rowIndex.toString());
                  errorMessages[`${rowIndex}:${correctColumnName}`] = failedRow.error;
                }
              } else {
                
                                 // As a last resort, try to find the best match or use the first row
                 if (dataToExport.length === 1) {
                   rowIndex = 0;
                   errorRows.add(rowIndex);
                 } else {
                    // For multiple rows, try to find the best match by email
                    if (failedRow.emailValue) {
                      for (let i = 0; i < dataToExport.length; i++) {
                        const originalRow = dataToExport[i];
                        const emailFields = ['Email', 'email', 'Login Email Address', 'Tender Email Address 1'];
                        
                        for (const emailField of emailFields) {
                          if (originalRow[emailField] === failedRow.emailValue) {
                            rowIndex = i;
                            break;
                          }
                        }
                        if (rowIndex !== -1) break;
                      }
                    }
                    
                    // If still not found, try to find by extracted email from error message
                    if (rowIndex === -1 && extractedEmail) {
                      for (let i = 0; i < dataToExport.length; i++) {
                        const originalRow = dataToExport[i];
                        const emailFields = ['Email', 'email', 'Login Email Address', 'Tender Email Address 1'];
                        
                        for (const emailField of emailFields) {
                          if (originalRow[emailField] === extractedEmail) {
                            rowIndex = i;
                            break;
                          }
                        }
                        if (rowIndex !== -1) break;
                      }
                    }
                    
                    // If still not found, use the first row as last resort
                    if (rowIndex === -1) {
                      rowIndex = 0;
                    }
                    
                    errorRows.add(rowIndex);
                  }
                
                if (rowIndex !== -1 && failedRow.isEmailConflict && failedRow.emailField) {
                  // Try to find the correct column name (case-insensitive)
                  const emailColumnNames = ['Email', 'email', 'Login Email Address', 'Tender Email Address 1'];
                  let correctColumnName = failedRow.emailField;
                  
                  // Check if we need to use a different case
                  for (const colName of emailColumnNames) {
                    if (colName.toLowerCase() === failedRow.emailField.toLowerCase()) {
                      correctColumnName = colName;
                      break;
                    }
                  }
                  
                  // If the column name doesn't have an asterisk but the DataTable column does,
                  // we need to find the actual column name from the DataTable
                  const possibleColumnNames = [correctColumnName, `${correctColumnName}*`, correctColumnName.replace('*', ''), `${correctColumnName.replace('*', '')}*`];
                  
                  // Use the first one that matches the pattern
                  correctColumnName = possibleColumnNames[0];
                  
                  if (!errorCells[correctColumnName]) {
                    errorCells[correctColumnName] = [];
                  }
                  errorCells[correctColumnName].push(rowIndex.toString());
                  errorMessages[`${rowIndex}:${correctColumnName}`] = failedRow.error;
                }
              }
            });
            
            // Update Redux state with error highlighting

            
            dispatch(setErrorRows(Array.from(errorRows)));
            dispatch(setErrorCells(errorCells));
            dispatch(setErrorMessages(errorMessages));
            dispatch(setTotalErrorCount(failed.length));
            
            // Set page validation status to show errors
            dispatch(setPageValidationStatus({
              page: currentPage,
              isValid: false,
              errorCount: failed.length,
              errorRows: Array.from(errorRows)
            }));
            
            // Also set hasValidated to true so error highlighting works
            dispatch(setHasValidated(true));
          };
          
                    // Process failed rows for highlighting
          processFailedRowsForHighlighting();
          
          showToast({
            title: "Partial Export",
            description: `${successCount} succeeded, ${failed.length} failed.`,
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      console.error("Error exporting to API:", error);
      showToast({
        title: "Export Error",
        description: error.message || "Failed to export data to API.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
      setAppContextIsLoading(false);
    }
  }, [
    allPagesValidated,
    selectedEntityId,
    getCarrierId,
    showToast,
    setAppContextIsLoading,
    transformDataForExport,
    customerData,
    driverGroupsData,
    branchesData,
    carrierGroupsData,
    validChargeProfileList
  ]);

  // Export to CSV
  const handleExportToCsv = useCallback(async (exportConfig: any) => {
    if (!allPagesValidated) {
      showToast({
        title: "Validation Required",
        description: "Please validate all pages of data successfully before exporting as CSV.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedEntityId || !exportConfig) return;
    
    const selectedEntity = exportConfig.entities.find((e: any) => e.id === selectedEntityId);
    if (!selectedEntity) return;

    setIsExporting(true);
    setAppContextIsLoading(true);

    try {
      const dataToExport = await transformDataForExport(exportConfig);
      const headersForCsv = selectedEntity.fields.map((f: any) => f.name);
      const csvString = objectsToCsv(headersForCsv, dataToExport);

      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      
      const exportFileName = `${selectedEntity.name.replace(/\s+/g, "_")}_export.csv`;
      link.setAttribute("download", exportFileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast({
        title: "CSV Export Successful",
        description: `Data exported as ${exportFileName}.`,
      });
    } catch (error: any) {
      console.error("Error exporting to CSV:", error);
      showToast({
        title: "CSV Export Error",
        description: "Failed to generate CSV file.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
      setAppContextIsLoading(false);
    }
  }, [allPagesValidated, selectedEntityId, showToast, setAppContextIsLoading, transformDataForExport]);

  return {
    isExporting,
    handleExportToApi,
    handleExportToCsv
  };
}; 