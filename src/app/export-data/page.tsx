"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppContext } from "@/hooks/useAppContext";
import type {
  ExportEntity,
  ExportEntityField,
  ExportConfig,
  LookupValidationConfig,
} from "@/config/exportEntities";
import { objectsToCsv } from "@/lib/csvUtils";
import {
  Send,
  AlertTriangle,
  Loader2,
  CheckCircle,
  DownloadCloud,
  Sparkles,
  DatabaseZap,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { isValid, parseISO } from "date-fns";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import {
  autoColumnMapping,
  type MappingSuggestion,
  type AutoColumnMappingClientInput,
} from "@/ai/flows/auto-column-mapping";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { mapEntityFields, transformPayload } from "@/utils/fieldMapper";
import { LookupKeyMapper } from "@/lib/constants";

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

const AUTH_TOKEN_STORAGE_KEY = "datawiseAuthToken";
const NOT_MAPPED_VALUE = "__NOT_MAPPED_PLACEHOLDER__";
const MAX_VALIDATION_MESSAGES_DISPLAYED = 100;
const SELECTED_ENTITY_ID_KEY = "export_selected_entity_id";

export default function ExportDataPage() {
  const {
    data: appData,
    showToast,
    isLoading: appContextIsLoading,
    setIsLoading: setAppContextIsLoading,
    columns: appColumns,
    isAuthenticated,
    isAuthLoading,
    fileName: originalFileName,
    chassisOwnersData,
    chassisSizesData,
    chassisTypesData,
    selectedAiProvider,
    selectedAiModelName,
    driverProfileTypesData,
    branchesData,
    customerData,
    permissionRolesData,
    fleetOwnersData,
    selectedEntityId,
    exportConfig,
    isFetchingConfig,
    fieldMappings,
    //setter
    setSelectedEntityId,
    setExportConfig,
    setIsFetchingConfig,
    setFieldMappings,
    // Lookup fetch functions
    fetchAndStoreChassisOwners,
    fetchAndStoreChassisSizes,
    fetchAndStoreChassisTypes,
    fetchAndStoreContainerSizes,
    fetchAndStoreContainerTypes,
    fetchAndStoreContainerOwners,
    fetchAndStoreBranches,
    fetchAndStoreDriverProfileTypes,
    fetchAndStoreCustomer,
    fetchAndStoreFleetOwners,
    timezoneListData,
    fetchAndStoreTimezoneList,
    customerFleetData,
    fetchAndStoreCustomerFleet,
    commoditiesData,
    fetchAndStoreCommodities,
    chassisData,
    fetchAndStoreChassis,
    trucksData,
    fetchAndStoreTrucks,
    currenciesData,
    fetchAndStoreCurrencies,
  } = useAppContext();
  const router = useRouter();

  const [validationMessages, setValidationMessages] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [hasValidated, setHasValidated] = useState(false);
  const [isDataValid, setIsDataValid] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
  const [isAutoMapping, setIsAutoMapping] = useState(false);
  const [fieldMappingConfidences, setFieldMappingConfidences] = useState<
    Record<string, { score: number; reasoning: string } | null>
  >({});

  // State for failed rows and errors
  const [failedRows, setFailedRows] = useState<
    { row: Record<string, any>; error: string }[]
  >([]);
  const [showFailedRows, setShowFailedRows] = useState(false);
  const [isRetryingFailed, setIsRetryingFailed] = useState(false);

  const isLoading =
    appContextIsLoading ||
    isFetchingConfig ||
    isValidating ||
    isExporting ||
    isAutoMapping;

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isAuthLoading, router]);

  const fetchEntitiesConfig = useCallback(async () => {
    setIsFetchingConfig(true);
    try {
      const response = await fetch("/api/export-entities");
      if (!response.ok)
        throw new Error("Failed to fetch entities configuration");
      const config: ExportConfig = await response.json();
      setExportConfig(config);
      if (config.entities.length > 0 && !selectedEntityId) {
        setSelectedEntityId(config.entities[0].id);
      } else if (
        config.entities.length > 0 &&
        selectedEntityId &&
        !config.entities.find((e) => e.id === selectedEntityId)
      ) {
        setSelectedEntityId(config.entities[0].id);
      } else if (config.entities.length === 0) {
        setSelectedEntityId("");
      }
    } catch (error) {
      console.error("Error fetching entities config:", error);
      showToast({
        title: "Config Error",
        description: "Could not load export entities configuration.",
        variant: "destructive",
      });
      setExportConfig({ baseUrl: "", entities: [] });
      setSelectedEntityId("");
    } finally {
      setIsFetchingConfig(false);
    }
  }, [showToast, selectedEntityId]);

  useEffect(() => {
    if (isAuthenticated && !exportConfig) {
      fetchEntitiesConfig();
    }
  }, [fetchEntitiesConfig, isAuthenticated]);

  useEffect(() => {
    if (selectedEntityId && exportConfig?.entities.length) {
      const entityConfig = exportConfig.entities.find(
        (e: any) => e.id === selectedEntityId
      );
      const initialMappings: Record<string, string> = {};
      if (entityConfig) {
        entityConfig.fields.forEach((targetField: any) => {
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
      }
      setFieldMappings(initialMappings);
      setValidationMessages([]);
      setHasValidated(false);
      setIsDataValid(false);
      setFieldMappingConfidences({});
    } else if (!selectedEntityId) {
      setFieldMappings({});
      setValidationMessages([]);
      setHasValidated(false);
      setIsDataValid(false);
      setFieldMappingConfidences({});
    }
  }, [selectedEntityId, appColumns, exportConfig]);

  const handleMappingChange = (
    targetFieldName: string,
    sourceColumnName: string
  ) => {
    setFieldMappings((prev: any) => ({
      ...prev,
      [targetFieldName]:
        sourceColumnName === NOT_MAPPED_VALUE ? "" : sourceColumnName,
    }));
    setFieldMappingConfidences((prev) => ({
      ...prev,
      [targetFieldName]: null,
    }));
    setHasValidated(false);
    setIsDataValid(false);
    setValidationMessages([]);
  };

  // --- Dynamic lookup data sources mapping ---
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
    // Add more lookups here as needed
  };

  // Function to automatically fetch missing lookup data
  const fetchMissingLookupData = useCallback(
    async (entityConfig: ExportEntity) => {
      const missingLookups: string[] = [];
      const fetchPromises: Promise<void>[] = [];

      // Check which lookups are required but missing
      entityConfig.fields.forEach((field) => {
        if (field.lookupValidation) {
          const { lookupId } = field.lookupValidation;
          const lookupSource = lookupDataSources[lookupId];

          console.log(
            `Checking field "${field.name}" with lookupId "${lookupId}"`
          );

          if (lookupSource) {
            const lookupData = lookupSource.getData();
            console.log(
              `Lookup "${lookupId}" has ${lookupData?.length || 0} items`
            );

            if (!lookupData || lookupData.length === 0) {
              if (!missingLookups.includes(lookupId)) {
                console.log(`Adding "${lookupId}" to missing lookups list`);
                missingLookups.push(lookupId);
                if (lookupSource.fetchFunction) {
                  fetchPromises.push(lookupSource.fetchFunction());
                }
              }
            } else {
              console.log(
                `Lookup "${lookupId}" already has data, skipping fetch`
              );
            }
          } else {
            console.warn(`No lookup source found for lookupId "${lookupId}"`);
          }
        }
      });

      console.log("Missing lookups:", missingLookups);

      if (missingLookups.length > 0) {
        showToast({
          title: "Fetching Lookup Data",
          description: `Automatically fetching missing lookup data: ${missingLookups
            .map((id) => lookupDataSources[id].name)
            .join(", ")}`,
          duration: 3000,
        });

        try {
          console.log("Starting to fetch missing lookup data...");
          await Promise.all(fetchPromises);
          console.log("All lookup data fetch promises completed");

          // Wait a bit for state to update
          await new Promise((resolve) => setTimeout(resolve, 100));

          showToast({
            title: "Lookup Data Fetched",
            description: `Successfully fetched lookup data for validation.`,
          });
        } catch (error) {
          console.error("Error fetching lookup data:", error);
          showToast({
            title: "Lookup Fetch Error",
            description:
              "Some lookup data could not be fetched. Validation may be incomplete.",
            variant: "destructive",
          });
        }
      }
    },
    [
      fetchAndStoreChassisOwners,
      fetchAndStoreChassisSizes,
      fetchAndStoreChassisTypes,
      fetchAndStoreDriverProfileTypes,
      fetchAndStoreBranches,
      fetchAndStoreCustomer,
      fetchAndStoreFleetOwners,
      fetchAndStoreCommodities,
      fetchAndStoreChassis,
      fetchAndStoreTrucks,
      fetchAndStoreCurrencies,
      showToast,
    ]
  );

  // Auto-fetch lookup data when selectedEntityId changes
  useEffect(() => {
    const autoFetchLookupData = async () => {
      if (!selectedEntityId || !exportConfig?.entities.length) return;

      const entityConfig = exportConfig.entities.find(
        (e: any) => e.id === selectedEntityId
      );

      if (!entityConfig) return;

      console.log(
        `=== AUTO-FETCH LOOKUP DATA FOR ENTITY: ${entityConfig.name} ===`
      );

      try {
        await fetchMissingLookupData(entityConfig);
      } catch (error) {
        console.error("Error in auto-fetch lookup data:", error);
      }
    };

    // Only auto-fetch if we have the necessary data and user is authenticated
    if (isAuthenticated && !isAuthLoading) {
      autoFetchLookupData();
    }
  }, [
    selectedEntityId,
    exportConfig,
    isAuthenticated,
    isAuthLoading,
    fetchMissingLookupData,
  ]);

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
            `Row ${rowIndex + 1}, Target "${
              targetField.name
            }": required by API but not mapped.`
          );
          return;
        }
        if (!sourceColumnName) return;

        const value = row[sourceColumnName];
        const stringValue: string =
          value === null || value === undefined ? "" : String(value).trim();

        if (targetField.required && stringValue === "") {
          errors.push(
            `Row ${rowIndex + 1}, Field "${
              targetField.name
            }" (from "${sourceColumnName}"): required by API but source data is empty.`
          );
        }

        if (stringValue !== "") {
          switch (targetField.type) {
            case "string":
            case "email":
              if (
                targetField.minLength !== undefined &&
                stringValue.length < targetField.minLength
              ) {
                errors.push(
                  `Row ${rowIndex + 1}, "${
                    targetField.name
                  }" (from "${sourceColumnName}"): min length ${
                    targetField.minLength
                  }, got ${stringValue.length}. Value: "${stringValue.substring(
                    0,
                    50
                  )}"`
                );
              }
              if (
                targetField.maxLength !== undefined &&
                stringValue.length > targetField.maxLength
              ) {
                errors.push(
                  `Row ${rowIndex + 1}, "${
                    targetField.name
                  }" (from "${sourceColumnName}"): max length ${
                    targetField.maxLength
                  }, got ${stringValue.length}. Value: "${stringValue.substring(
                    0,
                    50
                  )}"`
                );
              }
              if (targetField.pattern) {
                try {
                  const regex = new RegExp(targetField.pattern);
                  if (!regex.test(stringValue)) {
                    errors.push(
                      `Row ${rowIndex + 1}, "${
                        targetField.name
                      }" (from "${sourceColumnName}"): does not match pattern "${
                        targetField.pattern
                      }". Value: "${stringValue.substring(0, 50)}"`
                    );
                  }
                } catch (e) {
                  errors.push(
                    `Row ${rowIndex + 1}, Field "${
                      targetField.name
                    }": Configuration error - Invalid regex pattern provided: "${
                      targetField.pattern
                    }". Pattern validation skipped.`
                  );
                }
              }
              if (targetField.type === "email" && !isValidEmail(stringValue)) {
                errors.push(
                  `Row ${rowIndex + 1}, "${
                    targetField.name
                  }" (from "${sourceColumnName}"): not a valid email. Value: "${stringValue}"`
                );
              }
              break;
            case "number":
              const numValue = parseFloat(stringValue);
              if (isNaN(numValue)) {
                errors.push(
                  `Row ${rowIndex + 1}, "${
                    targetField.name
                  }" (from "${sourceColumnName}"): should be a number. Found "${stringValue}".`
                );
              } else {
                if (
                  targetField.minValue !== undefined &&
                  numValue < targetField.minValue
                )
                  errors.push(
                    `Row ${rowIndex + 1}, "${
                      targetField.name
                    }" (from "${sourceColumnName}"): min value ${
                      targetField.minValue
                    }, got ${numValue}.`
                  );
                if (
                  targetField.maxValue !== undefined &&
                  numValue > targetField.maxValue
                )
                  errors.push(
                    `Row ${rowIndex + 1}, "${
                      targetField.name
                    }" (from "${sourceColumnName}"): max value ${
                      targetField.maxValue
                    }, got ${numValue}.`
                  );
              }
              break;
            case "boolean":
              if (
                stringValue !== "" &&
                !["true", "false", "1", "0"].includes(stringValue.toLowerCase())
              ) {
                errors.push(
                  `Row ${rowIndex + 1}, "${
                    targetField.name
                  }" (from "${sourceColumnName}"): should be boolean (true/false, 1/0). Found "${stringValue}".`
                );
              }
              break;
            case "date":
              if (!isValidDateString(stringValue))
                errors.push(
                  `Row ${rowIndex + 1}, "${
                    targetField.name
                  }" (from "${sourceColumnName}"): not a valid date. Examples: YYYY-MM-DD, MM/DD/YYYY. Found "${stringValue}".`
                );
              break;
          }
        }

        // Validate enum values if configured
        if (targetField.enum && stringValue !== "") {
          if (!targetField.enum.includes(stringValue)) {
            errors.push(
              `Row ${rowIndex + 1}, "${
                targetField.name
              }" (from "${sourceColumnName}"): must be one of [${targetField.enum.join(
                ", "
              )}]. Found "${stringValue}".`
            );
          }
        }

        // Perform lookup validation if configured
        if (targetField.lookupValidation && stringValue !== "") {
          let arrayValue: string[] = [];
          const { lookupId, lookupField } = targetField.lookupValidation;

          if (targetField?.isMulti) {
            arrayValue = stringValue
              ?.split(",")
              ?.filter((value) => value?.trim());
          }

          const lookupSource = lookupDataSources[lookupId];
          let lookupDataSource: any[] | null = null;
          let lookupSourceName = lookupId;
          let expectedField = lookupField;
          console.log({
            lookupId,
            lookupField,
            targetField,
            lookupDataSource,
            lookupSource,
          });
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
              const foundInLookup = lookupDataSource.some((lookupRow) => {
                const _value = String(lookupRow[expectedField]).trim();
                if (arrayValue?.length > 0) {
                  return arrayValue?.includes(_value);
                } else {
                  return _value === stringValue;
                }
              });
              if (!foundInLookup) {
                errors.push(
                  `Row ${rowIndex + 1}, Target "${
                    targetField.name
                  }" (from "${sourceColumnName}"): Value "${stringValue}" not found in ${lookupSourceName} (column: ${expectedField}).`
                );
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
    [
      fieldMappings,
      chassisOwnersData,
      chassisSizesData,
      chassisTypesData,
      driverProfileTypesData,
      branchesData,
      customerData,
    ]
  );

  const handleValidateData = useCallback(async () => {
    if (!selectedEntityId || !exportConfig) {
      showToast({
        title: "Setup Required",
        description:
          "Please select a target entity and ensure configuration is loaded.",
        variant: "destructive",
      });
      return;
    }
    const selectedEntity = exportConfig.entities.find(
      (e: any) => e.id === selectedEntityId
    );
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
    setValidationMessages([]);

    try {
      await new Promise((resolve) => setTimeout(resolve, 0));

      let allValidationErrors: string[] = [];
      for (let i = 0; i < appData.length; i++) {
        const row = appData[i];
        const rowErrors = validateSingleRow(row, i, selectedEntity);
        allValidationErrors = [...allValidationErrors, ...rowErrors];
        if (allValidationErrors.length >= MAX_VALIDATION_MESSAGES_DISPLAYED) {
          allValidationErrors.push(
            `Validation stopped after reaching ${MAX_VALIDATION_MESSAGES_DISPLAYED} errors. There may be more.`
          );
          break;
        }
      }

      setHasValidated(true);
      setValidationMessages(allValidationErrors);

      if (allValidationErrors.length === 0) {
        setIsDataValid(true);
        showToast({
          title: "Validation Successful",
          description: "Data is valid and ready for export.",
          variant: "default",
        });
      } else {
        setIsDataValid(false);
        showToast({
          title: "Validation Failed",
          description: `${
            allValidationErrors.length > MAX_VALIDATION_MESSAGES_DISPLAYED
              ? "More than "
              : ""
          }${Math.min(
            allValidationErrors.length,
            MAX_VALIDATION_MESSAGES_DISPLAYED
          )} error(s) found. Please review.`,
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
  }, [
    appData,
    exportConfig,
    selectedEntityId,
    showToast,
    validateSingleRow,
    setAppContextIsLoading,
    fetchMissingLookupData,
    chassisOwnersData,
    chassisSizesData,
    chassisTypesData,
    driverProfileTypesData,
    branchesData,
    customerData,
    commoditiesData,
    chassisData,
    trucksData,
    currenciesData,
  ]);

  const transformDataForExport = useCallback(() => {
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

    return appData.map((row) => {
      const transformedRow: Record<string, any> = {};
      selectedEntity.fields.forEach((targetField: any) => {
        const sourceColumnName = fieldMappings[targetField.name];
        if (sourceColumnName && appColumns.includes(sourceColumnName)) {
          let valueToTransform = row[sourceColumnName];
          const stringValue =
            valueToTransform === null || valueToTransform === undefined
              ? ""
              : String(valueToTransform).trim();

          // mutli select string value, separated by comma
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
              // Find the matching row in the lookup data
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
                const match = lookupData.find(
                  (ld) => String(ld[lookupField]).trim() === stringValue
                );
                if (match && match._id) {
                  exportValue = match._id;
                } else if (match && match.id) {
                  exportValue = match.id;
                } else {
                  // If no ID field, fallback to original value
                  exportValue = stringValue;
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
            }
          }
        } else if (targetField.required) {
          transformedRow[targetField.name] = null;
        } else {
          transformedRow[targetField.name] = null;
        }
      });

      const finalRowForExport: Record<string, any> = {};
      selectedEntity.fields.forEach((tf: any) => {
        finalRowForExport[tf.name] = transformedRow.hasOwnProperty(tf.name)
          ? transformedRow[tf.name]
          : null;
      });
      return finalRowForExport;
    });
  }, [
    appData,
    appColumns,
    exportConfig,
    fieldMappings,
    selectedEntityId,
    lookupDataSources,
  ]);

  // Simulate Export to API (current logic)
  const simulateExportToApi = async () => {
    if (!isDataValid || !hasValidated) {
      showToast({
        title: "Validation Required",
        description:
          "Please validate the data successfully before exporting to API.",
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

    const payload = transformDataForExport();

    const authToken =
      typeof window !== "undefined"
        ? localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
        : null;
    const requestHeaders: HeadersInit = {
      "Content-Type": "application/json",
      Accept: "application/json, text/plain, */*",
    };
    if (authToken) requestHeaders["Authorization"] = `Bearer ${authToken}`;
    else
      showToast({
        title: "Auth Token Missing",
        description: "Exporting to API without authentication token.",
        variant: "destructive",
      });

    const baseUrl = exportConfig.baseUrl || "";
    const fullApiUrl =
      (baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl) +
      (selectedEntity.url.startsWith("/")
        ? selectedEntity.url
        : "/" + selectedEntity.url);

    try {
      console.log(`Simulating API export to: ${fullApiUrl}`);
      console.log(
        "Request Headers:",
        JSON.parse(JSON.stringify(requestHeaders))
      );
      console.log("Export Payload for API:", JSON.stringify(payload, null, 2));

      await new Promise((resolve) => setTimeout(resolve, 1000));

      showToast({
        title: 'API Export "Simulated"',
        description: `Data for "${selectedEntity.name}" prepared for API. Check browser console.`,
      });
    } catch (error: any) {
      setValidationMessages([
        `API Export Error: ${error.message || "An unknown error occurred."}`,
      ]);
      showToast({
        title: "API Export Error",
        description: "Error during API export. See details on page.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
      setAppContextIsLoading(false);
    }
  };

  // Real Export to API (row-by-row POST)
  const handleExportToApi = async (rowsToExport?: Record<string, any>[]) => {
    if (!isDataValid || !hasValidated) {
      showToast({
        title: "Validation Required",
        description:
          "Please validate the data successfully before exporting to API.",
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
    setFailedRows([]);
    setShowFailedRows(false);

    console.log({ rowsToExport });
    const payloadRows = rowsToExport || transformDataForExport();
    const authToken =
      typeof window !== "undefined"
        ? localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
        : null;
    const requestHeaders: HeadersInit = {
      "Content-Type": "application/json",
      Accept: "application/json, text/plain, */*",
    };
    if (authToken) requestHeaders["Authorization"] = `Bearer ${authToken}`;
    else
      showToast({
        title: "Auth Token Missing",
        description: "Exporting to API without authentication token.",
        variant: "destructive",
      });

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URI || "https://api.axle.network";
    const fullApiUrl =
      (baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl) +
      (selectedEntity.url.startsWith("/")
        ? selectedEntity.url
        : "/" + selectedEntity.url);

    console.log("fullApiUrl", fullApiUrl);

    const mappedPayload = await transformPayload(payloadRows, selectedEntity);
    console.log("mappedPayload", mappedPayload);
    const isBulkUpload = fullApiUrl.includes("bulkupload");

    let failed: { row: Record<string, any>; error: string }[] = [];
    let successCount = 0;

    if (isBulkUpload) {
      try {
        const { data } = await (
          await fetch(fullApiUrl, {
            method: "POST",
            headers: requestHeaders,
            body: JSON.stringify({ data: mappedPayload }),
          })
        ).json();

        if (data.rejected) {
          for (const item of data.rejected) {
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
      } catch (error: any) {
        failed.push({
          row: payloadRows,
          error: error.message || "Network error",
        });
      }
    } else {
      for (let i = 0; i < payloadRows.length; i++) {
        const row = payloadRows[i];
        let transformedRow = await transformPayload([row], selectedEntity);
        console.log(selectedEntity.id, transformedRow);

        let requestBody: FormData | string;
        let requestHeadersForRow = { ...requestHeaders };

        if (selectedEntity.id === "People" && transformedRow.length > 0) {
          const newFormData = new FormData();
          Object.keys(transformedRow[0]).forEach((key) => {
            let value: any =
              transformedRow[0][key as keyof (typeof transformedRow)[0]];

            // Handle array fields that need to be JSON stringified
            if (key === "mobileNumbers" || key === "permissions") {
              if (typeof value === "string" && value.trim()) {
                value = JSON.stringify(
                  value.split(",").map((item: string) => item.trim())
                );
              } else if (Array.isArray(value)) {
                value = JSON.stringify(value);
              } else {
                value = JSON.stringify([]);
              }
            }

            newFormData.append(key, String(value || ""));
          });
          requestBody = newFormData;
          // Remove Content-Type header for FormData - browser will set it automatically with boundary
          delete requestHeadersForRow["Content-Type"];
        } else {
          requestBody = JSON.stringify(transformedRow[0]);
        }

        try {
          const response = await fetch(fullApiUrl, {
            method: "POST",
            headers: requestHeadersForRow,
            body: requestBody,
          });
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
        } catch (err: any) {
          failed.push({ row, error: err?.message || "Network error" });
        }
      }
    }

    console.log({ failed });

    setFailedRows(failed);
    setShowFailedRows(true);
    setIsExporting(false);
    setAppContextIsLoading(false);

    if (failed.length === 0) {
      showToast({
        title: "API Exported",
        description: `All ${payloadRows.length} rows exported successfully.`,
      });
    } else {
      showToast({
        title: "Partial Export",
        description: `${successCount} succeeded, ${failed.length} failed. See details below.`,
        variant: "destructive",
        duration: 9000,
      });
    }
  };

  // Retry only failed rows
  const handleRetryFailedRows = async () => {
    setIsRetryingFailed(true);
    await handleExportToApi(failedRows.map((f) => f.row));
    setIsRetryingFailed(false);
  };

  // Download failed rows as CSV
  const handleDownloadFailedRows = () => {
    if (!failedRows.length) return;
    const headers = Object.keys(failedRows[0].row).concat("Error");
    const data = failedRows.map((f) => ({ ...f.row, Error: f.error }));
    const csvString = objectsToCsv(headers, data);
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `failed_rows_export.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportToCsv = () => {
    if (!isDataValid || !hasValidated) {
      showToast({
        title: "Validation Required",
        description:
          "Please validate the data successfully before exporting as CSV.",
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
      const dataToExport = transformDataForExport();
      const headersForCsv = selectedEntity.fields.map((f: any) => f.name);
      const csvString = objectsToCsv(headersForCsv, dataToExport);

      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      const exportFileName = originalFileName
        ? `${originalFileName.split(".")[0]}_${selectedEntity.name.replace(
            /\s+/g,
            "_"
          )}.csv`
        : `${selectedEntity.name.replace(/\s+/g, "_")}_export.csv`;
      link.setAttribute("download", exportFileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast({
        title: "CSV Exported",
        description: `Data for "${selectedEntity.name}" downloaded as ${exportFileName}.`,
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

  // Utility to normalize column/field names for matching
  function normalizeName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/gi, ""); // Remove all non-alphanumeric chars
  }

  const handleAutoMapColumns = async () => {
    if (!selectedEntityConfig || !appColumns.length) {
      showToast({
        title: "Cannot Auto-map",
        description:
          "Please select an entity and ensure data columns are loaded.",
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
      // --- Hybrid Preprocessing + AI ---
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

      // 3. Merge direct and AI mappings
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
            reasoning:
              "Direct normalized name match (ignoring case and special characters).",
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
      setHasValidated(false);
      setIsDataValid(false);
      setValidationMessages([]);
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
        desc =
          "Authentication failed with the AI provider. Check your API key.";
      } else if (errorMessage.includes("model not found")) {
        desc = `The AI model ('${selectedAiProvider}/${selectedAiModelName}') was not found. Check AI Settings and key permissions.`;
      } else if (
        errorMessage.includes("503") ||
        errorMessage.includes("unavailable") ||
        errorMessage.includes("overloaded")
      ) {
        desc =
          "AI service for auto-mapping is currently overloaded or unavailable. Please try again later.";
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

  // Utility to get a unique key for localStorage based on file and entity
  function getColumnMappingStorageKey(
    fileName: string | null,
    entityId: string | null
  ) {
    return fileName && entityId
      ? `columnMapping_${fileName}_${entityId}`
      : null;
  }

  // Persist column mapping in localStorage
  useEffect(() => {
    const key = getColumnMappingStorageKey(originalFileName, selectedEntityId);
    if (!key) return;
    if (Object.keys(fieldMappings).length > 0) {
      localStorage.setItem(key, JSON.stringify(fieldMappings));
    }
  }, [fieldMappings, originalFileName, selectedEntityId]);

  // Restore column mapping from localStorage on file/entity change
  useEffect(() => {
    const key = getColumnMappingStorageKey(originalFileName, selectedEntityId);
    if (!key) return;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setFieldMappings(JSON.parse(saved));
      } catch {}
    } else {
      setFieldMappings({});
    }
  }, [originalFileName, selectedEntityId]);

  // On mount, restore selectedEntityId from localStorage if present and valid
  useEffect(() => {
    if (exportConfig && exportConfig.entities.length > 0) {
      const stored =
        typeof window !== "undefined"
          ? localStorage.getItem(SELECTED_ENTITY_ID_KEY)
          : null;
      if (stored && exportConfig.entities.some((e: any) => e.id === stored)) {
        setSelectedEntityId(stored);
      }
    }
    // Only run on first config load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportConfig]);

  // Whenever selectedEntityId changes, persist to localStorage
  useEffect(() => {
    if (selectedEntityId) {
      localStorage.setItem(SELECTED_ENTITY_ID_KEY, selectedEntityId);
    }
  }, [selectedEntityId]);

  const selectedEntityConfig = exportConfig?.entities.find(
    (e: any) => e.id === selectedEntityId
  );
  const noEntitiesConfigured =
    !exportConfig || exportConfig.entities.length === 0;
  const noDataLoaded = appData.length === 0;

  // Determine if any field in the selected entity requires 'chassisOwners' lookup
  const requiresChassisLookup = selectedEntityConfig?.fields?.some(
    (field: any) => field.lookupValidation?.lookupId === "chassisOwners"
  );
  const requiresChassisSizesLookup = selectedEntityConfig?.fields?.some(
    (field: any) => field.lookupValidation?.lookupId === "chassisSizes"
  );
  const requiresChassisTypesLookup = selectedEntityConfig?.fields?.some(
    (field: any) => field.lookupValidation?.lookupId === "chassisTypes"
  );
  const chassisLookupNotLoaded =
    requiresChassisLookup &&
    (!chassisOwnersData || chassisOwnersData.length === 0);
  const chassisSizesLookupNotLoaded =
    requiresChassisSizesLookup &&
    (!chassisSizesData || chassisSizesData.length === 0);
  const chassisTypesLookupNotLoaded =
    requiresChassisTypesLookup &&
    (!chassisTypesData || chassisTypesData.length === 0);

  if (isAuthLoading && !isAuthenticated) {
    return (
      <AppLayout pageTitle="Loading Export Data...">
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (
    !selectedEntityConfig &&
    exportConfig &&
    Array.isArray(exportConfig.entities) &&
    exportConfig.entities.length > 0
  ) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Select an entity to configure field mappings.
      </p>
    );
  }

  return (
    <div className="min-h-screen overflow-auto">
      <AppLayout pageTitle="Export Data">
        <div className="flex flex-col gap-6 p-4">
          <Card className="w-full max-w-5xl mx-auto">
            <CardHeader>
              <CardTitle>Export Configuration</CardTitle>
              <CardDescription>
                Select the target API entity and map your current data columns
                to the API's expected fields. Ensure entities are configured on
                the{" "}
                <Link
                  href="/setup"
                  className="underline text-primary hover:text-primary/80"
                >
                  Setup page
                </Link>
                . Lookup data for validation can be managed on the{" "}
                <Link
                  href="/lookups"
                  className="underline text-primary hover:text-primary/80"
                >
                  Lookups page
                </Link>
                .
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <Label htmlFor="entity-select" className="md:text-right">
                  Target API Entity
                </Label>
                <div className="md:col-span-2">
                  {isFetchingConfig ? (
                    <div className="flex items-center gap-2 py-2">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">
                        Loading entities...
                      </span>
                    </div>
                  ) : (
                    <Select
                      value={selectedEntityId}
                      onValueChange={setSelectedEntityId}
                      disabled={
                        isLoading || isFetchingConfig || noEntitiesConfigured
                      }
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
                  {noEntitiesConfigured && !isFetchingConfig && (
                    <p className="text-xs text-destructive mt-1">
                      Please configure target entities on the{" "}
                      <Link href="/setup" className="underline">
                        Setup page
                      </Link>{" "}
                      first.
                    </p>
                  )}
                </div>
              </div>

              {selectedEntityConfig && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-md font-semibold text-center md:text-left">
                      Map Columns for "{selectedEntityConfig.name}"
                    </h4>
                    <Button
                      onClick={handleAutoMapColumns}
                      disabled={
                        isLoading ||
                        !selectedEntityConfig ||
                        noDataLoaded ||
                        appColumns.length === 0 ||
                        isAutoMapping ||
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
                  <ScrollArea className="h-72 border rounded-md p-4">
                    <div className="space-y-3">
                      <TooltipProvider>
                        {selectedEntityConfig.fields.map((targetField: any) => {
                          const confidence =
                            fieldMappingConfidences[targetField.name];
                          let confidenceColorClass = "bg-muted";
                          let confidenceTooltip =
                            "No AI mapping or manually changed.";
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
                                    <span className="text-destructive ml-1">
                                      *
                                    </span>
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
                                  fieldMappings[targetField.name] ||
                                  NOT_MAPPED_VALUE
                                }
                                onValueChange={(sourceCol) =>
                                  handleMappingChange(
                                    targetField.name,
                                    sourceCol
                                  )
                                }
                                disabled={isLoading}
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
                  <p className="text-xs text-muted-foreground mt-2">
                    <span className="text-destructive">*</span> Target API field
                    is required and must be mapped.
                  </p>
                  {chassisLookupNotLoaded && (
                    <Alert variant="destructive" className="mt-3">
                      <DatabaseZap className="h-4 w-4" />
                      <AlertTitle>
                        Chassis Owners Lookup Data Missing
                      </AlertTitle>
                      <AlertDescription className="space-y-2">
                        <p>
                          This entity requires "Chassis Owners" lookup data for
                          validation, but it's not currently loaded.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={fetchAndStoreChassisOwners}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <DatabaseZap className="mr-2 h-4 w-4" />
                            )}
                            Fetch Chassis Owners
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            or visit the{" "}
                            <Link href="/lookups" className="underline">
                              Lookups page
                            </Link>
                          </span>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                  {chassisSizesLookupNotLoaded && (
                    <Alert variant="destructive" className="mt-3">
                      <DatabaseZap className="h-4 w-4" />
                      <AlertTitle>Chassis Sizes Lookup Data Missing</AlertTitle>
                      <AlertDescription className="space-y-2">
                        <p>
                          This entity requires "Chassis Sizes" lookup data for
                          validation, but it's not currently loaded.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={fetchAndStoreChassisSizes}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <DatabaseZap className="mr-2 h-4 w-4" />
                            )}
                            Fetch Chassis Sizes
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            or visit the{" "}
                            <Link href="/lookups" className="underline">
                              Lookups page
                            </Link>
                          </span>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                  {chassisTypesLookupNotLoaded && (
                    <Alert variant="destructive" className="mt-3">
                      <DatabaseZap className="h-4 w-4" />
                      <AlertTitle>Chassis Types Lookup Data Missing</AlertTitle>
                      <AlertDescription className="space-y-2">
                        <p>
                          This entity requires "Chassis Types" lookup data for
                          validation, but it's not currently loaded.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={fetchAndStoreChassisTypes}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <DatabaseZap className="mr-2 h-4 w-4" />
                            )}
                            Fetch Chassis Types
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            or visit the{" "}
                            <Link href="/lookups" className="underline">
                              Lookups page
                            </Link>
                          </span>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Validation</CardTitle>
              <CardDescription>
                Validate your mapped data against the target entity's rules
                before exporting. This step is required before any Export button
                is enabled.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleValidateData}
                disabled={isLoading || !selectedEntityConfig || noDataLoaded}
                className="w-full md:w-auto"
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
              {noDataLoaded && !isLoading && (
                <p className="text-sm text-orange-600 mt-2">
                  No data loaded to validate. Please upload a file first.
                </p>
              )}
            </CardContent>
            {hasValidated && validationMessages.length > 0 && (
              <CardFooter className="flex-col items-start gap-2">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>
                    Validation Errors (
                    {validationMessages.length >
                    MAX_VALIDATION_MESSAGES_DISPLAYED
                      ? `Showing first ${MAX_VALIDATION_MESSAGES_DISPLAYED} of `
                      : ""}
                    {validationMessages.length} found)
                  </AlertTitle>
                  <ScrollArea className="max-h-60 mt-2">
                    <AlertDescription>
                      <ul className="list-disc pl-5 text-xs space-y-1">
                        {validationMessages
                          .slice(0, MAX_VALIDATION_MESSAGES_DISPLAYED)
                          .map((msg, index) => (
                            <li key={index}>{msg}</li>
                          ))}
                        {validationMessages.length >
                          MAX_VALIDATION_MESSAGES_DISPLAYED && (
                          <li>
                            ...and{" "}
                            {validationMessages.length -
                              MAX_VALIDATION_MESSAGES_DISPLAYED}{" "}
                            more errors.
                          </li>
                        )}
                      </ul>
                    </AlertDescription>
                  </ScrollArea>
                </Alert>
              </CardFooter>
            )}
            {hasValidated && validationMessages.length === 0 && (
              <CardFooter>
                <Alert
                  variant="default"
                  className="border-green-500 bg-green-50 dark:bg-green-900/30"
                >
                  <CheckCircle className="h-4 w-4 text-green-700 dark:text-green-400" />
                  <AlertTitle className="text-green-800 dark:text-green-300">
                    Validation Successful
                  </AlertTitle>
                  <AlertDescription className="text-green-700 dark:text-green-500">
                    Your data meets all requirements for the selected entity.
                  </AlertDescription>
                </Alert>
              </CardFooter>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Export Actions</CardTitle>
              <CardDescription>
                Once data is successfully validated, you can export it to the
                target API or download it as a CSV file.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={() => handleExportToApi()}
                disabled={
                  isLoading ||
                  !hasValidated ||
                  !isDataValid ||
                  !selectedEntityConfig ||
                  noDataLoaded
                }
                className="w-full sm:w-auto"
              >
                {isExporting && appContextIsLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Export to API
              </Button>
              <Button
                onClick={simulateExportToApi}
                variant="outline"
                disabled={
                  isLoading ||
                  !hasValidated ||
                  !isDataValid ||
                  !selectedEntityConfig ||
                  noDataLoaded
                }
                className="w-full sm:w-auto"
              >
                {isExporting && appContextIsLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Simulate Export to API
              </Button>
              <Button
                onClick={handleExportToCsv}
                variant="outline"
                disabled={
                  isLoading ||
                  !hasValidated ||
                  !isDataValid ||
                  !selectedEntityConfig ||
                  noDataLoaded
                }
                className="w-full sm:w-auto"
              >
                {isExporting && appContextIsLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <DownloadCloud className="mr-2 h-4 w-4" />
                )}
                Download as CSV
              </Button>
            </CardContent>
            <CardFooter>
              <p className="text-xs text-muted-foreground">
                Export buttons are enabled after successful validation of loaded
                data.
                <br />
                <b>Export to API</b> will POST to the configured endpoint.{" "}
                <b>Simulate Export to API</b> will only log the payload.
                <br />
                Both work for any entity you add in Setup.
              </p>
            </CardFooter>
          </Card>

          {/* Failed rows summary and actions */}
          {showFailedRows && failedRows.length > 0 && (
            <div className="mt-6">
              <Alert variant="destructive">
                <AlertTitle>Some rows failed to export</AlertTitle>
                <AlertDescription>
                  <div className="mb-2">
                    {failedRows.length} row(s) failed to export. You can
                    download them, fix the issues, and retry.
                  </div>
                  <div className="flex gap-2 mb-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDownloadFailedRows}
                    >
                      Download Failed Rows as CSV
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleRetryFailedRows}
                      disabled={isRetryingFailed}
                    >
                      {isRetryingFailed ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        "Retry Failed Rows"
                      )}
                    </Button>
                  </div>
                  <div className="overflow-x-auto max-h-64 border rounded bg-background">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr>
                          {Object.keys(failedRows[0].row).map((col) => (
                            <th key={col} className="px-2 py-1 border-b">
                              {col}
                            </th>
                          ))}
                          <th className="px-2 py-1 border-b text-destructive">
                            Error
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {failedRows.map((f, idx) => (
                          <tr key={idx}>
                            {Object.values(f.row).map((val, i) => (
                              <td key={i} className="px-2 py-1 border-b">
                                {String(val)}
                              </td>
                            ))}
                            <td className="px-2 py-1 border-b text-destructive">
                              {f.error}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      </AppLayout>
    </div>
  );
}
