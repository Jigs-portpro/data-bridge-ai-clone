"use client";

import type React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { UploadCloud, CheckCircle, AlertTriangle, Loader2, Send, DownloadCloud, Save } from 'lucide-react';
import { useAppContext } from '@/hooks/useAppContext';
import { useValidation } from '@/hooks/useValidation';
import { useExport } from '@/hooks/useExport';
import { EntitySelectionDialog } from '@/components/dialogs/EntitySelectionDialog';
import { ClearAllButton } from "@/components/ClearAllButton";
import { ENTITY_NAME_STORAGE_KEY } from '@/lib/constants';
import { useDispatch, useSelector } from 'react-redux';
import { resetExportDataState, setSelectedEntityId, setFieldMappings, setFieldMappingConfidences } from '@/store/slices/exportDataSlice';
import { useEntityContext } from '@/contexts/EntityContext';
import type { RootState } from '@/store';
import { useLookupDataSources } from '../hooks/useLookupDataSources';
import { updateSessionData } from '@/utils/mongodb-helpers';

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
    data,
    columns,
    setViewData,
    setError,
    setDataTable,
    setCurrentPage,
    setTotalPages,
    setIsInitialDataLoading,
    exportConfig,
    isFetchingConfig,
    fetchExportConfig,
    getCarrierId,
    viewData, currentPage, rowsPerPage
  } = useAppContext();
  
  const dispatch = useDispatch();
  const { setDetectedEntity } = useEntityContext();
  
  // Redux state
  const { 
    selectedEntityId, 
    fieldMappings, 
    hasValidated, 
    isDataValid, 
    allPagesValidated,
    pageValidationStatus
  } = useSelector((state: RootState) => state.exportData);

  const [isEntitySelectionDialogOpen, setIsEntitySelectionDialogOpen] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validChargeProfileList, setValidChargeProfileList] = useState<any[]>([]);

  // Get lookup data sources
  const lookupDataSources = useLookupDataSources();

  // Use custom hooks
  const { handleValidateData } = useValidation(lookupDataSources, setValidChargeProfileList);
  const { isExporting, handleExportToApi, handleExportToCsv } = useExport(lookupDataSources, validChargeProfileList);

  // Check if file has been uploaded and mapped
  const isFileUploaded = data.length > 0 && columns.length > 0;
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

  const uploadFileWithEntity = async (file: File, entityId: string, mappings: Record<string, string>, sheetName?: string, carrierId?: string) => {
    try {
      const dataResponse = await fetch(`/api/data?carrier=${carrierId}&page=1&limit=500`, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      });
      if (!dataResponse.ok) {
        const errorData = await dataResponse.json();
        throw new Error(errorData.error || "Failed to fetch uploaded data.");
      }

      const dataPayload = await dataResponse.json();

      if (dataPayload.data && dataPayload.data.length > 0) {
        setData(dataPayload.data);
        setDatatableEditedCells(new Set());
        initializeDataStates(dataPayload.data, dataPayload.pagination?.total || dataPayload.data.length);
        setEntityName(entityId);
        setDetectedEntity({ entityName: entityId, confidence: 1 });
        localStorage.setItem(ENTITY_NAME_STORAGE_KEY, entityId);
        setFileName(file.name);
        setColumns(dataPayload.columns);
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
    setIsEntitySelectionDialogOpen(true);
  };

  const handleEntitySelectionSave = async (
    entityId: string, 
    mappings: Record<string, string>, 
    confidences: Record<string, { score: number; reasoning: string } | null>,
    file: File,
    sheetName?: string,
    carrierId?: string,
  ) => {
    try {
      setIsLoading(true);
      
      dispatch(setSelectedEntityId(entityId));
      dispatch(setFieldMappings(mappings));
      dispatch(setFieldMappingConfidences(confidences));
      
      const fileName = file.name;
      if (fileName) {
        const storageKey = `columnMapping_${fileName}_${entityId}`;
        const confidenceStorageKey = `columnMappingConfidence_${fileName}_${entityId}`;
        localStorage.setItem(storageKey, JSON.stringify(mappings));
        localStorage.setItem(confidenceStorageKey, JSON.stringify(confidences));
      }

      await uploadFileWithEntity(file, entityId, mappings, sheetName, carrierId);
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

  const handleValidation = useCallback(async () => {
    setIsValidating(true);
    await handleValidateData(selectedEntityId!, exportConfig);
    setIsValidating(false);
  }, [handleValidateData, selectedEntityId, exportConfig]);

  const handleSaveChanges = useCallback(async () => {
    try {
      const carrierId = getCarrierId();
      if (!carrierId) return;

      await updateSessionData(carrierId, currentPage, rowsPerPage, {data: viewData});

      showToast({
        title: "Changes Saved",
        description: "Changes have been saved successfully.",
      });
    } catch (err) {
      console.error("Error saving changes:", err);
      showToast({
        title: "Error",
        description: "An error occurred while saving changes.",
        variant: "destructive",
      });
    }
  }, [viewData, getCarrierId, showToast, currentPage, rowsPerPage]);

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
              onClick={handleValidation} 
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

        {/* save changes */}
        {
          canValidate && (
            <Button
              onClick={handleSaveChanges}
              variant={isCurrentPageValid ? "secondary" : "outline"}
              size="sm"
              disabled={isValidating}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          )
        }

        {/* Step 3: Export Options */}
        {allPagesValidated && (
          <div className="flex items-center gap-1">
            <Button 
              onClick={() => handleExportToApi(exportConfig)} 
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
              onClick={() => handleExportToCsv(exportConfig)} 
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
        onClose={() => setIsEntitySelectionDialogOpen(false)}
        onSave={handleEntitySelectionSave}
      />
    </>
  );
}
