"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppContext } from '@/hooks/useAppContext';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '@/store';
import { setFieldMappings, setFieldMappingConfidences, setHasValidated, setIsDataValid, setValidationMessages } from '@/store/slices/exportDataSlice';
import { MapPin, CheckCircle, AlertTriangle, Sparkles, DatabaseZap, Loader2 } from 'lucide-react';
import { autoColumnMapping, type AutoColumnMappingClientInput } from '@/ai/flows/auto-column-mapping';
import { useSession } from 'next-auth/react';

const NOT_MAPPED_VALUE = "__NOT_MAPPED_PLACEHOLDER__";

export function ColumnMapperIcon() {
  const { data: session } = useSession();
  const {
    data: appData,
    columns: appColumns,
    fileName: originalFileName,
    exportConfig,
    isFetchingConfig,
    selectedAiProvider,
    selectedAiModelName,
    showToast,
    setIsLoading: setAppContextIsLoading,
  } = useAppContext();

  const dispatch = useDispatch();
  const {
    selectedEntityId,
    fieldMappings,
    fieldMappingConfidences,
  } = useSelector((state: RootState) => state.exportData);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAutoMapping, setIsAutoMapping] = useState(false);

  // Check if file is uploaded and entity is selected
  const isFileUploaded = appData && appData.length > 0 && appColumns && appColumns.length > 0;
  const isEntitySelected = Boolean(selectedEntityId);
  const canMap = isFileUploaded && isEntitySelected;

  // Check mapping status
  const getMappingStatus = () => {
    if (!canMap || !exportConfig) return 'none';
    
    const selectedEntity = exportConfig.entities.find((e: any) => e.id === selectedEntityId);
    if (!selectedEntity) return 'none';

    const requiredFields = selectedEntity.fields.filter((f: any) => f.required);
    const mappedRequiredFields = requiredFields.filter((f: any) => 
      fieldMappings[f.name] && fieldMappings[f.name].trim() !== ''
    );

    if (mappedRequiredFields.length === 0) return 'none';
    if (mappedRequiredFields.length === requiredFields.length) return 'complete';
    return 'partial';
  };

  const mappingStatus = getMappingStatus();

  // Get entity name for display
  const getEntityName = () => {
    if (!exportConfig || !selectedEntityId) return '';
    const selectedEntity = exportConfig.entities.find((e: any) => e.id === selectedEntityId);
    return selectedEntity?.name || selectedEntityId;
  };

  // Utility to normalize column/field names for matching
  function normalizeName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/gi, "");
  }

  const handleMappingChange = (targetFieldName: string, sourceColumnName: string) => {
    dispatch(setFieldMappings({
      ...fieldMappings,
      [targetFieldName]: sourceColumnName === NOT_MAPPED_VALUE ? "" : sourceColumnName,
    }));
    dispatch(setFieldMappingConfidences({
      ...fieldMappingConfidences,
      [targetFieldName]: null,
    }));
    dispatch(setHasValidated(false));
    dispatch(setIsDataValid(false));
    dispatch(setValidationMessages([]));
  };

  const handleAutoMapColumns = async () => {
    if (!selectedEntityId || !exportConfig || !appColumns.length) {
      showToast({
        title: "Cannot Auto-map",
        description: "Please select an entity and ensure data columns are loaded.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedAiProvider || !selectedAiModelName) {
      showToast({
        title: "AI Not Configured",
        description: "Please select an AI provider and model in AI Settings.",
        variant: "destructive",
      });
      return;
    }

    setIsAutoMapping(true);
    setAppContextIsLoading(true);

    try {
      const selectedEntity = exportConfig.entities.find((e: any) => e.id === selectedEntityId);
      if (!selectedEntity) return;

      // Hybrid Preprocessing + AI
      const normalizedSourceColumns = appColumns.map((col) => ({
        original: col,
        normalized: normalizeName(col),
      }));
      const normalizedTargetFields = selectedEntity.fields.map((f: any) => ({
        name: f.name,
        normalized: normalizeName(f.name),
        type: f.type || "string",
      }));

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

      // 2. Prepare fields for AI (not directly mapped)
      const unmappedTargetFields = normalizedTargetFields.filter(
        (tf: any) => !directMappings[tf.name]
      );
      const aiTargetFields = unmappedTargetFields.map((f: any) => ({
        name: f.name,
        type: f.type,
      }));
      const aiSourceColumns = appColumns.filter(
        (col) => !mappedSourceCols.has(col)
      );

      let aiMappings: Record<string, string> = {};
      let aiConfidences: Record<string, { score: number; reasoning: string } | null> = {};
      
      if (aiTargetFields.length > 0 && aiSourceColumns.length > 0) {
        const input: AutoColumnMappingClientInput = {
          sourceColumnNames: aiSourceColumns,
          targetFields: aiTargetFields,
          aiProvider: selectedAiProvider,
          aiModelName: selectedAiModelName,
        };
        const result = await autoColumnMapping(input);
        result.mappings.forEach((suggestion) => {
          if (suggestion.suggestedSourceColumn) {
            aiMappings[suggestion.targetFieldName] = suggestion.suggestedSourceColumn;
            aiConfidences[suggestion.targetFieldName] = {
              score: suggestion.confidenceScore,
              reasoning: suggestion.reasoning,
            };
          } else {
            aiMappings[suggestion.targetFieldName] = "";
            aiConfidences[suggestion.targetFieldName] = null;
          }
        });
      }

      // 3. Merge direct and AI mappings
      const newMappings: Record<string, string> = { ...directMappings };
      const newConfidences: Record<string, { score: number; reasoning: string } | null> = {};
      
      selectedEntity.fields.forEach((f: any) => {
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

      dispatch(setFieldMappings(newMappings));
      dispatch(setFieldMappingConfidences(newConfidences));
      dispatch(setHasValidated(false));
      dispatch(setIsDataValid(false));
      dispatch(setValidationMessages([]));

      showToast({
        title: "Auto-mapping Complete",
        description: "Review the AI-suggested mappings.",
        variant: "success",
      });
    } catch (error: any) {
      console.error("Error auto-mapping columns:", error);
      let desc = "Could not generate AI column mappings. Please try again.";
      const errorMessage = String(error?.message || error).toLowerCase();
      if (errorMessage.includes("api key") || errorMessage.includes("authentication")) {
        desc = "Authentication failed with the AI provider. Check your API key.";
      } else if (errorMessage.includes("model not found")) {
        desc = `The AI model ('${selectedAiProvider}/${selectedAiModelName}') was not found. Check AI Settings and key permissions.`;
      } else if (errorMessage.includes("503") || errorMessage.includes("unavailable") || errorMessage.includes("overloaded")) {
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

  // Persist column mapping in localStorage
  useEffect(() => {
    if (originalFileName && selectedEntityId && Object.keys(fieldMappings).length > 0) {
      const key = `columnMapping_${originalFileName}_${selectedEntityId}`;
      localStorage.setItem(key, JSON.stringify(fieldMappings));
    }
  }, [fieldMappings, originalFileName, selectedEntityId]);

  // Persist column mapping confidences in localStorage
  useEffect(() => {
    if (originalFileName && selectedEntityId && Object.keys(fieldMappingConfidences).length > 0) {
      const key = `columnMappingConfidence_${originalFileName}_${selectedEntityId}`;
      localStorage.setItem(key, JSON.stringify(fieldMappingConfidences));
    }
  }, [fieldMappingConfidences, originalFileName, selectedEntityId]);

  const selectedEntityConfig = exportConfig?.entities.find((e: any) => e.id === selectedEntityId);

  const getIconColor = () => {
    switch (mappingStatus) {
      case 'complete':
        return 'text-green-600';
      case 'partial':
        return 'text-yellow-600';
      case 'none':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const getTooltipText = () => {
    if (!canMap) return 'Upload a file and select an entity to map columns';
    
    switch (mappingStatus) {
      case 'complete':
        return 'All required columns are mapped';
      case 'partial':
        return 'Some required columns are mapped';
      case 'none':
        return 'No required columns are mapped';
      default:
        return 'Map columns for data export';
    }
  };

  if (!canMap) {
    return null; // Don't show the icon if no file is uploaded or no entity is selected
  }

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => setIsDialogOpen(true)}
              variant="ghost"
              size="icon"
              className="relative"
              disabled={!canMap}
            >
              <MapPin className={`h-5 w-5 ${getIconColor()}`} />
              {mappingStatus === 'complete' && (
                <CheckCircle className="absolute -top-1 -right-1 h-3 w-3 text-green-600" />
              )}
              {mappingStatus === 'partial' && (
                <AlertTriangle className="absolute -top-1 -right-1 h-3 w-3 text-yellow-600" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{getTooltipText()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Map Columns for "{getEntityName()}"</DialogTitle>
            <DialogDescription>
              Map your data columns to the target entity fields. Required fields are marked with an asterisk (*).
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {isFetchingConfig ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading entity configuration...</span>
              </div>
            ) : selectedEntityConfig ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium">Column Mapping</h4>
                  <Button
                    onClick={handleAutoMapColumns}
                    disabled={isAutoMapping || !selectedAiProvider || !selectedAiModelName}
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

                <ScrollArea className="h-64 border rounded-md p-4">
                  <div className="space-y-3">
                    <TooltipProvider>
                      {selectedEntityConfig.fields.map((targetField: any) => {
                        const confidence = fieldMappingConfidences[targetField.name];
                        let confidenceColorClass = "bg-muted";
                        let confidenceTooltip = "No AI mapping or manually changed.";
                        
                        if (confidence) {
                          if (confidence.score > 90) confidenceColorClass = "bg-green-500";
                          else if (confidence.score > 70) confidenceColorClass = "bg-yellow-500";
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
                                  <span className={`h-3 w-3 rounded-full inline-block flex-shrink-0 ${confidenceColorClass}`} />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{confidenceTooltip}</p>
                                </TooltipContent>
                              </Tooltip>
                              <Label
                                htmlFor={`map-${targetField.name}`}
                                className="text-sm truncate"
                                title={`${targetField.name} (${targetField.type || "any"})`}
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
                              value={fieldMappings[targetField.name] || NOT_MAPPED_VALUE}
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
                                {appColumns.map((col) => (
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
                </ScrollArea>

                <p className="text-xs text-muted-foreground">
                  <span className="text-destructive">*</span> Target API field is required and must be mapped.
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                No entity configuration found.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 