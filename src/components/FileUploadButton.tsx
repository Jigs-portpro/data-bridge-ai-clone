"use client";

import type React from 'react';
import { useRef, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { UploadCloud, CheckCircle, AlertTriangle, Loader2, Send, DownloadCloud } from 'lucide-react';
import { useAppContext } from '@/hooks/useAppContext';
import { EntitySelectionDialog } from '@/components/dialogs/EntitySelectionDialog';
import { ClearAllButton } from "@/components/ClearAllButton";
import { ENTITY_NAME_STORAGE_KEY, AUTH_TOKEN_STORAGE_KEY, wrapPayloadInDataArray, LookupKeyMapper, radiusRate, nonRulesConstant, unitOfMeasureOptions } from '@/lib/constants';
import { useDispatch, useSelector } from 'react-redux';
import { resetExportDataState, setSelectedEntityId, setFieldMappings, setFieldMappingConfidences, setValidationMessages, setHasValidated, setIsDataValid, setErrorRows, setErrorCells, setErrorMessages, setOrganizedData, setTotalErrorCount, setPageValidationStatus, setTotalPages as setReduxTotalPages, resetPageValidation } from '@/store/slices/exportDataSlice';
import { useEntityContext } from '@/contexts/EntityContext';
import { useSession } from 'next-auth/react';
import type { RootState } from '@/store';
import type { ExportConfig, ExportEntity } from '@/config/exportEntities';
import { checkEmailExists, checkCompanyNamesExists } from "@/utils/validationCheck";
import { objectsToCsv } from "@/lib/csvUtils";
import { transformPayload } from "@/utils/fieldMapper";
import { isValid, parseISO } from 'date-fns';
import _, { uniqBy } from 'lodash';

// Utility functions from export-data page
const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidDateString = (dateStr: string): boolean => {
  if (!dateStr || typeof dateStr !== "string") return false;
  const commonFormatMatch = dateStr.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/
  );
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
    const parsed = new Date(dateStr + "T00:00:00Z"); // Treat as UTC to avoid timezone shifts changing date
    return isValid(parsed) && parsed.toISOString().startsWith(dateStr);
  }
  const parsedISO = parseISO(dateStr);
  return isValid(parsedISO) && dateStr.includes("T"); // More strictly for ISO full datetime
};

// Utility function to check if a value represents "All" for a lookup
const isAllLookupValue = (value: string, lookupName: string): boolean => {
  if (!value || typeof value !== 'string') return false;
  const normalizedValue = value.toLowerCase().trim();
  const normalizedLookupName = lookupName.toLowerCase().trim();
  
  // Check for various "All" patterns
  return (
    normalizedValue === 'all' ||
    normalizedValue === `all ${normalizedLookupName}` ||
    normalizedValue === `all ${normalizedLookupName}s` ||
    normalizedValue === `${normalizedLookupName} all` ||
    normalizedValue === `${normalizedLookupName}s all`
  );
};

// Utility function to get all values from a lookup
const getAllLookupValues = (lookupData: any[], lookupField: string): string[] => {
  if (!lookupData || !Array.isArray(lookupData) || lookupData.length === 0) {
    return [];
  }
  
  return lookupData
    .map(item => String(item[lookupField] || '').trim())
    .filter(value => value !== '');
};

