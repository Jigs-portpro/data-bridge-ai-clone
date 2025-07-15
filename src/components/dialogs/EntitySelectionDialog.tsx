"use client";

import React, { useState, useEffect } from 'react';
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
import { Loader2, DatabaseZap, Sparkles } from 'lucide-react';
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

const NOT_MAPPED_VALUE = "__NOT_MAPPED__";

interface EntitySelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entityId: string, mappings: Record<string, string>, confidences: Record<string, { score: number; reasoning: string } | null>) => void;
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
    setIsLoading: setAppContextIsLoading
  } = useAppContext();
  
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [fieldMappingConfidences, setFieldMappingConfidences] = useState<Record<string, { score: number; reasoning: string } | null>>({});
  const [exportConfig, setExportConfig] = useState<ExportConfig | null>(null);
  const [isFetchingConfig, setIsFetchingConfig] = useState(false);
  const [isColumnsLoading, setIsColumnsLoading] = useState(false);
  const [isAutoMapping, setIsAutoMapping] = useState(false);

  // Fetch export configuration when dialog opens
  useEffect(() => {
    if (isOpen && !exportConfig) {
      fetchExportConfig();
    }
  }, [isOpen, exportConfig]);

  // Monitor columns loading state
  useEffect(() => {
    if (isOpen) {
      setIsColumnsLoading(appColumns.length === 0);
    }
  }, [isOpen, appColumns.length]);

  // Initialize field mappings when entity is selected
  useEffect(() => {
    if (selectedEntityId && exportConfig?.entities.length) {
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
          const matchingSourceColumn = appColumns.find(
            (sc) =>
              sc.toLowerCase().replace(/[\s_]+/g, "") ===
              targetFieldNameNormalized
          );
          initialMappings[targetField.name] = matchingSourceColumn || "";
        });
        setFieldMappings(initialMappings);
        
        // Reset confidences when entity changes
        setFieldMappingConfidences({});
      }
    }
  }, [selectedEntityId, exportConfig, appColumns]);

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
    const selectedEntityConfig = exportConfig?.entities.find(
      (e: any) => e.id === selectedEntityId
    );
    
    if (!selectedEntityConfig || !appColumns.length) {
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
      const normalizedSourceColumns = appColumns.map((col) => ({
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
      const aiSourceColumns = appColumns.filter(
        (col) => !mappedSourceCols.has(col)
      );

      let aiMappings: Record<string, string> = {};
      let aiConfidences: Record<
        string,
        { score: number; reasoning: string } | null
      > = {};
      
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
    if (selectedEntityId) {
      onSave(selectedEntityId, fieldMappings, fieldMappingConfidences);
      handleClose(); // Close the dialog after saving
    }
  };

  const handleClose = () => {
    // Only allow closing if an entity has been selected and saved
    // This function will only be called when save is clicked
    setSelectedEntityId("");
    setFieldMappings({});
    setFieldMappingConfidences({});
    onClose();
  };

  const selectedEntityConfig = exportConfig?.entities.find(
    (e: any) => e.id === selectedEntityId
  );
  const noEntitiesConfigured = !exportConfig || exportConfig.entities.length === 0;
  const canSave = selectedEntityId && !isColumnsLoading;
  const isDialogLoading = isFetchingConfig || isAutoMapping;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}} modal={true}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] flex flex-col [&>button]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Select Entity and Map Columns</DialogTitle>
          <DialogDescription>
            {fileName && `For file: ${fileName}`}
            <br />
            Choose the target API entity and map your data columns to the entity's fields.
            <br />
            <span className="text-orange-600 font-medium">
              You must select an entity and save the mapping to continue.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Entity Selection */}
          <div className="flex-shrink-0">
            <Label htmlFor="entity-select" className="text-sm font-medium">
              Target API Entity
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
                    {exportConfig?.entities.map((entity: any) => (
                      <SelectItem key={entity.id} value={entity.id}>
                        {entity.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Column Mapping */}
          {selectedEntityConfig && (
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
                      isColumnsLoading ||
                      appColumns.length === 0 ||
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
                {isColumnsLoading && (
                  <div className="flex items-center gap-2 mt-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">
                      Loading columns from uploaded file...
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex-1 border rounded-md p-4 min-h-0 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 280px)' }}>
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
                            disabled={isColumnsLoading}
                          >
                            <SelectTrigger
                              id={`map-${targetField.name}`}
                              className="text-sm h-9"
                            >
                              <SelectValue 
                                placeholder={
                                  isColumnsLoading 
                                    ? "Loading columns..." 
                                    : "Select source column"
                                } 
                              />
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
          <Button 
            onClick={handleSave} 
            disabled={!canSave || isDialogLoading}
            className="w-full"
          >
            {isDialogLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Save Mapping and Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 