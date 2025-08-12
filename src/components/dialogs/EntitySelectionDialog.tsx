"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, DatabaseZap, Sparkles, Upload, ArrowRight, ArrowLeft, CheckCircle, X } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAppContext } from '@/hooks/useAppContext';
import type { ExportConfig, ExportEntity } from '@/config/exportEntities';
import {
  autoColumnMapping,
  type AutoColumnMappingClientInput,
} from "@/ai/flows/auto-column-mapping";
import * as XLSX from 'xlsx';
import { NullHeaderWarningDialog } from '@/components/dialogs/NullHeaderWarningDialog';

const NOT_MAPPED_VALUE = "__NOT_MAPPED__";

interface EntitySelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entityId: string, mappings: Record<string, string>, confidences: Record<string, { score: number; reasoning: string } | null>, file: File, sheetName?: string, carrierId?: string) => void;
  fileName?: string;
}

export function EntitySelectionDialog({
  isOpen,
  onClose,
  onSave,
  fileName
}: EntitySelectionDialogProps) {
  const { 
    columns: appColumns, 
    isLoading, 
    showToast,
    selectedAiProvider,
    selectedAiModelName,
    setIsLoading: setAppContextIsLoading,
    setColumns,
    setFileName,
    getCarrierId,
  } = useAppContext();
  
  const carrierId = getCarrierId() || "";

  // Step management
  const [currentStep, setCurrentStep] = useState<'entity' | 'file' | 'mapping'>('entity');
  
  // Entity selection
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const [previousEntityId, setPreviousEntityId] = useState<string>("");
  const [exportConfig, setExportConfig] = useState<ExportConfig | null>(null);
  const [isFetchingConfig, setIsFetchingConfig] = useState(false);
  
  // File selection
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSheetName, setSelectedSheetName] = useState<string | undefined>(undefined);
  const [excelSheetNames, setExcelSheetNames] = useState<string[]>([]);
  const [isSheetSelectionOpen, setIsSheetSelectionOpen] = useState(false);
  const [fileColumns, setFileColumns] = useState<string[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Column mapping
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [fieldMappingConfidences, setFieldMappingConfidences] = useState<Record<string, { score: number; reasoning: string } | null>>({});
  const [isAutoMapping, setIsAutoMapping] = useState(false);

  // Null header warning state
  const [showNullHeaderWarning, setShowNullHeaderWarning] = useState(false);
  const [nullHeaders, setNullHeaders] = useState<string[]>([]);
  const [pendingColumns, setPendingColumns] = useState<string[]>([]);
  const [pendingFileName, setPendingFileName] = useState<string>("");

  // Function to detect null headers
  const detectNullHeaders = (columns: string[]) => {
    const nullHeaderIndices: string[] = [];
    columns.forEach((col, index) => {
      if (!col || col.trim() === '') {
        nullHeaderIndices.push(`Column ${index + 1}`);
      }
    });
    return nullHeaderIndices;
  };

  // Function to handle null header warning
  const handleNullHeaderWarning = (columns: string[], fileName: string) => {
    const detectedNullHeaders = detectNullHeaders(columns);
    if (detectedNullHeaders.length > 0) {
      setNullHeaders(detectedNullHeaders);
      setPendingColumns(columns);
      setPendingFileName(fileName);
      setShowNullHeaderWarning(true);
      return true; // Return true if null headers were detected
    }
    return false; // Return false if no null headers
  };

  // Reset dialog when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('entity');
      setSelectedEntityId("");
      setPreviousEntityId("");
      setSelectedFile(null);
      setSelectedSheetName(undefined);
      setExcelSheetNames([]);
      setFileColumns([]);
      setFieldMappings({});
      setFieldMappingConfidences({});
      setShowNullHeaderWarning(false);
      setNullHeaders([]);
      setPendingColumns([]);
      setPendingFileName("");
      if (!exportConfig) {
        fetchExportConfig();
      }
      

    }
  }, [isOpen, selectedAiProvider, selectedAiModelName]);

  // Handle entity changes - clear file data if entity changes
  useEffect(() => {
    if (selectedEntityId && selectedEntityId !== previousEntityId && previousEntityId !== "") {
      // Entity changed, clear file data
      setSelectedFile(null);
      setSelectedSheetName(undefined);
      setExcelSheetNames([]);
      setFileColumns([]);
      setFieldMappings({});
      setFieldMappingConfidences({});
      // Go back to file selection step
      setCurrentStep('file');
    }
    setPreviousEntityId(selectedEntityId);
  }, [selectedEntityId, previousEntityId]);

  // Initialize field mappings when entity is selected and we have columns
  useEffect(() => {
    if (selectedEntityId && exportConfig?.entities.length && fileColumns.length > 0) {
      const entityConfig = exportConfig.entities.find(
        (e: any) => e.id === selectedEntityId
      );
      
      if (entityConfig) {
        const initialMappings: Record<string, string> = {};
        entityConfig.fields.forEach((targetField: any) => {
          // Try to find matching column by normalized name
          const targetFieldNameNormalized = targetField.name
            .toLowerCase()
            .replace(/[\s_]+/g, "");
          const matchingSourceColumn = fileColumns.find(
            (sc) =>
              sc && sc.toLowerCase().replace(/[\s_]+/g, "") ===
              targetFieldNameNormalized
          );
          initialMappings[targetField.name] = matchingSourceColumn || "";
        });
        setFieldMappings(initialMappings);
        
        // Reset confidences when entity changes
        setFieldMappingConfidences({});
      }
    }
  }, [selectedEntityId, exportConfig, fileColumns]);

  const fetchExportConfig = async () => {
    setIsFetchingConfig(true);
    try {
      const response = await fetch("/api/export-entities");
      if (!response.ok) {
        throw new Error("Failed to fetch entities configuration");
      }
      const config: ExportConfig = await response.json();
      setExportConfig(config);
    } catch (error) {
      console.error("Error fetching entities config:", error);
      setExportConfig({ baseUrl: "", entities: [] });
    } finally {
      setIsFetchingConfig(false);
    }
  };

  const handleEntityNext = () => {
    if (selectedEntityId) {
      setCurrentStep('file');
    }
  };

  const handleFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const validCsvType = 'text/csv';
    const validXlsType = 'application/vnd.ms-excel';
    const validXlsxType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    if (![validCsvType, validXlsType, validXlsxType].includes(file.type) && 
        !file.name.endsWith('.csv') && !file.name.endsWith('.xls') && !file.name.endsWith('.xlsx')) {
      showToast({
        title: 'Invalid File Type',
        description: 'Please upload a CSV or Excel file (.csv, .xls, .xlsx).',
        variant: 'destructive',
      });
      return;
    }

    const filename = file.name;

    setIsProcessingFile(true);
    setSelectedFile(file);

    const isCsv = file.type === validCsvType || file.name.endsWith(".csv");

    if (isCsv) {
      // For CSV files, process directly
      await processFile(file, filename, carrierId);
    } else {
      // For Excel files, handle sheet selection
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const fileContent = e.target?.result;
            if (!fileContent) {
              throw new Error("File content is empty or unreadable.");
            }

            const workbook = XLSX.read(fileContent as ArrayBuffer, { type: 'array' });
            if (workbook.SheetNames.length === 0) {
              showToast({ 
                title: 'Empty Workbook', 
                description: 'The Excel file contains no sheets.', 
                variant: 'destructive' 
              });
              setIsProcessingFile(false);
              return;
            }

            setExcelSheetNames(workbook.SheetNames);
            if (workbook.SheetNames.length === 1) {
              // Single sheet - process directly
              setSelectedSheetName(workbook.SheetNames[0]);
              await processFile(file, workbook.SheetNames[0]);
            } else {
              // Multiple sheets - show sheet selection
              setIsSheetSelectionOpen(true);
              setIsProcessingFile(false);
            }
          } catch (error) {
            console.error('Error processing file:', error);
            showToast({
              title: 'Error Processing File',
              description: 'Could not process the file. Please check its format.',
              variant: 'destructive',
            });
            setIsProcessingFile(false);
          }
        };

        reader.onerror = () => {
          showToast({
            title: 'File Read Error',
            description: 'Could not read the file.',
            variant: 'destructive',
          });
          setIsProcessingFile(false);
        };

        reader.readAsArrayBuffer(file);
      } catch (error) {
        console.error('Error processing Excel file:', error);
        showToast({
          title: 'Error Processing File',
          description: 'Could not process the Excel file. Please check its format.',
          variant: 'destructive',
        });
        setIsProcessingFile(false);
      }
    }
  };

  const processFile = async (file: File, sheetName?: string, carrierId?: string) => {
    if (!selectedEntityId) {
      showToast({
        title: "Error",
        description: "Please select an entity first.",
        variant: "destructive",
      });
      return;
    }

    if (!carrierId) {
      showToast({
        title: "Error",
        description: "Carrier ID is required.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("entityName", selectedEntityId);
    formData.append("carrierId", carrierId);
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
      const { columns, fileName } = result;

      // Check for null headers before proceeding to mapping
      if (columns && columns.length > 0) {
        // Check if there are any null or empty headers
        const hasNullHeaders = handleNullHeaderWarning(columns, fileName);
        if (hasNullHeaders) {
          // Don't proceed to mapping until user decides
          setIsProcessingFile(false);
          return;
        }
      }

      // Set file columns for mapping
      setFileColumns(columns);
      setColumns(columns);
      setFileName(fileName);

      // Move to mapping step
      setCurrentStep('mapping');
      setIsProcessingFile(false);

    } catch (error: any) {
      console.error("Error during file processing:", error);
      showToast({
        title: "File Processing Error",
        description: error.message || "An unknown error occurred.",
        variant: "destructive",
      });
      setIsProcessingFile(false);
    }
  };

  const handleSheetSelection = (sheetName: string) => {
    setSelectedSheetName(sheetName);
    setIsSheetSelectionOpen(false);
    setIsProcessingFile(true);
    if (selectedFile) {
      processFile(selectedFile, sheetName);
    }
  };

  const handleMappingChange = (targetFieldName: string, sourceColumnName: string) => {
    setFieldMappings(prev => ({
      ...prev,
      [targetFieldName]: sourceColumnName === NOT_MAPPED_VALUE ? "" : sourceColumnName,
    }));
    
    // Clear confidence when manually changed
    setFieldMappingConfidences(prev => ({
      ...prev,
      [targetFieldName]: null,
    }));
  };

  // Utility to normalize column/field names for matching
  function normalizeName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/gi, ""); // Remove all non-alphanumeric chars
  }

  const handleAutoMapColumns = async () => {
    return handleAutoMapColumnsWithColumns(fileColumns);
  };

  const handleAutoMapColumnsWithColumns = async (columns: string[]) => {
    
    const selectedEntityConfig = exportConfig?.entities.find(
      (e: any) => e.id === selectedEntityId
    );
    
    if (!selectedEntityConfig || !columns.length) {
      showToast({
        title: "Cannot Auto-map",
        description: "Please select an entity and ensure data columns are loaded.",
        variant: "destructive",
      });
      setIsAutoMapping(false);
      setAppContextIsLoading(false);
      return;
    }
    
    if (!selectedAiProvider || !selectedAiModelName) {
      showToast({
        title: "AI Not Configured",
        description: "Please select an AI provider and model in AI Settings. Current settings: " + 
          (selectedAiProvider ? `Provider: ${selectedAiProvider}` : "No provider") + 
          (selectedAiModelName ? `, Model: ${selectedAiModelName}` : ", No model"),
        variant: "destructive",
      });
      setIsAutoMapping(false);
      setAppContextIsLoading(false);
      return;
    }
    
    setIsAutoMapping(true);
    setAppContextIsLoading(true);
    
    try {
      const normalizedSourceColumns = columns.map((col) => ({
        original: col,
        normalized: normalizeName(col),
      }));
      const normalizedTargetFields = selectedEntityConfig.fields.map(
        (f: any) => ({
          name: f.name,
          normalized: normalizeName(f.name),
          type: f.type || "string",
        })
      );

      // 1. Direct mapping for normalized matches
      const directMappings: Record<string, string> = {};
      const mappedSourceCols = new Set<string>();
      normalizedTargetFields.forEach((target: any) => {
        const match = normalizedSourceColumns.find(
          (src) => src.normalized === target.normalized
        );
        if (match) {
          directMappings[target.name] = match.original;
          mappedSourceCols.add(match.original);
        }
      });

      const unmappedTargetFields = normalizedTargetFields.filter(
        (tf: any) => !directMappings[tf.name]
      );
      const aiTargetFields = unmappedTargetFields.map((f: any) => ({
        name: f.name,
        type: f.type,
      }));
      const aiSourceColumns = columns.filter(
        (col) => !mappedSourceCols.has(col)
      );

      let aiMappings: Record<string, string> = {};
      let aiConfidences: Record<
        string,
        { score: number; reasoning: string } | null
      > = {};
      
      if (aiTargetFields.length > 0 && aiSourceColumns.length > 0) {
        try {
        const input: AutoColumnMappingClientInput = {
          sourceColumnNames: aiSourceColumns,
          targetFields: aiTargetFields,
          aiProvider: selectedAiProvider,
          aiModelName: selectedAiModelName,
        };
        const result = await autoColumnMapping(input);
        result.mappings.forEach((suggestion) => {
          if (suggestion.suggestedSourceColumn) {
            aiMappings[suggestion.targetFieldName] =
              suggestion.suggestedSourceColumn;
            aiConfidences[suggestion.targetFieldName] = {
              score: suggestion.confidenceScore,
              reasoning: suggestion.reasoning,
            };
          } else {
            aiMappings[suggestion.targetFieldName] = "";
            aiConfidences[suggestion.targetFieldName] = null;
          }
        });
        } catch (error: any) {
          console.error("Auto-mapping error:", error);
          showToast({
            title: "Auto-map Error",
            description: error.message || "Could not generate AI column mappings. Please try again.",
            variant: "destructive",
          });
          setIsAutoMapping(false);
          setAppContextIsLoading(false);
          return;
        }
      }

      const newMappings: Record<string, string> = { ...directMappings };
      const newConfidences: Record<
        string,
        { score: number; reasoning: string } | null
      > = {};
      
      selectedEntityConfig.fields.forEach((f: any) => {
        if (directMappings[f.name]) {
          newMappings[f.name] = directMappings[f.name];
          newConfidences[f.name] = {
            score: 100,
            reasoning: "Direct normalized name match (ignoring case and special characters).",
          };
        } else if (aiMappings[f.name] !== undefined) {
          newMappings[f.name] = aiMappings[f.name];
          newConfidences[f.name] = aiConfidences[f.name];
        } else {
          newMappings[f.name] = "";
          newConfidences[f.name] = null;
        }
      });

      setFieldMappings(newMappings);
      setFieldMappingConfidences(newConfidences);
      
      showToast({
        title: "Auto-mapping Complete",
        description: "Review the AI-suggested mappings.",
      });
    } catch (error: any) {
      console.error("Error auto-mapping columns:", error);
      let desc = "Could not generate AI column mappings. Please try again.";
      const errorMessage = String(error?.message || error).toLowerCase();
      if (
        errorMessage.includes("api key") ||
        errorMessage.includes("authentication")
      ) {
        desc = "Authentication failed with the AI provider. Check your API key.";
      } else if (errorMessage.includes("model not found")) {
        desc = `The AI model ('${selectedAiProvider}/${selectedAiModelName}') was not found. Check AI Settings and key permissions.`;
      } else if (
        errorMessage.includes("503") ||
        errorMessage.includes("unavailable") ||
        errorMessage.includes("overloaded")
      ) {
        desc = "AI service for auto-mapping is currently overloaded or unavailable. Please try again later.";
      }
      showToast({
        title: "Auto-map Error",
        description: desc,
        variant: "destructive",
        duration: 9000,
      });
    } finally {
      setIsAutoMapping(false);
      setAppContextIsLoading(false);
    }
  };

  const handleSave = () => {
    const carrierId = getCarrierId();
    if (selectedEntityId && selectedFile) {
      onSave(selectedEntityId, fieldMappings, fieldMappingConfidences, selectedFile, selectedSheetName, carrierId || undefined);
      handleClose();
    }
  };

  const handleClose = () => {
    setCurrentStep('entity');
    setSelectedEntityId("");
    setSelectedFile(null);
    setSelectedSheetName(undefined);
    setExcelSheetNames([]);
    setFileColumns([]);
    setFieldMappings({});
    setFieldMappingConfidences({});
    onClose();
  };

  const handleBack = () => {
    if (currentStep === 'mapping') {
      setCurrentStep('file');
    } else if (currentStep === 'file') {
      setCurrentStep('entity');
    }
  };

  // Handle null header warning actions
  const handleNullHeaderContinue = async (updatedColumns: string[]) => {
    setShowNullHeaderWarning(false);
    
    // Set the updated columns and proceed to mapping
    setFileColumns(updatedColumns);
    setColumns(updatedColumns);
    setCurrentStep('mapping');
    
    // Save the updated column names to the server so they persist across page refreshes
    try {
      const carrierId = getCarrierId();
      if (carrierId) {
        const response = await fetch(`/api/update-columns?carrier=${carrierId}&columns=${encodeURIComponent(JSON.stringify(updatedColumns))}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          console.error('Failed to save column names to server');
        } else {
          const result = await response.json();
        }
      }
    } catch (error) {
      console.error('Error saving column names:', error);
    }
    
    // Trigger auto-mapping with the new column names after state updates
    setTimeout(() => {
      // Pass the updated columns directly to avoid state timing issues
      handleAutoMapColumnsWithColumns(updatedColumns);
    }, 200);
    
    showToast({
      title: "Headers Updated",
      description: "Column headers have been updated successfully. Auto-mapping in progress...",
      variant: "default",
    });
  };

  const handleNullHeaderReupload = () => {
    setShowNullHeaderWarning(false);
    // Reset to file selection step
    setCurrentStep('file');
    setSelectedFile(null);
    setSelectedSheetName(undefined);
    setFileColumns([]);
    setColumns([]);
    setFileName("");
    setFieldMappings({});
    setFieldMappingConfidences({});
    showToast({
      title: "Ready for Re-upload",
      description: "Please upload a new file with proper headers.",
      variant: "default",
    });
  };

  const handleNullHeaderClose = () => {
    setShowNullHeaderWarning(false);
    // Reset to file selection step
    setCurrentStep('file');
    setSelectedFile(null);
    setSelectedSheetName(undefined);
    setFileColumns([]);
    setColumns([]);
    setFileName("");
    setFieldMappings({});
    setFieldMappingConfidences({});
  };

  const selectedEntityConfig = exportConfig?.entities.find(
    (e: any) => e.id === selectedEntityId
  );
  const noEntitiesConfigured = !exportConfig || exportConfig.entities.length === 0;
  const canProceedFromEntity = selectedEntityId && !isFetchingConfig;
  const canProceedFromFile = selectedFile && fileColumns.length > 0;
  const canSave = selectedEntityId && selectedFile && fileColumns.length > 0;
  const isDialogLoading = isFetchingConfig || isAutoMapping || isProcessingFile;

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
        className="hidden"
      />
      
      <Dialog open={isOpen} onOpenChange={() => {}} modal={true}>
        <DialogContent 
          className="max-w-4xl max-h-[90vh] flex flex-col [&>button]:hidden"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <DialogTitle>
                  Upload File Workflow
                </DialogTitle>
                <DialogDescription>
                  Follow these steps to upload and map your data:
                </DialogDescription>
                  <div className="flex items-center mt-2 space-x-2 text-sm">
                    <div className={`flex items-center ${currentStep === 'entity' ? 'text-primary font-medium' : currentStep === 'file' || currentStep === 'mapping' ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {currentStep === 'file' || currentStep === 'mapping' ? <CheckCircle className="h-4 w-4 mr-1" /> : <span className="w-4 h-4 rounded-full border-2 border-current mr-1 flex items-center justify-center text-xs">1</span>}
                      Select Entity
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className={`flex items-center ${currentStep === 'file' ? 'text-primary font-medium' : currentStep === 'mapping' ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {currentStep === 'mapping' ? <CheckCircle className="h-4 w-4 mr-1" /> : <span className="w-4 h-4 rounded-full border-2 border-current mr-1 flex items-center justify-center text-xs">2</span>}
                      Select File
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className={`flex items-center ${currentStep === 'mapping' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                      <span className="w-4 h-4 rounded-full border-2 border-current mr-1 flex items-center justify-center text-xs">3</span>
                      Map Columns
                    </div>
                  </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Step 1: Entity Selection */}
            {currentStep === 'entity' && (
              <div className="flex-shrink-0 space-y-4">
                <div>
                  <Label htmlFor="entity-select" className="text-sm font-medium">
                    Select Target API Entity
                  </Label>
                  <div className="mt-1">
                    {isFetchingConfig ? (
                      <div className="flex items-center gap-2 py-2">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">
                          Loading entities...
                        </span>
                      </div>
                    ) : (
                      <Select
                        value={selectedEntityId || undefined}
                        onValueChange={setSelectedEntityId}
                        disabled={isFetchingConfig || noEntitiesConfigured}
                      >
                        <SelectTrigger id="entity-select">
                          <SelectValue
                            placeholder={
                              noEntitiesConfigured
                                ? "No entities configured"
                                : "Select an entity"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {noEntitiesConfigured && (
                            <SelectItem value="no-config" disabled>
                              No entities configured in Setup
                            </SelectItem>
                          )}
                          {exportConfig?.entities
                            .filter((entity: any) => !entity._comment) // Filter out commented entities
                            .map((entity: any) => (
                            <SelectItem key={entity.id} value={entity.id}>
                              {entity.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
                
                {selectedEntityConfig && (
                  <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                    <strong>Entity Details:</strong> {selectedEntityConfig.name}
                    <br />
                    <strong>Fields:</strong> {selectedEntityConfig.fields.length} fields to map
                  </div>
                )}
              </div>
            )}

            {/* Step 2: File Selection */}
            {currentStep === 'file' && (
              <div className="flex-shrink-0 space-y-4">
                <div>
                  <Label className="text-sm font-medium">
                    Select File to Upload
                  </Label>
                  <div className="mt-1">
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                      {isProcessingFile ? (
                        <div className="space-y-4">
                          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Processing File...</p>
                            <p className="text-xs text-muted-foreground">
                              {selectedFile?.name}
                            </p>
                            <div className="flex items-center justify-center space-x-2">
                              <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                          </div>
                        </div>
                      ) : selectedFile ? (
                        <div className="space-y-2">
                          <CheckCircle className="h-8 w-8 text-green-600 mx-auto" />
                          <p className="text-sm font-medium">{selectedFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          {selectedSheetName && (
                            <p className="text-xs text-muted-foreground">
                              Sheet: {selectedSheetName}
                            </p>
                          )}
                          <Button
                            onClick={handleFileSelect}
                            variant="outline"
                            size="sm"
                            disabled={isProcessingFile}
                          >
                            Choose Different File
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
                          <p className="text-sm font-medium">Click to select a file</p>
                          <p className="text-xs text-muted-foreground">
                            Supports CSV and Excel files (.csv, .xls, .xlsx)
                          </p>
                          <Button
                            onClick={handleFileSelect}
                            variant="outline"
                            disabled={isProcessingFile}
                          >
                            Select File
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isProcessingFile}
                  />
                </div>
                
                {selectedEntityConfig && !isProcessingFile && (
                  <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                    <strong>Selected Entity:</strong> {selectedEntityConfig.name}
                    <br />
                    File will be mapped to this entity's {selectedEntityConfig.fields.length} fields.
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Column Mapping */}
            {currentStep === 'mapping' && selectedEntityConfig && (
              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <div className="flex-shrink-0 mb-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-md font-semibold">
                      Map Columns for "{selectedEntityConfig.name}"
                    </h4>
                    <Button
                      onClick={handleAutoMapColumns}
                      disabled={
                        isDialogLoading ||
                        !selectedEntityConfig ||
                        fileColumns.length === 0 ||
                        !selectedAiProvider ||
                        !selectedAiModelName
                      }
                      variant="outline"
                      size="sm"
                    >
                      {isAutoMapping ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                      )}
                      Auto-map (AI)
                    </Button>
                  </div>
                  
                  <div className="text-sm text-muted-foreground bg-muted p-3 rounded mt-2">
                    <strong>File:</strong> {selectedFile?.name}
                    {selectedSheetName && <span> (Sheet: {selectedSheetName})</span>}
                    <br />
                    <strong>Columns found:</strong> {fileColumns.length} columns
                  </div>
                </div>
                
                <div className="flex-1 border rounded-md p-4 min-h-0 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 350px)' }}>
                  <div className="space-y-3">
                    <TooltipProvider>
                      {selectedEntityConfig.fields.map((targetField: any) => {
                        const confidence = fieldMappingConfidences[targetField.name];
                        let confidenceColorClass = "bg-muted";
                        let confidenceTooltip = "No AI mapping or manually changed.";
                        
                        if (confidence) {
                          if (confidence.score > 90)
                            confidenceColorClass = "bg-green-500";
                          else if (confidence.score > 70)
                            confidenceColorClass = "bg-yellow-500";
                          else confidenceColorClass = "bg-red-500";
                          confidenceTooltip = `AI Confidence: ${confidence.score}%. Reasoning: ${confidence.reasoning}`;
                        }

                        return (
                          <div
                            key={targetField.name}
                            className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 items-center"
                          >
                            <div className="flex items-center gap-2 md:justify-end">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    className={`h-3 w-3 rounded-full inline-block flex-shrink-0 ${confidenceColorClass}`}
                                  />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{confidenceTooltip}</p>
                                </TooltipContent>
                              </Tooltip>
                              <Label
                                htmlFor={`map-${targetField.name}`}
                                className="text-sm truncate"
                                title={`${targetField.name} (${
                                  targetField.type || "any"
                                })`}
                              >
                                {targetField.name}
                                {targetField.required ? (
                                  <span className="text-destructive ml-1">*</span>
                                ) : (
                                  ""
                                )}
                                <span className="text-xs text-muted-foreground ml-1">
                                  ({targetField.type || "any"})
                                </span>
                                {targetField.lookupValidation && (
                                  <DatabaseZap className="inline-block ml-1 h-3 w-3 text-blue-500" />
                                )}
                              </Label>
                            </div>
                            <Select
                              value={
                                fieldMappings[targetField.name] || NOT_MAPPED_VALUE
                              }
                              onValueChange={(sourceCol) =>
                                handleMappingChange(targetField.name, sourceCol)
                              }
                            >
                              <SelectTrigger
                                id={`map-${targetField.name}`}
                                className="text-sm h-9"
                              >
                                <SelectValue placeholder="Select source column" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={NOT_MAPPED_VALUE}>
                                  -- Not Mapped --
                                </SelectItem>
                                {fileColumns.map((col) => (
                                  <SelectItem key={col} value={col}>
                                    {col}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })}
                    </TooltipProvider>
                  </div>
                </div>
                
                <div className="flex-shrink-0 mt-2">
                  <p className="text-xs text-muted-foreground">
                    <span className="text-destructive">*</span> Target API field
                    is required and must be mapped.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <div className="flex w-full justify-between">
              <div>
                {currentStep !== 'entity' && (
                  <Button 
                    onClick={handleBack} 
                    variant="outline"
                    disabled={isDialogLoading}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                )}
              </div>
              
              <div>
                {currentStep === 'entity' && (
                  <Button 
                    onClick={handleEntityNext} 
                    disabled={!canProceedFromEntity || isDialogLoading}
                  >
                    Next: Select File
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
                
                {currentStep === 'file' && (
                  <Button 
                    onClick={() => setCurrentStep('mapping')} 
                    disabled={!canProceedFromFile || isDialogLoading}
                  >
                    {isProcessingFile ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Next: Map Columns
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}
                
                {currentStep === 'mapping' && (
                  <Button 
                    onClick={handleSave} 
                    disabled={!canSave || isDialogLoading}
                  >
                    {isDialogLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Complete Upload
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sheet Selection Dialog for Excel files with multiple sheets */}
      {isSheetSelectionOpen && (
        <Dialog open={isSheetSelectionOpen} onOpenChange={setIsSheetSelectionOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Select Sheet</DialogTitle>
              <DialogDescription>
                The Excel file contains multiple sheets. Please choose one to process.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="sheet-select">Sheet Name</Label>
                <Select 
                  value={selectedSheetName || excelSheetNames[0]} 
                  onValueChange={setSelectedSheetName}
                >
                  <SelectTrigger id="sheet-select">
                    <SelectValue placeholder="Select a sheet" />
                  </SelectTrigger>
                  <SelectContent>
                    {excelSheetNames.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={() => handleSheetSelection(selectedSheetName || excelSheetNames[0])}
                disabled={!selectedSheetName && !excelSheetNames[0]}
              >
                Process Sheet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Null Header Warning Dialog */}
      <NullHeaderWarningDialog
        isOpen={showNullHeaderWarning}
        onClose={handleNullHeaderClose}
        onContinue={handleNullHeaderContinue}
        onReupload={handleNullHeaderReupload}
        nullHeaders={nullHeaders}
        fileName={pendingFileName}
        originalColumns={pendingColumns}
      />
    </>
  );
} 