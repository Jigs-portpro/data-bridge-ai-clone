"use client";

import type React from 'react';
import { useRef, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { UploadCloud, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useAppContext } from '@/hooks/useAppContext';
import * as XLSX from 'xlsx';
import { SheetSelectionDialog } from '@/components/dialogs/SheetSelectionDialog';
import { EntitySelectionDialog } from '@/components/dialogs/EntitySelectionDialog';
import { ClearAllButton } from "@/components/ClearAllButton";
import { CHATPANE_HISTORY_KEY, ENTITY_NAME_STORAGE_KEY, DATATABLE_COLUMNS_KEY, DATATABLE_DATA_KEY, AUTH_TOKEN_STORAGE_KEY } from '@/lib/constants';
import { useDispatch, useSelector } from 'react-redux';
import { resetExportDataState, setSelectedEntityId, setFieldMappings, setFieldMappingConfidences, setValidationMessages, setHasValidated, setIsDataValid, setErrorRows, setErrorCells, setErrorMessages, setOrganizedData } from '@/store/slices/exportDataSlice';
import { clearAllExportState } from '@/utils/helpers';
import { useEntityContext } from '@/contexts/EntityContext';
import { useSession } from 'next-auth/react';
import type { RootState } from '@/store';
import type { ExportConfig, ExportEntity } from '@/config/exportEntities';
import { checkEmailExists, checkCompanyNamesExists } from "@/utils/validationCheck";
import { uniqBy } from 'lodash';

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
    setTotalPages
  } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const dispatch = useDispatch();
  const { data: session } = useSession();

  // Redux state
  const { 
    selectedEntityId, 
    fieldMappings, 
    hasValidated, 
    isDataValid, 
    validationMessages 
  } = useSelector((state: RootState) => state.exportData);

  const [excelOriginalFile, setExcelOriginalFile] = useState<File | null>(null);
  const [excelSheetNames, setExcelSheetNames] = useState<string[]>([]);
  const [isSheetSelectionDialogOpen, setIsSheetSelectionDialogOpen] = useState(false);
  const [isEntitySelectionDialogOpen, setIsEntitySelectionDialogOpen] = useState(false);
  const [currentUploadFile, setCurrentUploadFile] = useState<File | null>(null);
  const [currentSheetName, setCurrentSheetName] = useState<string | undefined>(undefined);
  const [exportConfig, setExportConfig] = useState<ExportConfig | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const { setDetectedEntity } = useEntityContext();

  // Check if file has been uploaded and mapped
  const isFileUploaded = appData.length > 0 && appColumns.length > 0;
  const isEntityMapped = Boolean(selectedEntityId && Object.keys(fieldMappings).length > 0);
  const canValidate = isFileUploaded && isEntityMapped;

  // Fetch export configuration on component mount
  useEffect(() => {
    const fetchExportConfig = async () => {
      try {
        const response = await fetch("/api/export-entities");
        if (response.ok) {
          const config: ExportConfig = await response.json();
          setExportConfig(config);
        }
      } catch (error) {
        console.error("Error fetching export config:", error);
      }
    };
    fetchExportConfig();
  }, []);

  const isValidEmail = (email: string): boolean => {
    if (!email || typeof email !== "string") return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidDateString = (dateString: string): boolean => {
    if (!dateString || typeof dateString !== "string") return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  };

  const validateSingleRow = useCallback(
    (
      row: Record<string, any>,
      rowIndex: number,
      entityConfig: ExportEntity
    ): string[] => {
      const errors: string[] = [];
      entityConfig.fields.forEach((targetField) => {
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
      });
      return errors;
    },
    [fieldMappings]
  );

  const updateDataTableStateAndSaveToRedis = async (allErrorsForDataTable: string[]) => {
    try {
      if (!session?.user?.sessionId || !appData.length) {
        return;
      }

      const selectedEntity = exportConfig?.entities.find((e: any) => e.id === selectedEntityId);
      const displayEntityName = selectedEntity?.name || selectedEntityId;
      if (!displayEntityName) {
        return;
      }

      const errorRows = new Set<number>();
      const errorCells = new Map<string, Set<string>>();
      const errorMessages = new Map<string, string>();

      allErrorsForDataTable.forEach((message) => {
        const rowMatch = message.match(/Row (\d+)/);
        if (rowMatch) {
          const rowIndex = parseInt(rowMatch[1]) - 1;
          errorRows.add(rowIndex);

          const fieldMatch = message.match(/"([^"]+)" \(from "([^"]+)"\)/);
          if (fieldMatch) {
            const sourceColumnName = fieldMatch[2];
            if (!errorCells.has(sourceColumnName)) {
              errorCells.set(sourceColumnName, new Set());
            }
            errorCells.get(sourceColumnName)!.add(rowIndex.toString());
            errorMessages.set(`${rowIndex}_${sourceColumnName}`, message);
          }
        }
      });

      const serializableErrorRows = Array.from(errorRows);
      const serializableErrorCells: Record<string, string[]> = {};
      errorCells.forEach((indices, column) => {
        serializableErrorCells[column] = Array.from(indices);
      });
      const serializableErrorMessages: Record<string, string> = {};
      errorMessages.forEach((message, key) => {
        serializableErrorMessages[key] = message;
      });

      const errorData = appData.filter((_, index) => serializableErrorRows.includes(index));
      const validData = appData.filter((_, index) => !serializableErrorRows.includes(index));
      const organizedData = [...errorData, ...validData];

      dispatch(setErrorRows(serializableErrorRows));
      dispatch(setErrorCells(serializableErrorCells));
      dispatch(setErrorMessages(serializableErrorMessages));
      dispatch(setOrganizedData(organizedData));

      const payload = {
        sessionId: session.user.sessionId,
        entityName: displayEntityName,
        data: appData,
        columns: appColumns,
        datatableEditedCells: [],
        organizedData: organizedData,
        errorRows: serializableErrorRows,
        errorCells: serializableErrorCells,
        errorMessages: serializableErrorMessages,
        hasValidated: true,
        validationMessages: allErrorsForDataTable,
        timestamp: Date.now()
      };

      await fetch('/api/data', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

    } catch (error) {
      console.error('Error updating DataTable state and saving to Redis:', error);
    }
  };

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

    setIsValidating(true);
    setAppContextIsLoading(true);
    dispatch(setValidationMessages([]));

    try {
      let allValidationErrors: string[] = [];
      let uniqAppData = appData;

      // Handle Organization entity email validation
      if (selectedEntityId === "Organization") {
        const emailFields = ["Email", "email"];
        const emailsToCheck: string[] = [];
        
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

        if (emailsToCheck.length > 0) {
          try {
            const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
            const emailCheckResult = await checkEmailExists(emailsToCheck, token || "");
            
            if (emailCheckResult.error) {
              allValidationErrors.push(
                `Failed to validate email uniqueness: ${emailCheckResult.error}`
              );
            } else {
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

        // Company name validation
        const companyNameFields = ["Company Name", "company_name"];
        const companyNamesToCheck: string[] = [];
        
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

        if (companyNamesToCheck.length > 0) {
          try {
            const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
            const companyCheckResult = await checkCompanyNamesExists(companyNamesToCheck, token || "");
            
            if (companyCheckResult.error) {
              allValidationErrors.push(
                `Failed to validate company name uniqueness: ${companyCheckResult.error}`
              );
            } else {
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

      // Regular field validation
      let allErrorsForDataTable: string[] = [];
      for (let i = 0; i < uniqAppData.length; i++) {
        const row = uniqAppData[i];
        const rowErrors = validateSingleRow(row, i, selectedEntity);
        allErrorsForDataTable = [...allErrorsForDataTable, ...rowErrors];
      }
      
      allErrorsForDataTable = [...allValidationErrors, ...allErrorsForDataTable];

      // Limit validation messages for UI display
      const MAX_VALIDATION_MESSAGES_DISPLAYED = 100;
      allValidationErrors = allErrorsForDataTable.slice(0, MAX_VALIDATION_MESSAGES_DISPLAYED);
      if (allErrorsForDataTable.length > MAX_VALIDATION_MESSAGES_DISPLAYED) {
        allValidationErrors.push(
          `Showing first ${MAX_VALIDATION_MESSAGES_DISPLAYED} of ${allErrorsForDataTable.length} errors. All errors are processed for DataTable highlighting.`
        );
      }

      dispatch(setHasValidated(true));
      dispatch(setValidationMessages(allValidationErrors));

      // Update DataTable state and save to Redis
      await updateDataTableStateAndSaveToRedis(allErrorsForDataTable);

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
          description: `${allErrorsForDataTable.length} error(s) found. Check the data table for details.`,
          variant: "destructive",
          duration: 7000,
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
  }, [selectedEntityId, exportConfig, appData, showToast, validateSingleRow, setAppContextIsLoading, fieldMappings, dispatch, session]);

  const uploadFileInBackground = async (file: File, sheetName?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (sheetName) {
      formData.append("sheetName", sheetName);
    }

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "File upload failed");
      }

      const result = await response.json();
      const { entityName, fileName, sheetName: processedSheetName, totalRows } = result;

      localStorage.setItem(ENTITY_NAME_STORAGE_KEY, entityName);
      setEntityName(entityName);
      setDetectedEntity({ entityName, confidence: 1 });
      setFileName(fileName);

      // Fetch only the first 500 rows for initial display
      const dataResponse = await fetch(`/api/data?entityName=${entityName}&page=1&limit=500`);
      if (!dataResponse.ok) {
        const errorData = await dataResponse.json();
        throw new Error(errorData.error || "Failed to fetch data after upload.");
      }

      const dataPayload = await dataResponse.json();

      if (dataPayload.data && dataPayload.data.length > 0) {
        const columns = Object.keys(dataPayload.data[0]);
        
        // Save all data to Redis and initialize new states
        setData(dataPayload.data);
        setColumns(columns);
        setDatatableEditedCells(new Set());
        
        // Initialize the new state management with the first 500 rows and total count
        initializeDataStates(dataPayload.data, totalRows);
        
        showToast({
          title: "File Uploaded",
          description: `${fileName}${processedSheetName ? ` (Sheet: ${processedSheetName})` : ''} processed successfully.`,
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // Clear all Redux state for export data
    dispatch(resetExportDataState());
    
    // Clear all lookup data cache when new file is uploaded
    clearAllLookupData();
    
    // Immediately clear in-memory state to show loading state
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
    setFileName(null); // Clear filename to ensure clean state

    // Clear all Redis data for the session
    try {
      const sessionId = session?.user?.sessionId;
      if (sessionId) {
        await fetch(`/api/clear-data`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (err) {
      // Ignore errors
    }


    
    const file = event.target.files?.[0];
    if (file) {
      const validCsvType = 'text/csv';
      const validXlsType = 'application/vnd.ms-excel';
      const validXlsxType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      if (![validCsvType, validXlsType, validXlsxType].includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xls') && !file.name.endsWith('.xlsx')) {
        showToast({
          title: 'Invalid File Type',
          description: 'Please upload a CSV or Excel file (.csv, .xls, .xlsx).',
          variant: 'destructive',
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setIsLoading(true);
      setFileName(file.name); // Set filename early for context
      clearChatHistory();

      const isCsv = file.type === validCsvType || file.name.endsWith(".csv");

      if (isCsv) {
        // For CSV files, show entity selection dialog immediately and start upload in background
        setCurrentUploadFile(file);
        setCurrentSheetName(undefined);
        setIsEntitySelectionDialogOpen(true);
        
        // Start upload in background
        uploadFileInBackground(file);
      } else { // Excel file
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const fileContent = e.target?.result;
            if (!fileContent) {
              throw new Error("File content is empty or unreadable.");
            }

            const workbook = XLSX.read(fileContent as ArrayBuffer, { type: 'array' });
            if (workbook.SheetNames.length === 0) {
                showToast({ title: 'Empty Workbook', description: 'The Excel file contains no sheets.', variant: 'destructive' });
                setIsLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }
            if (workbook.SheetNames.length === 1) {
              // Single sheet - show entity selection dialog immediately and start upload in background
              setCurrentUploadFile(file);
              setCurrentSheetName(workbook.SheetNames[0]);
              setIsEntitySelectionDialogOpen(true);
              
              // Start upload in background
              uploadFileInBackground(file, workbook.SheetNames[0]);
            } else {
              // Multiple sheets - show sheet selection dialog first
              setExcelOriginalFile(file);
              setExcelSheetNames(workbook.SheetNames);
              setIsSheetSelectionDialogOpen(true);
              // setIsLoading(false) will be handled by uploadFile or dialog close
            }
          } catch (error) {
            console.error('Error processing file:', error);
            showToast({
              title: 'Error Processing File',
              description: 'Could not process the file. Please check its format.',
              variant: 'destructive',
            });
            setData([]);
            setColumns([]);
            setFileName(null);
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }
        };

        reader.onerror = () => {
          showToast({
            title: 'File Read Error',
            description: 'Could not read the file.',
            variant: 'destructive',
          });
          setIsLoading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        };

        reader.readAsArrayBuffer(file);
      }
    } else {
         if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSheetSelection = (selectedSheet: string) => {
    if (excelOriginalFile) {
      // Show entity selection dialog and start upload in background
      setCurrentUploadFile(excelOriginalFile);
      setCurrentSheetName(selectedSheet);
      setIsEntitySelectionDialogOpen(true);
      
      // Start upload in background
      uploadFileInBackground(excelOriginalFile, selectedSheet);
    }
  };

  const handleEntitySelectionSave = (entityId: string, mappings: Record<string, string>, confidences: Record<string, { score: number; reasoning: string } | null>) => {
    // Save the entity selection and mappings to Redux
    dispatch(setSelectedEntityId(entityId));
    dispatch(setFieldMappings(mappings));
    dispatch(setFieldMappingConfidences(confidences));
    
    // Save mappings to localStorage for persistence
    const fileName = currentUploadFile?.name;
    if (fileName) {
      const storageKey = `columnMapping_${fileName}_${entityId}`;
      const confidenceStorageKey = `columnMappingConfidence_${fileName}_${entityId}`;
      localStorage.setItem(storageKey, JSON.stringify(mappings));
      localStorage.setItem(confidenceStorageKey, JSON.stringify(confidences));
    }
    
    // Close dialog
    setIsEntitySelectionDialogOpen(false);
    setCurrentUploadFile(null);
    setCurrentSheetName(undefined);
    
    showToast({
      title: "Entity and Mapping Saved",
      description: `Selected ${entityId} and saved column mappings.`,
    });
  };

  const handleEntitySelectionClose = () => {
    setIsEntitySelectionDialogOpen(false);
    setCurrentUploadFile(null);
    setCurrentSheetName(undefined);
  };

  const handleClick = () => {
    // Reset file input value before click to allow re-uploading the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
        className="hidden"
        data-ai-hint="file input"
      />
      <div className="flex gap-2 items-center">
        <Button 
          onClick={handleClick} 
          variant="outline"
          disabled={isEntityMapped} // Disable after successful mapping
        >
          <UploadCloud className="mr-2 h-4 w-4" />
          Upload File
        </Button>
        
        {canValidate && (
          <Button 
            onClick={handleValidateData} 
            variant="outline"
            disabled={isValidating}
          >
            {isValidating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : hasValidated && isDataValid ? (
              <CheckCircle className="mr-2 h-4 w-4" />
            ) : hasValidated && !isDataValid ? (
              <AlertTriangle className="mr-2 h-4 w-4" />
            ) : null}
            {isValidating
              ? "Validating..."
              : hasValidated
              ? "Re-validate Data"
              : "Validate Data"}
          </Button>
        )}
        
        <ClearAllButton />
      </div>
      <SheetSelectionDialog
        isOpen={isSheetSelectionDialogOpen}
        sheetNames={excelSheetNames}
        fileName={excelOriginalFile?.name}
        onClose={() => {
          setIsSheetSelectionDialogOpen(false);
          setExcelOriginalFile(null);
          setExcelSheetNames([]);
          setIsLoading(false); // Ensure loading is reset if dialog is cancelled
          if (fileInputRef.current) fileInputRef.current.value = ''; // Reset
        }}
        onProcessSheet={handleSheetSelection}
      />
      <EntitySelectionDialog
        isOpen={isEntitySelectionDialogOpen}
        fileName={currentUploadFile?.name}
        onClose={handleEntitySelectionClose}
        onSave={handleEntitySelectionSave}
      />
    </>
  );
}