export function FileUploadButton() {
  const { 
    setData, 
    setColumns, 
    setFileName, 
    showToast, 
    setIsLoading, 
    clearChatHistory, 
    setDatatableEditedCells, 
    clearAllLookupData, 
    setEntityName,
    initializeDataStates,
    data: appData,
    columns: appColumns,
    setIsLoading: setAppContextIsLoading,
    setViewData,
    setError,
    setDataTable,
    setCurrentPage,
    setTotalPages,
    viewData,
    dataTable,
    currentPage,
    totalPages,
    totalRows,
    rowsPerPage,
    setIsInitialDataLoading,
    // Add all lookup data needed for validation and export
    chassisOwnersData,
    chassisSizesData,
    chassisTypesData,
    branchesData,
    customerData,
    driverGroupsData,
    carrierGroupsData,
    chargeProfileData,
    containerSizesData,
    containerTypesData,
    containerOwnersData,
    commoditiesData,
    chassisData,
    getCarrierId,
    exportConfig,
    isFetchingConfig,
    fetchExportConfig,
    // Additional lookup data from export-data page
    driverProfileTypesData,
    permissionRolesData,
    fleetOwnersData,
    timezoneListData,
    trucksData,
    currenciesData,
    chargeCodesData,
    driverPayGroupsData,
    cityGroupsData,
    zipCodeGroupsData,
    CSRData,
    driverChargeProfileData,
    customerFleetData,
    // Add fetch functions for lookup data
    fetchAndStoreChassisOwners,
    fetchAndStoreChassisSizes,
    fetchAndStoreChassisTypes,
    fetchAndStoreBranches,
    fetchAndStoreCustomer,
    fetchAndStoreContainerSizes,
    fetchAndStoreContainerTypes,
    fetchAndStoreContainerOwners,
    fetchAndStoreCommodities,
    fetchAndStoreChassis,
    fetchAndStoreDriverProfileTypes,
    fetchAndStoreFleetOwners,
    fetchAndStoreTimezoneList,
    fetchAndStoreTrucks,
    fetchAndStoreCurrencies,
    fetchAndStoreChargeCodes,
    fetchAndStoreDriverPayGroups,
    fetchAndStoreCityGroups,
    fetchAndStoreZipCodeGroups,
    fetchAndStoreCSR,
    fetchAndStoreDriverGroups,
    fetchAndStoreCarrierGroups,
    fetchAndStoreChargeProfile,
    fetchAndStoreDriverChargeProfile,
    fetchAndStoreCustomerFleet
  } = useAppContext();
  const router = useRouter();
  const dispatch = useDispatch();
  const { data: session } = useSession();

  // Redux state
  const { 
    selectedEntityId, 
    fieldMappings, 
    hasValidated, 
    isDataValid, 
    validationMessages,
    allPagesValidated,
    pageValidationStatus
  } = useSelector((state: RootState) => state.exportData);

  const [isEntitySelectionDialogOpen, setIsEntitySelectionDialogOpen] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const { setDetectedEntity } = useEntityContext();
  const [isExporting, setIsExporting] = useState(false);
  const [validChargeProfileList, setValidChargeProfileList] = useState<any[]>([]);

  // Check if file has been uploaded and mapped
  const isFileUploaded = appData.length > 0 && appColumns.length > 0;
  const isEntityMapped = Boolean(selectedEntityId && Object.keys(fieldMappings).length > 0);
  const canValidate = isFileUploaded && isEntityMapped;

  // Check current page validation status
  const currentPageStatus = pageValidationStatus[currentPage];
  const hasCurrentPageBeenValidated = currentPageStatus !== undefined;
  const isCurrentPageValid = hasCurrentPageBeenValidated && currentPageStatus.isValid;

  // Fetch export configuration on component mount
  useEffect(() => {
    if (!exportConfig && !isFetchingConfig) {
      fetchExportConfig();
    }
  }, [exportConfig, isFetchingConfig, fetchExportConfig]);

  // Complete lookup data sources mapping (from export-data page)
  const lookupDataSources: Record<
    string,
    {
      getData: () => any[] | null;
      field: string;
      name: string;
      fetchFunction?: () => Promise<void>;
    }
  > = {
    chassisOwners: {
      getData: () => chassisOwnersData,
      field: "company_name",
      name: "Chassis Owners",
      fetchFunction: fetchAndStoreChassisOwners,
    },
    chassisSizes: {
      getData: () => chassisSizesData,
      field: "name",
      name: "Chassis Sizes",
      fetchFunction: fetchAndStoreChassisSizes,
    },
    chassisTypes: {
      getData: () => chassisTypesData,
      field: "name",
      name: "Chassis Types",
      fetchFunction: fetchAndStoreChassisTypes,
    },
    driverProfileTypes: {
      getData: () =>
        driverProfileTypesData
          ? driverProfileTypesData.map((type) => ({ type }))
          : null,
      field: "type",
      name: "Driver Profile Types",
      fetchFunction: fetchAndStoreDriverProfileTypes,
    },
    branches: {
      getData: () => branchesData,
      field: "name",
      name: "Branches",
      fetchFunction: fetchAndStoreBranches,
    },
    tmsCustomers: {
      getData: () => customerData,
      field: "company_name",
      name: "TMS Customers",
      fetchFunction: fetchAndStoreCustomer,
    },
    getAllPermissionRoles: {
      getData: () => permissionRolesData,
      field: "roleName",
      name: "Permission Roles",
    },
    fleetOwners: {
      getData: () => fleetOwnersData,
      field: "company_name",
      name: "Fleet Owners",
      fetchFunction: fetchAndStoreFleetOwners,
    },
    getTMSFleetCustomers: {
      getData: () => customerFleetData,
      field: "company_name",
      name: "Customer Fleet",
      fetchFunction: fetchAndStoreCustomerFleet,
    },
    timezoneList: {
      getData: () =>
        timezoneListData ? timezoneListData.map((type) => ({ type })) : null,
      field: "type",
      name: "Timezone List",
      fetchFunction: fetchAndStoreTimezoneList,
    },
    commodities: {
      getData: () => commoditiesData,
      field: "name",
      name: "Commodities",
      fetchFunction: fetchAndStoreCommodities,
    },
    chassis: {
      getData: () => chassisData,
      field: "chassisNo",
      name: "chassisNo",
      fetchFunction: fetchAndStoreChassis,
    },
    trucks: {
      getData: () => trucksData,
      field: "equipmentID",
      name: "Truck Number",
      fetchFunction: fetchAndStoreTrucks,
    },
    currencies: {
      getData: () => currenciesData,
      field: "currencyCode",
      name: "Currencies",
      fetchFunction: fetchAndStoreCurrencies,
    },
    chargeCodes: {
      getData: () => chargeCodesData,
      field: "value",
      name: "chargeCodes",
      fetchFunction: fetchAndStoreChargeCodes,
    },
    containerSizes: {
      getData: () => containerSizesData,
      field: "name",
      name: "Container Sizes",
      fetchFunction: fetchAndStoreContainerSizes,
    },
    containerTypes: {
      getData: () => containerTypesData,
      field: "name",
      name: "Container Types",
      fetchFunction: fetchAndStoreContainerTypes,
    },
    containerOwners: {
      getData: () => containerOwnersData,
      field: "company_name",
      name: "Container Owners",
      fetchFunction: fetchAndStoreContainerOwners,
    },
    driverPayGroups: {
      getData: () => driverPayGroupsData,
      field: "name",
      name: "Driver Pay Groups",
      fetchFunction: fetchAndStoreDriverPayGroups,
    },
    cityGroups: {
      getData: () => cityGroupsData,
      field: "name",
      name: "City Groups",
      fetchFunction: fetchAndStoreCityGroups,
    },
    zipCodeGroups: {
      getData: () => zipCodeGroupsData,
      field: "name",
      name: "Zip Code Groups",
      fetchFunction: fetchAndStoreZipCodeGroups,
    },
    CSR: {
      getData: () => CSRData,
      field: "name",
      name: "CSR",
      fetchFunction: fetchAndStoreCSR,
    },
    driverGroups: {
      getData: () => driverGroupsData,
      field: "name",
      name: "Driver Groups",
      fetchFunction: fetchAndStoreDriverGroups,
    },
    carrierGroups: {
      getData: () => carrierGroupsData,
      field: "name",
      name: "Carrier Groups",
      fetchFunction: fetchAndStoreCarrierGroups,
    },
    chargeProfile: {
      getData: () => chargeProfileData,
      field: "name",
      name: "Charge Profile",
      fetchFunction: fetchAndStoreChargeProfile,
    },
    driverChargeProfile: {
      getData: () => driverChargeProfileData,
      field: "name",
      name: "Driver Charge Profile",
      fetchFunction: fetchAndStoreDriverChargeProfile,
    },
  };

  const validateSingleRow = useCallback(
    (
      row: Record<string, any>,
      rowIndex: number,
      entityConfig: ExportEntity
    ): string[] => {
      const errors: string[] = [];
      entityConfig.fields.forEach((targetField) => {
        // Skip vendor field validation for tariff types (except general "Tariff")
        if (targetField.name === "Vendor" && 
            ["Load Tariff", "Driver Tariff", "Carrier Tariff"].includes(selectedEntityId as string)) {
          return;
        }

        const sourceColumnName = fieldMappings[targetField.name];
        if (targetField.required && !sourceColumnName) {
          errors.push(
            `Row ${rowIndex + 1}, Target "${targetField.name}": required by API but not mapped.`
          );
          return;
        }
        if (!sourceColumnName) return;

        const value = row[sourceColumnName];
        const stringValue: string =
          value === null || value === undefined ? "" : String(value).trim();

        if (targetField.required && stringValue === "") {
          errors.push(
            `Row ${rowIndex + 1}, Field "${targetField.name}" (from "${sourceColumnName}"): required by API but source data is empty.`
          );
        }

        if (stringValue !== "") {
          switch (targetField.type) {
            case "string":
            case "email":
              if (targetField.minLength !== undefined && stringValue.length < targetField.minLength) {
                errors.push(
                  `Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): min length ${targetField.minLength}, got ${stringValue.length}. Value: "${stringValue.substring(0, 50)}"`
                );
              }
              if (targetField.maxLength !== undefined && stringValue.length > targetField.maxLength) {
                errors.push(
                  `Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): max length ${targetField.maxLength}, got ${stringValue.length}. Value: "${stringValue.substring(0, 50)}"`
                );
              }
              if (targetField.pattern) {
                try {
                  const regex = new RegExp(targetField.pattern);
                  if (!regex.test(stringValue)) {
                    errors.push(
                      `Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): does not match pattern "${targetField.pattern}". Value: "${stringValue.substring(0, 50)}"`
                    );
                  }
                } catch (e) {
                  errors.push(
                    `Row ${rowIndex + 1}, Field "${targetField.name}": Configuration error - Invalid regex pattern provided: "${targetField.pattern}". Pattern validation skipped.`
                  );
                }
              }
              if (targetField.type === "email" && !isValidEmail(stringValue)) {
                errors.push(
                  `Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): not a valid email. Value: "${stringValue}"`
                );
              }
              break;
            case "number":
              const numValue = parseFloat(stringValue);
              if (isNaN(numValue)) {
                errors.push(
                  `Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): should be a number. Found "${stringValue}".`
                );
              } else {
                if (targetField.minValue !== undefined && numValue < targetField.minValue)
                  errors.push(
                    `Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): min value ${targetField.minValue}, got ${numValue}.`
                  );
                if (targetField.maxValue !== undefined && numValue > targetField.maxValue)
                  errors.push(
                    `Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): max value ${targetField.maxValue}, got ${numValue}.`
                  );
              }
              break;
            case "boolean":
              if (
                stringValue !== "" &&
                !["true", "false", "1", "0", "yes", "no"].includes(stringValue.toLowerCase())
              ) {
                errors.push(
                  `Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): should be boolean (true/false, 1/0). Found "${stringValue}".`
                );
              }
              break;
            case "date":
              if (!isValidDateString(stringValue))
                errors.push(
                  `Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): not a valid date. Examples: YYYY-MM-DD, MM/DD/YYYY. Found "${stringValue}".`
                );
              break;
          }
        }

        // Validate enum values if configured
        if (targetField.enum && stringValue !== "") {
          if (!targetField.enum.includes(stringValue)) {
            errors.push(
              `Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): must be one of [${targetField.enum.join(", ")}]. Found "${stringValue}".`
            );
          }
        }

        // Perform lookup validation if configured
        if (targetField.lookupValidation && stringValue !== "") {
          // Skip lookup validation for Charge Profile field in all tariff types
          if (["Load Tariff", "Driver Tariff", "Carrier Tariff", "Tariff"].includes(selectedEntityId as string) && 
              targetField.name === "Charge Profile") {
            return;
          }

          let arrayValue: string[] = [];
          const { lookupId, lookupField } = targetField.lookupValidation;

          // Always split comma-separated values for validation, regardless of isMulti setting
          if (stringValue.includes(',')) {
            arrayValue = stringValue
              ?.split(",")
              ?.filter((value) => value?.trim());
          }

          const lookupSource = lookupDataSources[lookupId];
          let lookupDataSource: any[] | null = null;
          let lookupSourceName = lookupId;
          let expectedField = lookupField;
          
          if (lookupSource) {
            lookupDataSource = lookupSource.getData();
            lookupSourceName = lookupSource.name;
            expectedField = lookupSource.field;
          } else {
            if (
              !errors.some((e) =>
                e.includes(
                  `Lookup source ID "${lookupId}" is not yet supported for validation.`
                )
              )
            ) {
              errors.push(
                `Configuration Error: Lookup source ID "${lookupId}" for target field "${targetField.name}" is not yet supported for validation. Please check Lookups page setup.`
              );
            }
          }

          if (lookupDataSource && lookupDataSource.length > 0) {
            const firstLookupItem = lookupDataSource[0];
            if (firstLookupItem && !(expectedField in firstLookupItem)) {
              if (
                !errors.some((e) =>
                  e.startsWith(
                    `Lookup column "${expectedField}" not found in ${lookupSourceName}`
                  )
                )
              ) {
                errors.push(
                  `Configuration Error for Target "${targetField.name}": Lookup column "${expectedField}" not found in ${lookupSourceName} data. Cannot validate.`
                );
              }
            } else {
              // Check if the value represents "All" for this lookup
              if (isAllLookupValue(stringValue, lookupSourceName)) {
                // "All" values are always valid for lookup validation
                // No validation error needed
              } else {
                // Handle comma-separated values validation
                if (arrayValue?.length > 0) {
                  // Check each comma-separated value individually
                  const invalidValues: string[] = [];
                  arrayValue.forEach((value) => {
                    const found = lookupDataSource.some((lookupRow) => {
                      const _value = String(lookupRow[expectedField]).trim();
                      return _value === value.trim();
                    });
                    if (!found) {
                      invalidValues.push(value.trim());
                    }
                  });
                  
                  if (invalidValues.length > 0) {
                    errors.push(
                      `Row ${rowIndex + 1}, Target "${
                        targetField.name
                      }" (from "${sourceColumnName}"): Values "${invalidValues.join(', ')}" not found in ${lookupSourceName} (column: ${expectedField}).`
                    );
                  }
                } else {
                  // Single value validation
                  const foundInLookup = lookupDataSource.some((lookupRow) => {
                    const _value = String(lookupRow[expectedField]).trim();
                    return _value === stringValue;
                  });
                  if (!foundInLookup) {
                    errors.push(
                      `Row ${rowIndex + 1}, Target "${
                        targetField.name
                      }" (from "${sourceColumnName}"): Value "${stringValue}" not found in ${lookupSourceName} (column: ${expectedField}).`
                    );
                  }
                }
              }
            }
          } else if (
            lookupSource &&
            (!lookupDataSource || lookupDataSource.length === 0)
          ) {
            if (
              !errors.some((e) =>
                e.includes(`${lookupSourceName} lookup data is not loaded`)
              )
            ) {
              errors.push(
                `Validation Skipped for "${targetField.name}": ${lookupSourceName} lookup data is not loaded. Please fetch it on the Lookups page.`
              );
            }
          }
        }
      });
      return errors;
    },
    [fieldMappings, selectedEntityId, lookupDataSources]
  );

  // Get current page data for validation - this includes any edits made in the data table
  const getCurrentDataForValidation = useCallback(() => {
    // Return only the current page data (viewData) for validation
    return viewData && viewData.length > 0 ? viewData : [];
  }, [viewData]);

  // Get all data for export (not just current page)
  const getAllDataForExport = useCallback(async (): Promise<Record<string, any>[]> => {
    try {
      const entityName = localStorage.getItem(ENTITY_NAME_STORAGE_KEY);
      if (!entityName) {
        console.error('No entity name found for export');
        return [];
      }

      // Fetch ALL data without pagination limit for export
      const response = await fetch(`/api/data?entityName=${entityName}&page=1&limit=${totalRows || 10000}`);
      
      if (!response.ok) {
        console.error('Failed to fetch all data for export');
        return appData; // Fallback to whatever we have
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error fetching all data for export:', error);
      return appData; // Fallback to whatever we have
    }
  }, [totalRows, appData]);

  const handleValidateData = useCallback(async () => {
    if (!selectedEntityId || !exportConfig) {
      showToast({
        title: "Setup Required",
        description: "Please select a target entity and ensure configuration is loaded.",
        variant: "destructive",
      });
      return;
    }
    
    const selectedEntity = exportConfig.entities.find((e: any) => e.id === selectedEntityId);
    if (!selectedEntity) {
      showToast({
        title: "Entity Not Found",
        description: "Configuration for selected entity is missing.",
        variant: "destructive",
      });
      return;
    }

    const isChargeProfileEntity = selectedEntityId === "Charge Profile";

    setIsValidating(true);
    setAppContextIsLoading(true);
    dispatch(setValidationMessages([]));
    dispatch(setErrorRows([]));
    dispatch(setErrorCells({}));
    dispatch(setErrorMessages({}));
    dispatch(setTotalErrorCount(0)); // Reset total error count

    try {
      let allValidationErrors: string[] = [];
      
      // Use only current page data (viewData) for validation
      let currentPageData = getCurrentDataForValidation();
      
      if (currentPageData.length === 0) {
        showToast({
          title: "No Data to Validate",
          description: "No data available on current page for validation.",
          variant: "destructive",
        });
        return;
      }

      // Use unique data for charge profile entity
      let uniqAppData = currentPageData;
      if(isChargeProfileEntity) {
        uniqAppData = uniqBy(currentPageData, 'Charge Profile Name');
      }

      // Handle tariff validation - only for "Tariff" entity
      if (selectedEntityId === "Tariff") {        
        // Determine tariff type based on Vendor Type column
        const hasVendorColumn = currentPageData.some((row: any) => row.hasOwnProperty('Vendor Type'));
        
        let tariffType: string;
        let vendorTypeForPayload: string | undefined;
        
        if (!hasVendorColumn) {
          tariffType = "Load Tariff";
          vendorTypeForPayload = undefined;
        } else {
          // Check vendor type values
          const vendorTypes = currentPageData
            .map((row: any) => row['Vendor Type'])
            .filter((vendor: any) => vendor && vendor.trim())
            .map((vendor: string) => vendor.toLowerCase());
          
          if (vendorTypes.some((vendor: string) => vendor === 'driver')) {
            tariffType = "Driver Tariff";
            vendorTypeForPayload = "driver";
            console.log("Found 'driver' in Vendor Type -> Driver Tariff");
          } else if (vendorTypes.some((vendor: string) => vendor === 'carrier')) {
            tariffType = "Carrier Tariff";
            vendorTypeForPayload = "carrier";
            console.log("Found 'carrier' in Vendor Type -> Carrier Tariff");
          } else {
            // Vendor Type column exists but no valid values = Load Tariff
            tariffType = "Load Tariff";
            vendorTypeForPayload = undefined;
          }
        }
        
        // Validate charge profiles based on tariff type
        const chargeProfileNames = uniqBy(currentPageData, 'Charge Profile Name')
          .map(row => row['Charge Profile Name'])
          .filter(name => name && name.trim());

        if (chargeProfileNames.length > 0) {
          try {
            const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URI;

            // Build request payload
            const payloadForValidation: Record<string, any> = {
              names: chargeProfileNames,
            };
            
            if (vendorTypeForPayload) {
              payloadForValidation.vendorType = vendorTypeForPayload;
            }

            console.log("Charge Profile Validation Payload:", payloadForValidation);

            const response = await fetch(`${baseUrl}/rate-engine/vendor-rate/validate-charge-profile`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(payloadForValidation)
            });

            const result = await response.json();
            
            // Store the existingProfiles in validChargeProfileList
            if (result.data?.existingProfiles && Array.isArray(result.data.existingProfiles)) {
              setValidChargeProfileList(result.data.existingProfiles);
            } else {
              setValidChargeProfileList([]);
            }
            
            if (result.data?.nonExistingProfiles?.length > 0) {
              result.data.nonExistingProfiles.forEach((invalidName: string) => {
                allValidationErrors.push(
                  `Charge Profile "${invalidName}" does not exist in the database for ${tariffType}.`
                );
              });
            }
          } catch (error: any) {
            console.error("Error validating charge profiles:", error);
            allValidationErrors.push(
              `Failed to validate charge profiles: ${error.message || "API error"}`
            );
          }
        }
      }

      // Handle Organization entity validation
      if (selectedEntityId === "Organization") {
        // Check for email fields
        const emailFields = ["Email", "email"];
        const emailsToCheck: string[] = [];
        
        // Collect all emails from the data
        uniqAppData.forEach((row, index) => {
          emailFields.forEach(fieldName => {
            if (row[fieldName] && String(row[fieldName]).trim()) {
              const email = String(row[fieldName]).trim();
              if (email && !emailsToCheck.includes(email)) {
                emailsToCheck.push(email);
              }
            }
          });
        });

        // Check if emails already exist in database
        if (emailsToCheck.length > 0) {
          try {
            const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
            const emailCheckResult = await checkEmailExists(emailsToCheck, token || "");
            
            if (emailCheckResult.error) {
              allValidationErrors.push(
                `Failed to validate email uniqueness: ${emailCheckResult.error}`
              );
            } else {
              // Add validation errors for existing emails
              const existingEmails = emailCheckResult.existingEmails || [];
              
              existingEmails.forEach(existingEmail => {
                uniqAppData.forEach((row, index) => {
                  emailFields.forEach(fieldName => {
                    if (row[fieldName] && String(row[fieldName]).trim() === existingEmail) {
                      const errorMessage = `Row ${index + 1}, Field "${fieldName}": Email "${existingEmail}" is already in use. Please provide a different email.`;
                      allValidationErrors.push(errorMessage);
                    }
                  });
                });
              });
            }
          } catch (error: any) {
            allValidationErrors.push(
              `Failed to validate email uniqueness: ${error.message || "API error"}`
            );
          }
        }

        // Check for company name fields
        const companyNameFields = ["Profile Name*","Company Name*"];
        const companyNamesToCheck: string[] = [];
        
        // Collect all company names from the data
        uniqAppData.forEach((row, index) => {
          companyNameFields.forEach(fieldName => {
            if (row[fieldName] && String(row[fieldName]).trim()) {
              const companyName = String(row[fieldName]).trim();
              if (companyName && !companyNamesToCheck.includes(companyName)) {
                companyNamesToCheck.push(companyName);
              }
            }
          });
        });
        
        // Check if company names already exist in database
        if (companyNamesToCheck.length > 0) {
          try {
            const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
            const companyCheckResult = await checkCompanyNamesExists(companyNamesToCheck, token || "");
            
            if (companyCheckResult.error) {
              allValidationErrors.push(
                `Failed to validate company name uniqueness: ${companyCheckResult.error}`
              );
            } else {
              // Add validation errors for existing company names
              const existingCompanyNames = companyCheckResult.existingCompanyNames || [];
              
              existingCompanyNames.forEach(existingCompanyName => {
                uniqAppData.forEach((row, index) => {
                  companyNameFields.forEach(fieldName => {
                    if (row[fieldName] && String(row[fieldName]).trim() === existingCompanyName) {
                      const errorMessage = `Row ${index + 1}, Field "${fieldName}": Company Name "${existingCompanyName}" is already in use. Please provide a different company name.`;
                      allValidationErrors.push(errorMessage);
                    }
                  });
                });
              });
            }
          } catch (error: any) {
            allValidationErrors.push(
              `Failed to validate company name uniqueness: ${error.message || "API error"}`
            );
          }
        }
      }

      // Regular field validation - collect ALL errors for DataTable (no limit)
      let allErrorsForDataTable: string[] = [];
      for (let i = 0; i < uniqAppData.length; i++) {
        const row = uniqAppData[i];
        // Calculate the global row index for this row
        const globalRowIndex = ((currentPage - 1) * rowsPerPage) + i;
        const rowErrors = validateSingleRow(row, globalRowIndex, selectedEntity);
        
        // charge profile rules validations
        if (isChargeProfileEntity) {
          const uniqueChargeProfiles = uniqBy(currentPageData, 'Charge Profile Name');
          uniqueChargeProfiles.forEach((cp, idx) => {
            const unitOfMeasure = cp['Unit of Measure'];
            const inEvent = cp['Calculate In This'] ?? cp['Calculate In This Event'];
            const toEvent = cp['Calculate To This'] ?? cp['Calculate To This Event'];
            const fromEvent = cp['Calculate From This'] ?? cp['Calculate From This Event'];
            const fromLegs = cp['From Legs'];
            const toLegs = cp['To Legs'];
            const fromLegEventLocation = cp['From Leg Event Location'];
            const toLegEventLocation = cp['To Leg Event Location'];

            const unitOfMeasureValue: any = unitOfMeasureOptions.find((d: any) => d?.label == unitOfMeasure);
            const isRadiusRate = radiusRate?.includes(unitOfMeasureValue?.value);
            const ifEvent = cp['If Event'];
            const eventLocation = cp['Event Location'];

            // rules validations
            if (
              !isRadiusRate &&
              !nonRulesConstant.includes(unitOfMeasureValue)
            ) {
              const isRulesNotSelected = !(ifEvent || eventLocation) && !(fromEvent || toEvent?.length) && !(fromLegs || toLegs || fromLegEventLocation || toLegEventLocation);

              // Format: Row X, Field "FIELD_NAME": error message
              const rowLabel = cp['Charge Profile Name']
                ? `Charge Profile "${cp['Charge Profile Name']}"`
                : `Row ${idx + 1}`;

              if (isRulesNotSelected) {
                allValidationErrors.push(
                  `${rowLabel}, Field "Rules": Please select at least one Rule!`
                );
                return;
              }
              if (fromEvent && !toEvent?.length) {
                allValidationErrors.push(
                  `${rowLabel}, Field "To Event": To Event is required!`
                );
              }
              if (toEvent?.length && !fromEvent) {
                allValidationErrors.push(
                  `${rowLabel}, Field "From Event": From Event is required!`
                );
              }
              if (
                ![...radiusRate, "permile"].includes(unitOfMeasure) &&
                isRulesNotSelected &&
                !inEvent
              ) {
                allValidationErrors.push(
                  `${rowLabel}, Field "In Event": In Event is required!`
                );
              }
            }
          });
        }
        
        allErrorsForDataTable = [...allErrorsForDataTable, ...rowErrors];
      }
      
      allErrorsForDataTable = [...allValidationErrors, ...allErrorsForDataTable];

      // Process validation errors for DataTable state
      const errorRows = new Set<number>();
      const errorCells = new Map<string, Set<string>>();
      const errorMessages = new Map<string, string>();

      allErrorsForDataTable.forEach((message) => {
        const rowMatch = message.match(/Row (\d+)/);
        if (rowMatch) {
          const pageRowIndex = parseInt(rowMatch[1]) - 1; // 0-based page row index
          errorRows.add(pageRowIndex);

          const fieldMatch = message.match(/"([^"]+)" \(from "([^"]+)"\)/);
          if (fieldMatch) {
            const sourceColumnName = fieldMatch[2];
            if (!errorCells.has(sourceColumnName)) {
              errorCells.set(sourceColumnName, new Set());
            }
            errorCells.get(sourceColumnName)!.add(pageRowIndex.toString());
            errorMessages.set(`${pageRowIndex}:${sourceColumnName}`, message);
          } else {
            // Try alternative pattern for field names without "from" clause
            const altFieldMatch = message.match(/"([^"]+)"/);
            if (altFieldMatch) {
              const targetField = altFieldMatch[1];
              const sourceColumn = fieldMappings[targetField];
              
              if (sourceColumn && sourceColumn.trim() !== '') {
                if (!errorCells.has(sourceColumn)) {
                  errorCells.set(sourceColumn, new Set());
                }
                errorCells.get(sourceColumn)!.add(pageRowIndex.toString());
                errorMessages.set(`${pageRowIndex}:${sourceColumn}`, message);
              }
            }
          }
        }
      });

      // Convert to serializable format and dispatch to Redux
      const serializableErrorRows = Array.from(errorRows);
      const serializableErrorCells: Record<string, string[]> = {};
      errorCells.forEach((indices, column) => {
        serializableErrorCells[column] = Array.from(indices);
      });
      const serializableErrorMessages: Record<string, string> = {};
      errorMessages.forEach((message, key) => {
        serializableErrorMessages[key] = message;
      });

      dispatch(setErrorRows(serializableErrorRows));
      dispatch(setErrorCells(serializableErrorCells));
      dispatch(setErrorMessages(serializableErrorMessages));

      // Store the actual total error count BEFORE limiting messages
      dispatch(setTotalErrorCount(allErrorsForDataTable.length));

      // Set total pages in Redux state for proper allPagesValidated calculation  
      dispatch(setReduxTotalPages(totalPages));
      
      // Update page validation status
      const currentPageIsValid = allErrorsForDataTable.length === 0;
      dispatch(setPageValidationStatus({
        page: currentPage,
        isValid: currentPageIsValid,
        errorCount: allErrorsForDataTable.length,
        errorRows: serializableErrorRows
      }));

      // Set current page validation state (for UI display)
      dispatch(setHasValidated(true));
      dispatch(setIsDataValid(currentPageIsValid));

      // Limit validation messages for UI display
      const MAX_VALIDATION_MESSAGES_DISPLAYED = 100;
      allValidationErrors = allErrorsForDataTable.slice(0, MAX_VALIDATION_MESSAGES_DISPLAYED);
      if (allErrorsForDataTable.length > MAX_VALIDATION_MESSAGES_DISPLAYED) {
        allValidationErrors.push(
          `Showing first ${MAX_VALIDATION_MESSAGES_DISPLAYED} of ${allErrorsForDataTable.length} errors. All errors are processed for DataTable highlighting.`
        );
      }

      dispatch(setValidationMessages(allValidationErrors));

      if (allValidationErrors.length === 0) {
        dispatch(setIsDataValid(true));
        showToast({
          title: "Validation Successful", 
          description: "Data is valid and ready for export.",
          variant: "default",
        });
      } else {
        dispatch(setIsDataValid(false));
        
        showToast({
          title: "Validation Failed",
          description: `${allErrorsForDataTable.length} error(s) found. Please review the highlighted issues above the data table.`,
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error("Error during validation:", error);
      showToast({
        title: "Validation Error",
        description: "An error occurred during validation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
      setAppContextIsLoading(false);
    }
  }, [selectedEntityId, exportConfig, getCurrentDataForValidation, showToast, validateSingleRow, setAppContextIsLoading, fieldMappings, dispatch, session, totalPages, currentPage, rowsPerPage]);

  // Transform data for export with lookup transformations (similar to export-data page)
  const transformDataForExport = useCallback(async () => {
    if (!selectedEntityId || !exportConfig || !appColumns.length) return [];
    const selectedEntity = exportConfig.entities.find(
      (e: any) => e.id === selectedEntityId
    );
    if (!selectedEntity) return [];

    // Helper to get lookup data by lookupId
    const getLookupData = (lookupId: string): any[] | null => {
      let key = LookupKeyMapper[lookupId] ?? lookupId;
      const source = lookupDataSources[key];
      return source ? source.getData() : null;
    };

    // Fetch ALL data for export (not just current page)
    const allDataForExport = await getAllDataForExport();
    
    return allDataForExport.map((row) => {
      const transformedRow: Record<string, any> = {};
      selectedEntity.fields.forEach((targetField: any) => {
        const sourceColumnName = fieldMappings[targetField.name];
        if (sourceColumnName && appColumns.includes(sourceColumnName)) {
          let valueToTransform = row[sourceColumnName];
          const stringValue =
            valueToTransform === null || valueToTransform === undefined
              ? ""
              : String(valueToTransform).trim();

          // multi select string value, separated by comma
          const isMultiValue = targetField?.isMulti;
          let list: string[] = [];

          if (isMultiValue) {
            list = stringValue?.split(",").map((d) => d?.trim());
          }

          let exportValue: any = isMultiValue ? [] : stringValue;

          // If this field uses a lookup, export the ID instead of the display value
          if (targetField.lookupValidation && stringValue !== "") {
            const { lookupId, lookupField } = targetField.lookupValidation;
            const lookupData = getLookupData(lookupId);

            if (lookupData && lookupData.length > 0) {
              // Get lookup source name for "All" detection
              const lookupSource = lookupDataSources[lookupId];
              const lookupName = lookupSource?.name || lookupId;
              
              // Check if the value represents "All" for this lookup
              if (isAllLookupValue(stringValue, lookupName)) {
                // Get all values from the lookup
                const allLookupValues = getAllLookupValues(lookupData, lookupField);
                
                console.log(`🔍 "All" lookup expansion detected for ${targetField.name}:`, {
                  originalValue: stringValue,
                  lookupName: lookupName,
                  allValues: allLookupValues,
                  totalLookupItems: allLookupValues.length,
                  isMultiValue: isMultiValue,
                  willReturnArray: !isMultiValue // Single-value fields will return array when "All" is used
                });
                
                if (isMultiValue) {
                  // For multi-value fields, add all lookup values with IDs only
                  allLookupValues.forEach((lookupValue) => {
                    const match = lookupData.find((ld) => {
                      return String(ld[lookupField]).trim() === lookupValue;
                    });
                    if (match && match._id) {
                      exportValue.push(match._id);
                    } else if (match && match.id) {
                      exportValue.push(match.id);
                    }
                    // Skip items without ID - don't add them to exportValue
                  });
                  exportValue = JSON.stringify(exportValue);
                } else {
                  // For single-value fields, return array of all values with IDs only
                  const allIds = allLookupValues
                    .map((lookupValue) => {
                      const match = lookupData.find((ld) => {
                        return String(ld[lookupField]).trim() === lookupValue;
                      });
                      if (match && match._id) {
                        return match._id;
                      } else if (match && match.id) {
                        return match.id;
                      }
                      return null; // Return null for items without ID
                    })
                    .filter(id => id !== null); // Filter out null values
                  exportValue = allIds; // Return as array, not comma-separated string
                }
              } else {
                // Regular lookup processing (existing logic)
                if (isMultiValue) {
                  list?.forEach((item) => {
                    const match = lookupData.find((ld) => {
                      return String(ld[lookupField]).trim() === item;
                    });
                    if (match && match._id) {
                      exportValue.push(match._id);
                    } else if (match && match.id) {
                      exportValue.push(match.id);
                    } else {
                      // If no ID field, fallback to original value
                      exportValue.push(stringValue);
                    }
                  });
                  exportValue = JSON.stringify(exportValue);
                } else {
                  // Check if this is a comma-separated value (like "ABC, CDE")
                  if (stringValue.includes(',')) {
                    const commaSeparatedValues = stringValue
                      .split(',')
                      .map(value => value.trim())
                      .filter(value => value);
                    
                    const validIds = commaSeparatedValues
                      .map(value => {
                        const match = lookupData.find((ld) => {
                          return String(ld[lookupField]).trim() === value;
                        });
                        if (match && match._id) {
                          return match._id;
                        } else if (match && match.id) {
                          return match.id;
                        }
                        return null; // Skip items without ID
                      })
                      .filter(id => id !== null);
                    
                    exportValue = validIds; // Return as array of IDs
                  } else {
                    // Single value processing
                    const match = lookupData.find(
                      (ld) => String(ld[lookupField]).trim() === stringValue
                    );

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
                      // If no ID field, fallback to original value
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
                transformedRow[targetField.name] =
                  exportValue.toLowerCase() === "true" || exportValue === "1";
                break;
              case "number":
                const num = parseFloat(exportValue);
                transformedRow[targetField.name] = isNaN(num)
                  ? targetField.required
                    ? 0
                    : null
                  : num;
                break;
              case "date":
                if (isValidDateString(exportValue)) {
                  const commonFormatMatch = exportValue.match(
                    /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/
                  );
                  if (commonFormatMatch) {
                    const d = new Date(
                      parseInt(commonFormatMatch[3]),
                      parseInt(commonFormatMatch[1]) - 1,
                      parseInt(commonFormatMatch[2])
                    );
                    if (isValid(d))
                      transformedRow[
                        targetField.name
                      ] = `${d.getFullYear()}-${String(
                        d.getMonth() + 1
                      ).padStart(2, "0")}-${String(d.getDate()).padStart(
                        2,
                        "0"
                      )}`;
                    else transformedRow[targetField.name] = exportValue;
                  } else if (exportValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    transformedRow[targetField.name] = exportValue;
                  } else if (
                    isValid(parseISO(exportValue)) &&
                    exportValue.includes("T")
                  ) {
                    transformedRow[targetField.name] =
                      exportValue.split("T")[0];
                  } else {
                    transformedRow[targetField.name] = exportValue;
                  }
                } else {
                  transformedRow[targetField.name] = targetField.required
                    ? exportValue
                    : null;
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

      // Create a final row for export that matches the expected structure
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
  }, [getAllDataForExport, appColumns, exportConfig, fieldMappings, selectedEntityId, lookupDataSources]);

  // Export to API
  const handleExportToApi = async () => {
    if (!allPagesValidated) {
      showToast({
        title: "Validation Required",
        description: "Please validate all pages of data successfully before exporting to API.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedEntityId || !exportConfig) return;
    
    const selectedEntity = exportConfig.entities.find(
      (e: any) => e.id === selectedEntityId
    );
    if (!selectedEntity) return;

    const selectedEntityName = selectedEntity.id;
    const isChargeProfileEntity = selectedEntityName === "Charge Profile";
    const carrierId = getCarrierId();

    setIsExporting(true);
    setAppContextIsLoading(true);

    try {
      const dataToExport = await transformDataForExport();
      
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
      const fullApiUrl =
        (baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl) +
        (selectedEntity.url.startsWith("/")
          ? selectedEntity.url
          : "/" + selectedEntity.url);

      const isBulkUpload = selectedEntity?.isBulkUpload || fullApiUrl.includes("bulkupload");
      
      let vendorType = dataToExport[0]?.['Vendor'];
      if(vendorType) vendorType = vendorType?.toLowerCase();

      let failed: { row: Record<string, any>; error: string }[] = [];
      let successCount = 0;

      if (isBulkUpload) {
        let payload: any = {};

        // If there are multiple rows with the same 'name', merge all 'charges' into the first occurrence
        if (Array.isArray(mappedPayload) && isChargeProfileEntity) {
          const nameMap = new Map<string, any>();
          for (const row of mappedPayload) {
            if (row && typeof row.name === "string") {
              if (!nameMap.has(row.name)) {
                // Clone the row to avoid mutating the original array
                nameMap.set(row.name, { ...row, charges: Array.isArray(row.charges) ? [...row.charges] : [] });
              } else {
                // Merge charges into the first occurrence
                const existing = nameMap.get(row.name);
                if (Array.isArray(row.charges)) {
                  existing.charges = existing.charges.concat(row.charges);
                }
              }
            }
          }
          mappedPayload = Array.from(nameMap.values());
        } 

        // vendor type detection
        if(isChargeProfileEntity) {
          payload = {
            chargeProfiles: mappedPayload,
            ...(vendorType && { vendorType }),
          }
        } else {
          // Wrap payload in data array if entity requires it
          payload = wrapPayloadInDataArray(mappedPayload, selectedEntity.name);
        }

        try {
          const response = await fetch(fullApiUrl, {
            method: "POST",
            headers: requestHeaders,
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            const responseData = await response.json();
            
            // Handle Charge Profile invalid rows from API response (inValidList)
            if (isChargeProfileEntity && Array.isArray(responseData?.data?.inValidList) && responseData.data.inValidList.length > 0) {
              for (const item of responseData.data.inValidList) {
                // Compose error message from ruleErrorMessages if present
                let errorMessages: string[] = [];
                if (item.ruleErrorMessages) {
                  for (const [field, messages] of Object.entries(item.ruleErrorMessages)) {
                    if (Array.isArray(messages)) {
                      errorMessages.push(...messages);
                    }
                  }
                }
                // Fallback: if no ruleErrorMessages, try to show all fields with errors
                if (errorMessages.length === 0 && item.errors) {
                  for (const [field, msg] of Object.entries(item.errors)) {
                    errorMessages.push(`${field}: ${msg}`);
                  }
                }
                // Remove error fields from row
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
        // Handle different return types from transformPayload
        const rowsToProcess = Array.isArray(mappedPayload) ? mappedPayload : mappedPayload.rateRecords;
        
        for (let i = 0; i < rowsToProcess.length; i++) {
          const row = rowsToProcess[i];

          let requestBody: FormData | string;
          let requestHeadersForRow = { ...requestHeaders };

          try {
            const response = await fetch(fullApiUrl, {
              method: "POST",
              headers: requestHeadersForRow,
              body: JSON.stringify(row),
            });

            if (selectedEntityName === "Charge Profile") {
              let json: any = null;
              try {
                json = await response.json();
              } catch (e) {
                // fallback to text if not json
                json = null;
              }

              if (json && json.data && (Array.isArray(json.data.validList) || Array.isArray(json.data.inValidList))) {
                // Handle validList
                if (Array.isArray(json.data.validList)) {
                  successCount += json.data.validList.length;
                }
                // Handle inValidList
                if (Array.isArray(json.data.inValidList)) {
                  for (const invalidRow of json.data.inValidList) {
                    // Compose error message from ruleErrorMessages if present
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
                // If both lists are empty, treat as error
                if (
                  (!Array.isArray(json.data.validList) || json.data.validList.length === 0) &&
                  (!Array.isArray(json.data.inValidList) || json.data.inValidList.length === 0)
                ) {
                  failed.push({
                    row,
                    error: (json && json.message) || `HTTP ${response.status}`
                  });
                }
                // Skip the rest of the normal error/success handling for this row
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
              // Default handling for other entities
              if (!response.ok) {
                let errorText = "";
                try {
                  errorText = await response.text();
                  // Try to parse JSON error
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
  };

  // Export to CSV
  const handleExportToCsv = async () => {
    if (!allPagesValidated) {
      showToast({
        title: "Validation Required",
        description: "Please validate all pages of data successfully before exporting as CSV.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedEntityId || !exportConfig) return;
    
    const selectedEntity = exportConfig.entities.find(
      (e: any) => e.id === selectedEntityId
    );
    if (!selectedEntity) return;

    setIsExporting(true);
    setAppContextIsLoading(true);

    try {
      const dataToExport = await transformDataForExport();
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
  };

  const uploadFileWithEntity = async (file: File, entityId: string, mappings: Record<string, string>, sheetName?: string) => {
    try {
      // Simply fetch the data that was already uploaded to the entity by EntitySelectionDialog
      const dataResponse = await fetch(`/api/data?entityName=${entityId}&page=1&limit=500`);

      if (!dataResponse.ok) {
        const errorData = await dataResponse.json();
        throw new Error(errorData.error || "Failed to fetch uploaded data.");
      }

      const dataPayload = await dataResponse.json();

      if (dataPayload.data && dataPayload.data.length > 0) {
        // Save all data to Redux and initialize new states
        setData(dataPayload.data);
        setDatatableEditedCells(new Set());
        
        // Initialize the new state management with the first 500 rows and total count
        initializeDataStates(dataPayload.data, dataPayload.pagination?.total || dataPayload.data.length);
        
        // Set entity context
        setEntityName(entityId);
        setDetectedEntity({ entityName: entityId, confidence: 1 });
        localStorage.setItem(ENTITY_NAME_STORAGE_KEY, entityId);
        
        // Set filename and columns from response
        setFileName(file.name);
        setColumns(dataPayload.columns);
        
        // Clear initial data loading state
        setIsInitialDataLoading(false);
        
        showToast({
          title: "File Uploaded Successfully",
          description: `${file.name}${sheetName ? ` (Sheet: ${sheetName})` : ''} uploaded and mapped to ${entityId}.`,
        });
      } else {
        showToast({
          title: "No Data Found",
          description: `The file was uploaded, but no data could be read.`,
          variant: "destructive",
        });
        setData([]);
        setColumns([]);
        setViewData([]);
        setError([]);
        setDataTable({});
        setCurrentPage(1);
        setTotalPages(1);
        setIsInitialDataLoading(false);
      }
    } catch (error: any) {
      console.error("Error during file upload:", error);
      showToast({
        title: "Upload Error",
        description: error.message || "An unknown error occurred.",
        variant: "destructive",
      });
      setData([]);
      setColumns([]);
      setViewData([]);
      setError([]);
      setDataTable({});
      setCurrentPage(1);
      setTotalPages(1);
      setFileName(null);
      setIsInitialDataLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClick = () => {
    // Clear all previous state first
    dispatch(resetExportDataState());
    clearAllLookupData();
    setData([]);
    setColumns([]);
    setDatatableEditedCells(new Set());
    setViewData([]);
    setError([]);
    setDataTable({});
    setCurrentPage(1);
    setTotalPages(1);
    clearChatHistory();
    setEntityName(null);
    setDetectedEntity(null);
    setFileName(null);

    // Open the three-step dialog
    setIsEntitySelectionDialogOpen(true);
  };

  const handleEntitySelectionSave = async (
    entityId: string, 
    mappings: Record<string, string>, 
    confidences: Record<string, { score: number; reasoning: string } | null>,
    file: File,
    sheetName?: string
  ) => {
    try {
      setIsLoading(true);
      
      // Save the entity selection and mappings to Redux
      dispatch(setSelectedEntityId(entityId));
      dispatch(setFieldMappings(mappings));
      dispatch(setFieldMappingConfidences(confidences));
      
      // Save mappings to localStorage for persistence
      const fileName = file.name;
      if (fileName) {
        const storageKey = `columnMapping_${fileName}_${entityId}`;
        const confidenceStorageKey = `columnMappingConfidence_${fileName}_${entityId}`;
        localStorage.setItem(storageKey, JSON.stringify(mappings));
        localStorage.setItem(confidenceStorageKey, JSON.stringify(confidences));
      }

      // Upload the file with the entity context
      await uploadFileWithEntity(file, entityId, mappings, sheetName);
      
      // Close dialog
      setIsEntitySelectionDialogOpen(false);
      
    } catch (error: any) {
      console.error("Error in entity selection process:", error);
      showToast({
        title: "Error",
        description: error.message || "An error occurred in the upload process.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEntitySelectionClose = () => {
    setIsEntitySelectionDialogOpen(false);
  };

  return (
    <>
      <div className="flex items-center gap-3">
        {/* Step 1: Upload File */}
        <Button 
          onClick={handleClick} 
          variant={isEntityMapped ? "secondary" : "default"}
          size="sm"
          disabled={isEntityMapped}
        >
          <UploadCloud className="mr-2 h-4 w-4" />
          {isEntityMapped ? "Uploaded ✓" : "Upload File"}
        </Button>
        
        {/* Arrow */}
        {isEntityMapped && <span className="text-muted-foreground">→</span>}
        
        {/* Step 2: Validate Data */}
        {canValidate && (
          <>
            <Button 
              onClick={handleValidateData} 
              variant={isCurrentPageValid ? "secondary" : "outline"}
              size="sm"
              disabled={isValidating}
            >
              {isValidating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : isCurrentPageValid ? (
                <CheckCircle className="mr-2 h-4 w-4" />
              ) : hasCurrentPageBeenValidated ? (
                <AlertTriangle className="mr-2 h-4 w-4" />
              ) : null}
              {isValidating
                ? "Validating..."
                : isCurrentPageValid
                ? "Valid ✓"
                : hasCurrentPageBeenValidated
                ? "Re-validate"
                : "Validate Data"}
            </Button>
            
            {/* Arrow */}
            {isCurrentPageValid && <span className="text-muted-foreground">→</span>}
          </>
        )}

        {/* Step 3: Export Options */}
        {allPagesValidated && (
          <div className="flex items-center gap-1">
            <Button 
              onClick={handleExportToApi} 
              variant="default"
              size="sm"
              disabled={isExporting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Export to API
            </Button>

            <div className="h-4 w-px bg-border"></div>

            <Button 
              onClick={handleExportToCsv} 
              variant="outline"
              size="sm"
              disabled={isExporting}
            >
              <DownloadCloud className="mr-1 h-3 w-3" />
              CSV
            </Button>
          </div>
        )}
        
        {/* Clear All - positioned at the end */}
        <div className="ml-2">
          <ClearAllButton />
        </div>
      </div>
            
      <EntitySelectionDialog
        isOpen={isEntitySelectionDialogOpen}
        onClose={handleEntitySelectionClose}
        onSave={handleEntitySelectionSave}
      />
    </>
  );
}
