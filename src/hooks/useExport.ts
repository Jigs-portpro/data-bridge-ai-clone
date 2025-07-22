import { useCallback, useState } from 'react';
import { useAppContext } from '@/hooks/useAppContext';
import { useSelector } from 'react-redux';
import { AUTH_TOKEN_STORAGE_KEY, wrapPayloadInDataArray, LookupKeyMapper, radiusRate, nonRulesConstant, unitOfMeasureOptions } from '@/lib/constants';
import { objectsToCsv } from "@/lib/csvUtils";
import { transformPayload, filterNullValues } from "@/utils/fieldMapper";
import { isValid, parseISO } from 'date-fns';
import type { RootState } from '@/store';

// Utility functions
const isValidDateString = (dateStr: string): boolean => {
  if (!dateStr || typeof dateStr !== "string") return false;
  const commonFormatMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (commonFormatMatch) {
    const month = parseInt(commonFormatMatch[1], 10);
    const day = parseInt(commonFormatMatch[2], 10);
    const year = parseInt(commonFormatMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const parsed = new Date(year, month - 1, day);
      return (
        isValid(parsed) &&
        parsed.getFullYear() === year &&
        parsed.getMonth() === month - 1 &&
        parsed.getDate() === day
      );
    }
  }
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const parsed = new Date(dateStr + "T00:00:00Z");
    return isValid(parsed) && parsed.toISOString().startsWith(dateStr);
  }
  const parsedISO = parseISO(dateStr);
  return isValid(parsedISO) && dateStr.includes("T");
};

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
  
  const { 
    showToast,
    setIsLoading: setAppContextIsLoading,
    data,
    columns,
    viewData,
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
                  const commonFormatMatch = exportValue.match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/);
                  if (commonFormatMatch) {
                    const d = new Date(parseInt(commonFormatMatch[3]), parseInt(commonFormatMatch[1]) - 1, parseInt(commonFormatMatch[2]));
                    if (isValid(d))
                      transformedRow[targetField.name] = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                    else transformedRow[targetField.name] = exportValue;
                  } else if (exportValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    transformedRow[targetField.name] = exportValue;
                  } else if (isValid(parseISO(exportValue)) && exportValue.includes("T")) {
                    transformedRow[targetField.name] = exportValue.split("T")[0];
                  } else {
                    transformedRow[targetField.name] = exportValue;
                  }
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

      let failed: { row: Record<string, any>; error: string }[] = [];
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
          if (['Drivers', 'Carrier', 'Truck Owner', 'Organization', 'Users', 'Trucks', 'Trailers', 'Chassis', 'Chassis Owner'].includes(selectedEntity.name)) {
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

          if (response.ok) {
            const responseData = await response.json();
            
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
                });
              }
            }

            if (failed.length === 0) {
              showToast({
                title: "Export Successful",
                description: `${dataToExport.length} rows exported successfully to API.`,
              });
            } else {
              showToast({
                title: "Partial Export",
                description: `${successCount} succeeded, ${failed.length} failed.`,
                variant: "destructive",
              });
            }
          } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}`);
          }
        } catch (error: any) {
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

          // Apply null value filtering for specified entities
          let processedRow = row;
          if (['Drivers', 'Carrier', 'Truck Owner', 'Organization', 'Users', 'Trucks', 'Trailers', 'Chassis', 'Chassis Owner'].includes(selectedEntity.name)) {
            processedRow = filterNullValues(row);
          }

          try {
            const response = await fetch(fullApiUrl, {
              method: "POST",
              headers: requestHeaders,
              body: JSON.stringify(processedRow),
            });

            if (selectedEntityName === "Charge Profile") {
              let json: any = null;
              try {
                json = await response.json();
              } catch (e) {
                json = null;
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
                      error: errorMessages.length > 0 ? errorMessages.join("; ") : "Invalid row"
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
                try {
                  errorText = await response.text();
                  const errJson = JSON.parse(errorText);
                  errorText = errJson.message || errorText;
                } catch {
                  /* ignore */
                }
                failed.push({ row, error: errorText || `HTTP ${response.status}` });
              } else {
                successCount++;
              }
            } else {
              if (!response.ok) {
                let errorText = "";
                try {
                  errorText = await response.text();
                  const json = JSON.parse(errorText);
                  errorText = json.message || errorText;
                } catch {
                  /* ignore */
                }
                failed.push({ row, error: errorText || `HTTP ${response.status}` });
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