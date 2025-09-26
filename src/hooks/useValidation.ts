import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAppContext } from '@/hooks/useAppContext';
import { setValidationMessages, setHasValidated, setIsDataValid, setErrorRows, setErrorCells, setErrorMessages, setTotalErrorCount, setPageValidationStatus, setTotalPages } from '@/store/slices/exportDataSlice';
import { checkEmailExists, checkCompanyNamesExists } from "@/utils/validationCheck";
import { AUTH_TOKEN_STORAGE_KEY, radiusRate, nonRulesConstant, unitOfMeasureOptions } from '@/lib/constants';
import { isValid, parseISO } from 'date-fns';
import { uniqBy } from 'lodash';
import type { RootState } from '@/store';
import type { ExportEntity } from '@/config/exportEntities';
import { isValidDateString, validateAndConvertDate } from '@/utils/dateUtils';

// Utility functions
const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
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

export const useValidation = (lookupDataSources: any, setValidChargeProfileList: (list: any[]) => void) => {
  const dispatch = useDispatch();
  const { 
    showToast, 
    setIsLoading: setAppContextIsLoading,
    viewData,
    currentPage,
    totalPages,
    rowsPerPage,
    entityConfig,
    getBaseUrl
  } = useAppContext();
  
  const { selectedEntityId, fieldMappings } = useSelector((state: RootState) => state.exportData);

  const validateSingleRow = useCallback((
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
        errors.push(`Row ${rowIndex + 1}, Target "${targetField.name}": required by API but not mapped.`);
        return;
      }
      if (!sourceColumnName) return;

      const value = row[sourceColumnName];
      const stringValue: string = value === null || value === undefined ? "" : String(value).trim();

      if (targetField.required && stringValue === "") {
        errors.push(`Row ${rowIndex + 1}, Field "${targetField.name}" (from "${sourceColumnName}"): required by API but source data is empty.`);
      }

      if (stringValue !== "") {
        switch (targetField.type) {
          case "string":
          case "email":
            if (targetField.minLength !== undefined && targetField.minLength !== null && stringValue.length < targetField.minLength) {
              errors.push(`Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): min length ${targetField.minLength}, got ${stringValue.length}. Value: "${stringValue.substring(0, 50)}"`);
            }
            if (targetField.maxLength !== undefined && targetField.maxLength !== null && stringValue.length > targetField.maxLength) {
              errors.push(`Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): max length ${targetField.maxLength}, got ${stringValue.length}. Value: "${stringValue.substring(0, 50)}"`);
            }
            if (targetField.pattern) {
              try {
                const regex = new RegExp(targetField.pattern);
                if (!regex.test(stringValue)) {
                  errors.push(`Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): does not match pattern "${targetField.pattern}". Value: "${stringValue.substring(0, 50)}"`);
                }
              } catch (e) {
                errors.push(`Row ${rowIndex + 1}, Field "${targetField.name}": Configuration error - Invalid regex pattern provided: "${targetField.pattern}". Pattern validation skipped.`);
              }
            }
            if (targetField.type === "email" && !isValidEmail(stringValue)) {
              errors.push(`Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): not a valid email. Value: "${stringValue}"`);
            }
            break;
          case "number":
            const numValue = parseFloat(stringValue);
            if (isNaN(numValue)) {
              errors.push(`Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): should be a number. Found "${stringValue}".`);
            } else {
              if (targetField.minValue !== undefined && numValue < targetField.minValue)
                errors.push(`Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): min value ${targetField.minValue}, got ${numValue}.`);
              if (targetField.maxValue !== undefined && numValue > targetField.maxValue)
                errors.push(`Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): max value ${targetField.maxValue}, got ${numValue}.`);
            }
            break;
          case "boolean":
            if (stringValue !== "" && !["true", "false", "1", "0"].includes(stringValue.toLowerCase())) {
              errors.push(`Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): should be boolean (true/false/TRUE/FALSE/True/False, 1/0). Found "${stringValue}".`);
            }
            break;
          case "date":
            const dateValidation = validateAndConvertDate(stringValue, entityConfig.id, targetField.name);
            if (!dateValidation.isValid) {
              errors.push(`Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): ${dateValidation.errorMessage}`);
            }
            break;
        }
      }

      // Validate enum values if configured
      if (targetField.enum && stringValue !== "") {
        if (!targetField.enum.includes(stringValue)) {
          errors.push(`Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): must be one of [${targetField.enum.join(", ")}]. Found "${stringValue}".`);
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

        const lookupSource = lookupDataSources[lookupId];
        let lookupDataSource: any[] | null = null;
        let lookupSourceName = lookupId;
        let expectedField = lookupField;
        
        if (lookupSource) {
          lookupDataSource = lookupSource.getData();
          lookupSourceName = lookupSource.name;
          expectedField = lookupSource.field;
        }

        // Split comma-separated values for validation, but be careful with names that contain commas
        if (stringValue.includes(',')) {
          // For Fleet Owners, don't split comma-separated values as they represent single entity names
          if (lookupSourceName === "Fleet Owners") {
            // Keep the entire value as a single item
            arrayValue = [stringValue];
          } else {
            // For other lookups, split by comma as usual
            arrayValue = stringValue?.split(",")?.filter((value) => value?.trim());
          }
        }


        
        if (!lookupSource) {
          if (!errors.some((e) => e.includes(`Lookup source ID "${lookupId}" is not yet supported for validation.`))) {
            errors.push(`Configuration Error: Lookup source ID "${lookupId}" for target field "${targetField.name}" is not yet supported for validation. Please check Lookups page setup.`);
          }
        }

        if (lookupDataSource && lookupDataSource.length > 0) {
          const firstLookupItem = lookupDataSource[0];
          if (firstLookupItem && !(expectedField in firstLookupItem)) {
            if (!errors.some((e) => e.startsWith(`Lookup column "${expectedField}" not found in ${lookupSourceName}`))) {
              errors.push(`Configuration Error for Target "${targetField.name}": Lookup column "${expectedField}" not found in ${lookupSourceName} data. Cannot validate.`);
            }
          } else {
            // Check if the value represents "All" for this lookup
            if (isAllLookupValue(stringValue, lookupSourceName)) {
              // "All" values are always valid for lookup validation
            } else {
              // Handle comma-separated values validation
              if (arrayValue?.length > 0) {
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
                  errors.push(`Row ${rowIndex + 1}, Target "${targetField.name}" (from "${sourceColumnName}"): Values "${invalidValues.join(', ')}" not found in ${lookupSourceName} (column: ${expectedField}).`);
                }
              } else {
                // Single value validation
                const foundInLookup = lookupDataSource.some((lookupRow) => {
                  const _value = String(lookupRow[expectedField]).trim();
                  return _value === stringValue.trim();
                });
                if (!foundInLookup) {
                  errors.push(`Row ${rowIndex + 1}, Target "${targetField.name}" (from "${sourceColumnName}"): Value "${stringValue}" not found in ${lookupSourceName} (column: ${expectedField}).`);
                }
              }
            }
          }
        } else if (lookupSource && (!lookupDataSource || lookupDataSource.length === 0)) {
          if (!errors.some((e) => e.includes(`${lookupSourceName} lookup data is not loaded`))) {
            errors.push(`Validation Skipped for "${targetField.name}": ${lookupSourceName} lookup data is not loaded. Please fetch it on the Lookups page.`);
          }
        }
      }
    });
    return errors;
  }, [fieldMappings, selectedEntityId, lookupDataSources]);

  const validateChargeProfiles = useCallback(async (currentPageData: any[], tariffType: string, vendorTypeForPayload?: string) => {
    const chargeProfileNames = uniqBy(currentPageData, 'Charge Profile Name')
      .map(row => row['Charge Profile Name'])
      .filter(name => name && name.trim());

    if (chargeProfileNames.length > 0) {
      try {
        const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
        // Priority: localStorage (most recent) > entityConfig (database) > default
        const baseUrl = getBaseUrl();

        const payloadForValidation: Record<string, any> = { names: chargeProfileNames };
        if (vendorTypeForPayload) {
          payloadForValidation.vendorType = vendorTypeForPayload;
        }

        const response = await fetch(`${baseUrl}/rate-engine/vendor-rate/validate-charge-profile`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payloadForValidation)
        });

        const result = await response.json();
        
        if (result.data?.existingProfiles && Array.isArray(result.data.existingProfiles)) {
          setValidChargeProfileList(result.data.existingProfiles);
        } else {
          setValidChargeProfileList([]);
        }
        
        const errors: string[] = [];
        if (result.data?.nonExistingProfiles?.length > 0) {
          result.data.nonExistingProfiles.forEach((invalidName: string) => {
            errors.push(`Charge Profile "${invalidName}" does not exist in the database for ${tariffType}.`);
          });
        }
        return errors;
      } catch (error: any) {
        console.error("Error validating charge profiles:", error);
        return [`Failed to validate charge profiles: ${error.message || "API error"}`];
      }
    }
    return [];
  }, [setValidChargeProfileList]);

  const validateEmails = useCallback(async (currentPageData: any[], currentPage: number, rowsPerPage: number) => {
    const emailFields = ["Email", "email"];
    const emailsToCheck: string[] = [];
    
    currentPageData.forEach((row, index) => {
      emailFields.forEach(fieldName => {
        if (row[fieldName] && String(row[fieldName]).trim()) {
          const email = String(row[fieldName]).trim();
          if (email && !emailsToCheck.includes(email)) {
            emailsToCheck.push(email);
          }
        }
      });
    });

    if (emailsToCheck.length > 0) {
      try {
        const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
        // Priority: localStorage (most recent) > entityConfig (database) > default
        const baseUrl = getBaseUrl();
        const emailCheckResult = await checkEmailExists(emailsToCheck, token || "", baseUrl);
        
        if (emailCheckResult.error) {
          return [`Failed to validate email uniqueness: ${emailCheckResult.error}`];
        }

        const errors: string[] = [];
        const existingEmails = emailCheckResult.existingEmails || [];
        
        existingEmails.forEach(existingEmail => {
          currentPageData.forEach((row, index) => {
            emailFields.forEach(fieldName => {
              if (row[fieldName] && String(row[fieldName]).trim() === existingEmail) {
                // Calculate global row index based on current page and position
                const globalRowIndex = ((currentPage - 1) * rowsPerPage) + index + 1;
                errors.push(`Row ${globalRowIndex}, Field "${fieldName}": Email "${existingEmail}" is already in use. Please provide a different email.`);
              }
            });
          });
        });
        return errors;
      } catch (error: any) {
        return [`Failed to validate email uniqueness: ${error.message || "API error"}`];
      }
    }
    return [];
  }, [currentPage, rowsPerPage]);

  const validateCompanyNames = useCallback(async (currentPageData: any[], currentPage: number, rowsPerPage: number) => {
    const companyNameFields = ["Profile Name*","Company Name*"];
    const companyNamesToCheck: string[] = [];
    
    currentPageData.forEach((row, index) => {
      companyNameFields.forEach(fieldName => {
        if (row[fieldName] && String(row[fieldName]).trim()) {
          const companyName = String(row[fieldName]).trim();
          if (companyName && !companyNamesToCheck.includes(companyName)) {
            companyNamesToCheck.push(companyName);
          }
        }
      });
    });
    
    if (companyNamesToCheck.length > 0) {
      try {
        const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
        const baseUrl = getBaseUrl();
        const companyCheckResult = await checkCompanyNamesExists(companyNamesToCheck, token || "", baseUrl);
        
        if (companyCheckResult.error) {
          return [`Failed to validate company name uniqueness: ${companyCheckResult.error}`];
        }

        const errors: string[] = [];
        const existingCompanyNames = companyCheckResult.existingCompanyNames || [];
        
        existingCompanyNames.forEach(existingCompanyName => {
          currentPageData.forEach((row, index) => {
            companyNameFields.forEach(fieldName => {
              if (row[fieldName] && String(row[fieldName]).trim() === existingCompanyName) {
                // Calculate global row index based on current page and position
                const globalRowIndex = ((currentPage - 1) * rowsPerPage) + index + 1;
                errors.push(`Row ${globalRowIndex}, Field "${fieldName}": Company Name "${existingCompanyName}" is already in use. Please provide a different company name.`);
              }
            });
          });
        });
        return errors;
      } catch (error: any) {
        return [`Failed to validate company name uniqueness: ${error.message || "API error"}`];
      }
    }
    return [];
  }, [currentPage, rowsPerPage]);

  const validatePaymentTermsMethod = useCallback((currentPageData: any[], currentPage: number, rowsPerPage: number) => {
    const errors: string[] = [];
    const validOptions = ["", "day", "month"]; // blank, day, or month only
    
    currentPageData.forEach((row, index) => {
      const paymentTermsMethod = row['Payment Terms Method'];
      if (paymentTermsMethod !== undefined && paymentTermsMethod !== null) {
        const stringValue = String(paymentTermsMethod).trim();
        if (!validOptions.includes(stringValue)) {
          // Calculate global row index based on current page and position
          const globalRowIndex = ((currentPage - 1) * rowsPerPage) + index + 1;
          errors.push(`Row ${globalRowIndex}, Field "Payment Terms Method": must be blank, "day", or "month". Found "${stringValue}".`);
        }
      }
    });
    
    return errors;
  }, [currentPage, rowsPerPage]);

  const validateLoadEntity = useCallback(async (currentPageData: any[], currentPage: number, rowsPerPage: number, entityConfig?: any) => {
    const errors: string[] = [];
    
    // Extract customer lookup IDs, container numbers, and reference numbers
    const customers: string[] = [];
    const containers: string[] = [];
    const secondaryReferences: string[] = [];
    
    currentPageData.forEach((row, index) => {
      // Get customer lookup IDs from all customer-related fields
      const customerFields = [
        "Customer",
        "Pick Up Location", 
        "Delivery City/State",
        "Container Return",
        "Hook Chassis Location",
        "Terminate Chassis Location"
      ];
      
      customerFields.forEach(fieldName => {
        const sourceField = fieldMappings[fieldName];
        if (sourceField && row[sourceField] && String(row[sourceField]).trim()) {
          const customerValue = String(row[sourceField]).trim();
          if (customerValue && !customers.includes(customerValue)) {
            customers.push(customerValue);
          }
        }
      });
      
      // Get container numbers from Container field
      const containerField = fieldMappings["Container"];
      if (containerField && row[containerField] && String(row[containerField]).trim()) {
        const containerValue = String(row[containerField]).trim();
        if (containerValue && !containers.includes(containerValue)) {
          containers.push(containerValue);
        }
      }
      
      // Get reference numbers from Reference # field
      const referenceField = fieldMappings["Reference #"];
      if (referenceField && row[referenceField] && String(row[referenceField]).trim()) {
        const referenceValue = String(row[referenceField]).trim();
        if (referenceValue && !secondaryReferences.includes(referenceValue)) {
          secondaryReferences.push(referenceValue);
        }
      }
    });
    
    if (customers.length > 0 || containers.length > 0 || secondaryReferences.length > 0) {
      try {
        const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
        const baseUrl = getBaseUrl();
        
        // Create FormData for the API call
        const formData = new FormData();
        formData.append('customers', JSON.stringify(customers));
        formData.append('containers', JSON.stringify(containers));
        formData.append('secondaryReferenceNo', JSON.stringify(secondaryReferences));
        
        const response = await fetch(`${baseUrl}/bulkupload/validateCompanyNames`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json, text/plain, */*',
          },
          body: formData,
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          return [`Failed to validate Load entity data: ${errorData.message || errorData.error || "API error"}`];
        }
        
        const responseData = await response.json();
        const { customers: existingCustomers, containers: existingContainers } = responseData.data || {};
        
        // Check for existing containers and highlight them
        if (existingContainers && Array.isArray(existingContainers)) {
          existingContainers.forEach((existingContainer: string) => {
            currentPageData.forEach((row, index) => {
              const containerField = fieldMappings["Container"];
              if (containerField && row[containerField] && String(row[containerField]).trim() === existingContainer) {
                const globalRowIndex = ((currentPage - 1) * rowsPerPage) + index + 1;
                errors.push(`Row ${globalRowIndex}, Field "Container": Container "${existingContainer}" already exists in the system.`);
              }
            });
          });
        }
        
        // Check for existing references and highlight them
        // Note: The API response doesn't include secondary references, so we'll assume they're valid
        // If you need to validate references separately, you'll need a different API endpoint
        
        return errors;
      } catch (error: any) {
        return [`Failed to validate Load entity data: ${error.message || "API error"}`];
      }
    }
    
    return errors;
  }, [currentPage, rowsPerPage, fieldMappings]);

  const validateChargeProfileRules = useCallback((currentPageData: any[], currentPage: number, rowsPerPage: number) => {
    const errors: string[] = [];
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

      if (!isRadiusRate && !nonRulesConstant.includes(unitOfMeasureValue)) {
        const isRulesNotSelected = !(ifEvent || eventLocation) && !(fromEvent || toEvent?.length) && !(fromLegs || toLegs || fromLegEventLocation || toLegEventLocation);

        // Find the actual row index in the currentPageData to get the correct global row number
        // We need to find the row by matching key fields since object references might not match
        const actualRowIndex = currentPageData.findIndex(row => 
          row['Charge Profile Name'] === cp['Charge Profile Name'] &&
          row['Unit of Measure'] === cp['Unit of Measure']
        );
        
        // Calculate the global row index based on the actual position in currentPageData
        const globalRowIndex = actualRowIndex >= 0 ? ((currentPage - 1) * rowsPerPage) + actualRowIndex + 1 : ((currentPage - 1) * rowsPerPage) + idx + 1;

        const rowLabel = cp['Charge Profile Name']
          ? `Charge Profile "${cp['Charge Profile Name']}"`
          : `Row ${globalRowIndex}`;

        if (isRulesNotSelected) {
          errors.push(`${rowLabel}, Field "Rules": Please select at least one Rule!`);
          return;
        }
        if (fromEvent && !toEvent?.length) {
          errors.push(`${rowLabel}, Field "To Event": To Event is required!`);
        }
        if (toEvent?.length && !fromEvent) {
          errors.push(`${rowLabel}, Field "From Event": From Event is required!`);
        }
        if (![...radiusRate, "permile"].includes(unitOfMeasure) && isRulesNotSelected && !inEvent) {
          errors.push(`${rowLabel}, Field "In Event": In Event is required!`);
        }
      }
    });
    
    return errors;
  }, [currentPage, rowsPerPage]);

  const handleValidateData = useCallback(async (selectedEntityId: string, exportConfig: any) => {
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

    setAppContextIsLoading(true);
    dispatch(setValidationMessages([]));
    dispatch(setErrorRows([]));
    dispatch(setErrorCells({}));
    dispatch(setErrorMessages({}));
    dispatch(setTotalErrorCount(0));

    try {
      let allValidationErrors: string[] = [];
      
      let currentPageData = viewData && viewData.length > 0 ? viewData : [];
      

      
      if (currentPageData.length === 0) {
        showToast({
          title: "No Data to Validate",
          description: "No data available on current page for validation.",
          variant: "destructive",
        });
        return;
      }

      let uniqAppData = currentPageData;
      if(isChargeProfileEntity) {
        uniqAppData = uniqBy(currentPageData, 'Charge Profile Name');
      }

      // Handle tariff validation
      if (selectedEntityId === "Tariff") {        
        const hasVendorColumn = currentPageData.some((row: any) => row.hasOwnProperty('Vendor Type'));
        
        let tariffType: string;
        let vendorTypeForPayload: string | undefined;
        
        if (!hasVendorColumn) {
          tariffType = "Load Tariff";
          vendorTypeForPayload = undefined;
        } else {
          const vendorTypes = currentPageData
            .map((row: any) => row['Vendor Type'])
            .filter((vendor: any) => vendor && vendor.trim())
            .map((vendor: string) => vendor.toLowerCase());
          
          if (vendorTypes.some((vendor: string) => vendor === 'driver')) {
            tariffType = "Driver Tariff";
            vendorTypeForPayload = "driver";
          } else if (vendorTypes.some((vendor: string) => vendor === 'carrier')) {
            tariffType = "Carrier Tariff";
            vendorTypeForPayload = "carrier";
          } else {
            tariffType = "Load Tariff";
            vendorTypeForPayload = undefined;
          }
        }
        
        const chargeProfileErrors = await validateChargeProfiles(currentPageData, tariffType, vendorTypeForPayload);
        allValidationErrors = [...allValidationErrors, ...chargeProfileErrors];
      }

      // Handle Organization entity validation
      if (selectedEntityId === "Organization") {
        const emailErrors = await validateEmails(uniqAppData, currentPage, rowsPerPage);
        const companyNameErrors = await validateCompanyNames(uniqAppData, currentPage, rowsPerPage);
        const paymentTermsMethodErrors = validatePaymentTermsMethod(uniqAppData, currentPage, rowsPerPage);
        allValidationErrors = [...allValidationErrors, ...emailErrors, ...companyNameErrors, ...paymentTermsMethodErrors];
      }

      // Handle Load entity validation
      if (selectedEntityId === "Load") {
        const loadValidationErrors = await validateLoadEntity(uniqAppData, currentPage, rowsPerPage, exportConfig);
        allValidationErrors = [...allValidationErrors, ...loadValidationErrors];
      }

      // Regular field validation
      let allErrorsForDataTable: string[] = [];
      for (let i = 0; i < uniqAppData.length; i++) {
        const row = uniqAppData[i];
        const globalRowIndex = ((currentPage - 1) * rowsPerPage) + i;
        const rowErrors = validateSingleRow(row, globalRowIndex, selectedEntity);
        
        // Charge profile rules validations
        if (isChargeProfileEntity) {
          const ruleErrors = validateChargeProfileRules(currentPageData, currentPage, rowsPerPage);
          allErrorsForDataTable = [...allErrorsForDataTable, ...ruleErrors];
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
          // The row number in the message is already the global row number (1-based)
          // We need to convert it to 0-based index for error highlighting
          const globalRowIndex = parseInt(rowMatch[1]) - 1;
          errorRows.add(globalRowIndex);

          const fieldMatch = message.match(/"([^"]+)" \(from "([^"]+)"\)/);
          if (fieldMatch) {
            const sourceColumnName = fieldMatch[2];
            if (!errorCells.has(sourceColumnName)) {
              errorCells.set(sourceColumnName, new Set());
            }
            errorCells.get(sourceColumnName)!.add(globalRowIndex.toString());
            errorMessages.set(`${globalRowIndex}:${sourceColumnName}`, message);
          } else {
            const altFieldMatch = message.match(/"([^"]+)"/);
            if (altFieldMatch) {
              const targetField = altFieldMatch[1];
              const sourceColumn = fieldMappings[targetField];
              
              if (sourceColumn && sourceColumn.trim() !== '') {
                if (!errorCells.has(sourceColumn)) {
                  errorCells.set(sourceColumn, new Set());
                }
                errorCells.get(sourceColumn)!.add(globalRowIndex.toString());
                errorMessages.set(`${globalRowIndex}:${sourceColumn}`, message);
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
      dispatch(setTotalErrorCount(allErrorsForDataTable.length));
      dispatch(setTotalPages(totalPages));
      
      const currentPageIsValid = allErrorsForDataTable.length === 0;
      dispatch(setPageValidationStatus({
        page: currentPage,
        isValid: currentPageIsValid,
        errorCount: allErrorsForDataTable.length,
        errorRows: serializableErrorRows
      }));

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
          variant: "success",
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
      setAppContextIsLoading(false);
    }
  }, [
    showToast, 
    setAppContextIsLoading, 
    dispatch, 
    viewData, 
    currentPage, 
    totalPages, 
    rowsPerPage, 
    fieldMappings,
    validateSingleRow,
    validateChargeProfiles,
    validateEmails,
    validateCompanyNames,
    validatePaymentTermsMethod,
    validateChargeProfileRules,
    validateLoadEntity
  ]);

  return {
    handleValidateData,
    validateSingleRow
  };
}; 