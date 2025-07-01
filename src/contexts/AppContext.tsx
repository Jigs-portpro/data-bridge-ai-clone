"use client";

import type React from "react";
import {
  createContext,
  useState,
  useCallback,
  useEffect,
  Dispatch,
  SetStateAction,
} from "react";
import { useToast } from "@/hooks/use-toast";
import type { ToastProps } from "@/components/ui/toast";
import { useRouter, usePathname } from "next/navigation";
import driverProfileTypes from "@/static/driverProfileTypes.json";
import timezoneList from "@/static/timezoneList.json";
import { ExportConfig } from "@/config/exportEntities";
import { useSession, signIn, signOut } from "next-auth/react";
import {
  CARRIER_ID_STORAGE_KEY,
  AUTH_TOKEN_STORAGE_KEY,
  AUTH_COMPANY_STORAGE_KEY,
  AI_PROVIDER_STORAGE_KEY,
  AI_MODEL_NAME_STORAGE_KEY,
  DEFAULT_AI_PROVIDER,
  DEFAULT_AI_MODEL_NAME,
  ENTITY_NAME_STORAGE_KEY,
  DATATABLE_DATA_KEY,
  DATATABLE_COLUMNS_KEY,
  CHATPANE_HISTORY_KEY,
  DATATABLE_EDITED_CELLS_KEY,
  FILENAME_STORAGE_KEY,
} from "@/lib/constants";
import { clearAllExportState } from '@/utils/helpers';

type AppContextType = {
  data: Record<string, any>[];
  setData: (data: Record<string, any>[]) => void;
  columns: string[];
  setColumns: (columns: string[]) => void;
  entityName: string | null;
  setEntityName: (name: string | null) => void;
  fileName: string | null;
  setFileName: (name: string | null) => void;
  activeDialog: string | null;
  openDialog: (dialogName: string) => void;
  closeDialog: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  showToast: (options: {
    title: string;
    description?: string;
    variant?: ToastProps["variant"];
    duration?: number;
  }) => void;
  chatHistory: {
    role: "user" | "model" | "system" | "tool";
    content: string;
    isError?: boolean;
  }[];
  setChatHistory: React.Dispatch<
    React.SetStateAction<{ role: "user" | "model" | "system" | "tool"; content: string }[]>
  >;
  addChatMessage: (message: {
    role: "user" | "model" | "system" | "tool";
    content: string;
    isError?: boolean;
  }) => void;
  clearChatHistory: () => void;
  isAuthenticated: boolean;
  login: () => boolean;
  logout: () => void;
  isAuthLoading: boolean;
  currentCompanyName: string | null;
  setCurrentCompanyName: (name: string | null) => void;
  storeApiToken: (token: string, companyName?: string | null) => void;
  clearApiToken: () => void;
  getApiToken: () => string | null;
  selectedAiProvider: string | null;
  setSelectedAiProvider: (provider: string | null) => void;
  selectedAiModelName: string | null;
  setSelectedAiModelName: (modelName: string | null) => void;
  getEnvKeys: () => Record<string, boolean>;
  clearAllLookupData: () => void;
  // Chassis Lookups
  chassisOwnersData: any[] | null;
  chassisOwnersLastFetched: Date | null;
  fetchAndStoreChassisOwners: () => Promise<void>;
  clearChassisOwnersData: () => void;
  chassisSizesData: any[] | null;
  chassisSizesLastFetched: Date | null;
  fetchAndStoreChassisSizes: () => Promise<void>;
  clearChassisSizesData: () => void;
  chassisTypesData: any[] | null;
  chassisTypesLastFetched: Date | null;
  fetchAndStoreChassisTypes: () => Promise<void>;
  clearChassisTypesData: () => void;
  // Container Lookups
  containerSizesData: any[] | null;
  containerSizesLastFetched: Date | null;
  fetchAndStoreContainerSizes: () => Promise<void>;
  clearContainerSizesData: () => void;
  containerTypesData: any[] | null;
  containerTypesLastFetched: Date | null;
  fetchAndStoreContainerTypes: () => Promise<void>;
  clearContainerTypesData: () => void;
  containerOwnersData: any[] | null;
  containerOwnersLastFetched: Date | null;
  fetchAndStoreContainerOwners: () => Promise<void>;
  clearContainerOwnersData: () => void;
  // Branches Lookup State
  branchesData: any[] | null;
  branchesLastFetched: Date | null;
  fetchAndStoreBranches: () => Promise<void>;
  clearBranchesData: () => void;
  // Driver Profile Types Lookup State
  driverProfileTypesData: string[] | null;
  driverProfileTypesLastFetched: Date | null;
  fetchAndStoreDriverProfileTypes: () => Promise<void>;
  clearDriverProfileTypesData: () => void;
  // Customer Lookup State
  customerData: any[] | null;
  customerLastFetched: Date | null;
  fetchAndStoreCustomer: () => Promise<void>;
  clearCustomerData: () => void;

  // permissions
  permissionRolesData: any[] | null;
  permissionRolesLastFetched: Date | null;
  fetchAndStorePermissionRoles: () => Promise<void>;
  clearPermissionRolesData: () => void;
  // Fleet Owners Lookup State
  fleetOwnersData: any[] | null;
  fleetOwnersLastFetched: Date | null;
  fetchAndStoreFleetOwners: () => Promise<void>;
  clearFleetOwnersData: () => void;
  // Customer Fleet Lookup State
  customerFleetData: any[] | null;
  customerFleetLastFetched: Date | null;
  fetchAndStoreCustomerFleet: () => Promise<void>;
  clearCustomerFleetData: () => void;
  // Timezone List Lookup State
  timezoneListData: string[] | null;
  timezoneListLastFetched: Date | null;
  fetchAndStoreTimezoneList: () => Promise<void>;
  clearTimezoneListData: () => void;
  // Commodity Lookup State
  commoditiesData: any[] | null;
  commoditiesLastFetched: Date | null;
  fetchAndStoreCommodities: () => Promise<void>;
  clearCommoditiesData: () => void;
  // Chassis Lookup State
  chassisData: any[] | null;
  chassisLastFetched: Date | null;
  fetchAndStoreChassis: () => Promise<void>;
  clearChassisData: () => void;
  // Truck Lookup State
  trucksData: any[] | null;
  trucksLastFetched: Date | null;
  fetchAndStoreTrucks: () => Promise<void>;
  clearTrucksData: () => void;
  // Currency Lookup State
  currenciesData: any[] | null;
  currenciesLastFetched: Date | null;
  fetchAndStoreCurrencies: () => Promise<void>;
  clearCurrenciesData: () => void;

  CSRData: any[] | null;
  CSRLastFetched: Date | null;
  fetchAndStoreCSR: () => Promise<void>;
  clearCSRData: () => void;

  // Charge Codes Lookup State
  chargeCodesData: any[] | null;
  chargeCodesLastFetched: Date | null;
  fetchAndStoreChargeCodes: () => Promise<void>;
  clearChargeCodesData: () => void;

  // carrier id 
  storeCarrierId: (carrierId: string) => void;
  getCarrierId: () => string | null;
  clearCarrierId: () => void;

  // Driver Pay Groups Lookup State
  driverPayGroupsData: any[] | null;
  driverPayGroupsLastFetched: Date | null;
  fetchAndStoreDriverPayGroups: () => Promise<void>;
  clearDriverPayGroupsData: () => void;

  // City Groups Lookup State
  cityGroupsData: any[] | null;
  cityGroupsLastFetched: Date | null;
  fetchAndStoreCityGroups: () => Promise<void>;
  clearCityGroupsData: () => void;

  // Zip Code Groups Lookup State
  zipCodeGroupsData: any[] | null;
  zipCodeGroupsLastFetched: Date | null;
  fetchAndStoreZipCodeGroups: () => Promise<void>;
  clearZipCodeGroupsData: () => void;

  // export data
  selectedEntityId: string;
  exportConfig: any;
  isFetchingConfig: boolean;
  fieldMappings: any;
  setSelectedEntityId: Dispatch<SetStateAction<string>>;
  setExportConfig: SetStateAction<string | any>;
  setIsFetchingConfig: SetStateAction<string | any>;
  setFieldMappings: SetStateAction<string | any>;
  // Add new functions for export config management
  fetchExportConfig: () => Promise<void>;
  clearExportConfig: () => void;
  resetExportConfigOnNewFile: () => void;
  // Highlight edited cells
  datatableEditedCells: Set<string>;
  setDatatableEditedCells: React.Dispatch<React.SetStateAction<Set<string>>>;
};

export const AppContext = createContext<AppContextType | undefined>(undefined);

const AI_TOOL_DIALOG_IDS = [
  "correction",
  "enrichment",
  "reorder",
  "anomaly",
  "duplicate",
  "addressProcessing",
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Load initial state from localStorage if present
  function getInitialData() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(DATATABLE_DATA_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return [];
        }
      }
    }
    return [];
  }
  function getInitialColumns() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(DATATABLE_COLUMNS_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return [];
        }
      }
    }
    return [];
  }
  function getInitialChatHistory() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(CHATPANE_HISTORY_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return [];
        }
      }
    }
    return [];
  }
  function getInitialEditedCells() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(DATATABLE_EDITED_CELLS_KEY);
      if (stored) {
        try {
          const arr = JSON.parse(stored);
          if (Array.isArray(arr)) return new Set(arr);
        } catch {}
      }
    }
    return new Set();
  }
  function getInitialFileName() {
    if (typeof window !== "undefined") {
      return localStorage.getItem(FILENAME_STORAGE_KEY);
    }
    return null;
  }

  const [data, setDataState] = useState<Record<string, any>[]>(getInitialData);
  const [columns, setColumnsState] = useState<string[]>(getInitialColumns);
  const [fileName, setFileNameState] = useState<string | null>(getInitialFileName);
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [isLoadingState, setIsLoadingStateInner] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<
    { role: "user" | "model" | "system" | "tool"; content: string }[]
  >(getInitialChatHistory);
  const { data: session, status } = useSession();

  // Replace isAuthenticated and isAuthLoading with NextAuth session
  const isAuthenticated = status === "authenticated";
  const isAuthLoading = status === "loading";

  // export data state
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const [exportConfig, setExportConfig] = useState<ExportConfig | null>(null);
  const [isFetchingConfig, setIsFetchingConfig] = useState(false);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});

  // Chassis Lookups State
  const [chassisOwnersData, setChassisOwnersDataState] = useState<any[] | null>(
    null
  );
  const [chassisOwnersLastFetched, setChassisOwnersLastFetched] =
    useState<Date | null>(null);
  const [chassisSizesData, setChassisSizesDataState] = useState<any[] | null>(
    null
  );
  const [chassisSizesLastFetched, setChassisSizesLastFetched] =
    useState<Date | null>(null);
  const [chassisTypesData, setChassisTypesDataState] = useState<any[] | null>(
    null
  );
  const [chassisTypesLastFetched, setChassisTypesLastFetched] =
    useState<Date | null>(null);

  // Container Lookups State
  const [containerSizesData, setContainerSizesDataState] = useState<
    any[] | null
  >(null);
  const [containerSizesLastFetched, setContainerSizesLastFetched] =
    useState<Date | null>(null);
  const [containerTypesData, setContainerTypesDataState] = useState<
    any[] | null
  >(null);
  const [containerTypesLastFetched, setContainerTypesLastFetched] =
    useState<Date | null>(null);
  const [containerOwnersData, setContainerOwnersDataState] = useState<
    any[] | null
  >(null);
  const [containerOwnersLastFetched, setContainerOwnersLastFetched] =
    useState<Date | null>(null);

  // Branches Lookup State
  const [branchesData, setBranchesDataState] = useState<any[] | null>(null);
  const [branchesLastFetched, setBranchesLastFetched] = useState<Date | null>(
    null
  );

  // Driver Profile Types Lookup State
  const [driverProfileTypesData, setDriverProfileTypesData] = useState<
    string[] | null
  >(null);
  const [driverProfileTypesLastFetched, setDriverProfileTypesLastFetched] =
    useState<Date | null>(null);

  // Customer Lookup State
  const [customerData, setCustomerDataState] = useState<any[] | null>(null);
  const [customerLastFetched, setCustomerLastFetched] = useState<Date | null>(
    null
  );

  // Permission Lookup State
  const [permissionRolesData, setPermissionRolesData] = useState<any[] | null>(
    []
  );
  const [permissionRolesLastFetched, setPermissionRolesLastFetched] =
    useState<Date | null>(null);

  // Fleet Owners Lookup State
  const [fleetOwnersData, setFleetOwnersDataState] = useState<any[] | null>(
    null
  );
  const [fleetOwnersLastFetched, setFleetOwnersLastFetched] =
    useState<Date | null>(null);

  //Customer Fleet Lookup State
  const [customerFleetData, setCustomerFleetDataState] = useState<any[] | null>(
    null
  );
  const [customerFleetLastFetched, setCustomerFleetLastFetched] =
    useState<Date | null>(null);

  // Timezone List Lookup State
  const [timezoneListData, setTimezoneListData] = useState<string[] | null>(
    null
  );
  const [timezoneListLastFetched, setTimezoneListLastFetched] =
    useState<Date | null>(null);

  // Commodity Lookup State
  const [commoditiesData, setCommoditiesDataState] = useState<any[] | null>(
    null
  );
  const [commoditiesLastFetched, setCommoditiesLastFetched] =
    useState<Date | null>(null);

  // Chassis Lookup State
  const [chassisData, setChassisDataState] = useState<any[] | null>(null);
  const [chassisLastFetched, setChassisLastFetched] = useState<Date | null>(
    null
  );

  // Truck Lookup State
  const [trucksData, setTrucksDataState] = useState<any[] | null>(null);
  const [trucksLastFetched, setTrucksLastFetched] = useState<Date | null>(null);

  // CSR Lookup State
  const [CSRData, setCSRDataState] = useState<any[] | null>(null);
  const [CSRLastFetched, setCSRLastFetched] = useState<Date | null>(null);

  // Currency Lookup State
  const [currenciesData, setCurrenciesDataState] = useState<any[] | null>(null);
  const [currenciesLastFetched, setCurrenciesLastFetched] =
    useState<Date | null>(null);

  const [currentCompanyName, setCurrentCompanyName] = useState<string | null>(
    null
  );
  const [selectedAiProvider, setSelectedAiProvider] = useState<string | null>(
    null
  );
  const [selectedAiModelName, setSelectedAiModelName] = useState<string | null>(
    null
  );

  const [entityName, setEntityName] = useState<string | null>(null);

  // Charge Codes Lookup State
  const [chargeCodesData, setChargeCodesDataState] = useState<any[] | null>(null);
  const [chargeCodesLastFetched, setChargeCodesLastFetched] = useState<Date | null>(null);

  // State for tracking edited cells
  const [datatableEditedCells, setDatatableEditedCells] = useState<Set<string>>(getInitialEditedCells);

  // Driver Pay Groups Lookup State
  const [driverPayGroupsData, setDriverPayGroupsDataState] = useState<any[] | null>(null);
  const [driverPayGroupsLastFetched, setDriverPayGroupsLastFetched] = useState<Date | null>(null);

  // City Groups Lookup State
  const [cityGroupsData, setCityGroupsDataState] = useState<any[] | null>(null);
  const [cityGroupsLastFetched, setCityGroupsLastFetched] = useState<Date | null>(null);

  // Zip Code Groups Lookup State
  const [zipCodeGroupsData, setZipCodeGroupsDataState] = useState<any[] | null>(null);
  const [zipCodeGroupsLastFetched, setZipCodeGroupsLastFetched] = useState<Date | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentCompanyName(localStorage.getItem(AUTH_COMPANY_STORAGE_KEY));
      setSelectedAiProvider(localStorage.getItem(AI_PROVIDER_STORAGE_KEY));
      setSelectedAiModelName(localStorage.getItem(AI_MODEL_NAME_STORAGE_KEY));
      if (localStorage.getItem(ENTITY_NAME_STORAGE_KEY)) {
        setEntityName(localStorage.getItem(ENTITY_NAME_STORAGE_KEY));
      }
    }
  }, []);

  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  const [envKeys, setEnvKeys] = useState<Record<string, boolean>>({});

  const fetchEnvKeys = useCallback(async () => {
    try {
      const response = await fetch("/api/env-check");
      if (response.ok) {
        const keys = await response.json();
        setEnvKeys(keys);

        const storedProvider =
          typeof window !== "undefined"
            ? localStorage.getItem(AI_PROVIDER_STORAGE_KEY)
            : null;
        const storedModel =
          typeof window !== "undefined"
            ? localStorage.getItem(AI_MODEL_NAME_STORAGE_KEY)
            : null;

        if (
          storedProvider &&
          storedModel &&
          keys[storedProvider.toUpperCase() + "_API_KEY"]
        ) {
          setSelectedAiProvider(storedProvider);
          setSelectedAiModelName(storedModel);
        } else if (keys.GOOGLEAI_API_KEY) {
          setSelectedAiProvider(DEFAULT_AI_PROVIDER);
          setSelectedAiModelName(DEFAULT_AI_MODEL_NAME);
          if (typeof window !== "undefined") {
            localStorage.setItem(AI_PROVIDER_STORAGE_KEY, DEFAULT_AI_PROVIDER);
            localStorage.setItem(
              AI_MODEL_NAME_STORAGE_KEY,
              DEFAULT_AI_MODEL_NAME
            );
          }
        } else if (keys.OPENAI_API_KEY) {
          setSelectedAiProvider("openai");
          setSelectedAiModelName("gpt4oMini");
          if (typeof window !== "undefined") {
            localStorage.setItem(AI_PROVIDER_STORAGE_KEY, "openai");
            localStorage.setItem(AI_MODEL_NAME_STORAGE_KEY, "gpt4oMini");
          }
        } else if (keys.ANTHROPIC_API_KEY) {
          setSelectedAiProvider("anthropic");
          setSelectedAiModelName("claude-3-haiku-20240307");
          if (typeof window !== "undefined") {
            localStorage.setItem(AI_PROVIDER_STORAGE_KEY, "anthropic");
            localStorage.setItem(
              AI_MODEL_NAME_STORAGE_KEY,
              "claude-3-haiku-20240307"
            );
          }
        } else {
          setSelectedAiProvider(null);
          setSelectedAiModelName(null);
        }
      } else {
        console.error("Failed to fetch env key status");
        setSelectedAiProvider(null);
        setSelectedAiModelName(null);
      }
    } catch (error) {
      console.error("Error fetching env key status:", error);
      setSelectedAiProvider(null);
      setSelectedAiModelName(null);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentCompanyName(localStorage.getItem(AUTH_COMPANY_STORAGE_KEY));
    }
    fetchEnvKeys();
  }, [fetchEnvKeys]);

  useEffect(() => {
    if (!isAuthLoading) {
      if (!isAuthenticated && pathname !== "/login") {
        router.push("/login");
      } else if (isAuthenticated && pathname === "/login") {
        router.push("/");
      }
    }
  }, [isAuthenticated, isAuthLoading, pathname, router]);

  // Persist DataTable and ChatPane state to localStorage on change
  // useEffect(() => {
  //   if (typeof window !== "undefined") {
  //     localStorage.setItem(DATATABLE_DATA_KEY, JSON.stringify(data));
  //   }
  // }, [data]);
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(DATATABLE_COLUMNS_KEY, JSON.stringify(columns));
    }
  }, [columns]);
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(CHATPANE_HISTORY_KEY, JSON.stringify(chatHistory));
    }
  }, [chatHistory]);
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        DATATABLE_EDITED_CELLS_KEY,
        JSON.stringify(Array.from(datatableEditedCells))
      );
    }
  }, [datatableEditedCells]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (entityName) {
        localStorage.setItem(ENTITY_NAME_STORAGE_KEY, entityName);
      } else {
        localStorage.removeItem(ENTITY_NAME_STORAGE_KEY);
      }
    }
  }, [setEntityName, entityName]);

  // Persist currentCompanyName to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (currentCompanyName) {
        localStorage.setItem(AUTH_COMPANY_STORAGE_KEY, currentCompanyName);
      } else {
        localStorage.removeItem(AUTH_COMPANY_STORAGE_KEY);
      }
    }
  }, [currentCompanyName]);

  // Persist fileName to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (fileName) {
        localStorage.setItem(FILENAME_STORAGE_KEY, fileName);
      } else {
        localStorage.removeItem(FILENAME_STORAGE_KEY);
      }
    }
  }, [fileName]);

  // Add function to reset export configuration when new file is uploaded
  const resetExportConfigOnNewFile = useCallback(() => {
    // Clear field mappings and validation state
    setFieldMappings({});
    setSelectedEntityId("");
    // Clear the export config itself to force refetch
    setExportConfig(null);
    setIsFetchingConfig(false);
    
    // Clear localStorage for validation state
    clearAllExportState();
  }, []);

  // Simplified setData: only updates data rows. Column updates must be handled separately by callers.
  const setData = useCallback((newData: Record<string, any>[]) => {
    setDataState(newData);
    
    // Always reset export configuration when new file is uploaded
    resetExportConfigOnNewFile();
  }, [resetExportConfigOnNewFile]);

  // Simplified setColumns: only updates column list.
  const setColumns = useCallback((newColumns: string[]) => {
    setColumnsState(newColumns);
  }, []);

  const setFileName = useCallback((name: string | null) => {
    setFileNameState(name);
  }, []);

  const openDialog = useCallback(
    (dialogName: string) => {
      if (AI_TOOL_DIALOG_IDS.includes(dialogName) && pathname !== "/") {
        router.push("/");
      }
      setActiveDialog(dialogName);
    },
    [pathname, router]
  );

  const closeDialog = useCallback(() => {
    setActiveDialog(null);
  }, []);

  const setIsLoading = useCallback((loading: boolean) => {
    setIsLoadingStateInner(loading);
  }, []);

  const showToast = useCallback(
    (options: {
      title: string;
      description?: string;
      variant?: ToastProps["variant"];
      duration?: number;
    }) => {
      toast({ ...options, duration: options.duration || 5000 });
    },
    [toast]
  );

  const addChatMessage = useCallback(
    (message: { role: "user" | "model" | "system" | "tool"; content: string }) => {
      setChatHistory((prev) => [...prev, message]);
    },
    []
  );

  const clearChatHistory = useCallback(() => {
    setChatHistory([]);
  }, []);

  const clearApiToken = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    }
  }, []);

  const clearCarrierId = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CARRIER_ID_STORAGE_KEY);
    }
  }, []);
  
  const login = useCallback(() => {
    signIn("google");
    return true;
  }, []);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      clearCarrierId();
      localStorage.removeItem(DATATABLE_DATA_KEY);
      localStorage.removeItem(DATATABLE_COLUMNS_KEY);
      localStorage.removeItem(CHATPANE_HISTORY_KEY);
      localStorage.removeItem(DATATABLE_EDITED_CELLS_KEY);
      localStorage.removeItem(FILENAME_STORAGE_KEY);
    }
    signOut();
  }, []);

  const storeApiToken = useCallback(
    (token: string, companyName?: string | null) => {
      if (typeof window !== "undefined")
        localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
      if (companyName) {
        setCurrentCompanyName(companyName);
      } else {
        setCurrentCompanyName(null);
      }
    },
    [setCurrentCompanyName]
  );

  const getApiToken = useCallback(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    }
    return null;
  }, []);

  
  const storeCarrierId = useCallback((carrierId: string) => {
    if (typeof window !== 'undefined') localStorage.setItem(CARRIER_ID_STORAGE_KEY, carrierId);
  }, []);

  const getCarrierId = useCallback(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(CARRIER_ID_STORAGE_KEY);
    }
    return null;
  }, []);

  
  const getEnvKeys = useCallback(() => envKeys, [envKeys]);

  const genericFetchLookupData = async (
    endpoint: string,
    dataSetter: React.Dispatch<React.SetStateAction<any[] | null>>,
    lastFetchedSetter: React.Dispatch<React.SetStateAction<Date | null>>,
    lookupName: string,
    fieldsToKeep?: string[]
  ) => {
    const token = getApiToken();
    if (!token) {
      showToast({
        title: "Authentication Required",
        description: `API token is missing for ${lookupName}. Please set it on the API Auth page.`,
        variant: "destructive",
        duration: 7000,
      });
      return;
    }
    setIsLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URI;
      const fullUrl = `${baseUrl}${endpoint}`;
      console.log(
        `Fetching ${lookupName} from: ${fullUrl} with token: Bearer ${
          token ? token.substring(0, 10) + "..." : "MISSING"
        }`
      );
      const response = await fetch(fullUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json, text/plain, */*",
        },
      });
      console.log(
        `${lookupName} API Response Status:`,
        response.status,
        response.statusText
      );

      if (!response.ok) {
        let errorData = {
          message: `API Error: ${response.status} ${response.statusText}`,
        };
        try {
          const errorText = await response.text();
          console.error(`${lookupName} API Error Response Text:`, errorText);
          errorData = JSON.parse(errorText);
        } catch (e) {
          console.error(
            `${lookupName} API Error: Could not parse error response or response was not JSON.`
          );
        }
        throw new Error(
          errorData.message ||
            `Failed to fetch ${lookupName}: HTTP ${response.status}`
        );
      }

      const resultData = await response.json();
      console.log(
        `${lookupName} API Success Response Body (raw):`,
        JSON.parse(JSON.stringify(resultData))
      );

      let items: any[] = [];
      if (Array.isArray(resultData)) {
        console.log(
          `${lookupName}: Response is direct array with ${resultData.length} items`
        );
        items = resultData;
      } else if (resultData && typeof resultData === "object") {
        // Handle double-nested data structure (data.data)
        if (resultData.data && resultData.data.data && Array.isArray(resultData.data.data)) {
          console.log(
            `${lookupName}: Found double-nested data array with ${resultData.data.data.length} items`
          );
          items = resultData.data.data;
        } else if (resultData.data && Array.isArray(resultData.data)) {
          console.log(
            `${lookupName}: Found data array with ${resultData.data.length} items`
          );
          items = resultData.data;
        } else {
          console.log(
            `${lookupName}: Looking for array property in response object...`
          );
          const arrayProperty = Object.values(resultData).find(Array.isArray);
          if (arrayProperty) {
            console.log(
              `${lookupName}: Found array property with ${arrayProperty.length} items`
            );
            items = arrayProperty as any[];
          } else {
            console.warn(
              `${lookupName}: API response is an object but does not contain a 'data' array or any other top-level array.`
            );
            console.warn(
              `${lookupName}: Response object keys:`,
              Object.keys(resultData)
            );
            // Check if it's a single object that should be wrapped in an array
            if (
              typeof resultData === "object" &&
              resultData !== null &&
              Object.keys(resultData).length > 0
            ) {
              console.log(
                `${lookupName}: Treating single object as array with 1 item`
              );
              items = [resultData];
            } else {
              items = [];
            }
          }
        }
      } else {
        console.warn(
          `${lookupName}: Unexpected API response format. Expected array or object with a data array.`
        );
        items = [];
      }

      console.log(
        `${lookupName}: Extracted ${items.length} items before field filtering`
      );

      let finalItemsToStore = items;
      if (fieldsToKeep && fieldsToKeep.length > 0 && items.length > 0) {
        console.log(`${lookupName}: Filtering fields to keep:`, fieldsToKeep);
        finalItemsToStore = items
          .map((item) => {
            const newItem: Record<string, any> = {};
            let hasAtLeastOneField = false;
            fieldsToKeep.forEach((fieldKey) => {
              if (item.hasOwnProperty(fieldKey)) {
                newItem[fieldKey] = item[fieldKey];
                hasAtLeastOneField = true;
              }
            });
            // If _id is requested but not found directly, and 'id' exists, map 'id' to '_id'.
            if (
              fieldsToKeep.includes("_id") &&
              !newItem.hasOwnProperty("_id") &&
              item.hasOwnProperty("id")
            ) {
              newItem["_id"] = item["id"];
              hasAtLeastOneField = true;
            }
            return hasAtLeastOneField ? newItem : null;
          })
          .filter((item) => item !== null) as any[];
        console.log(
          `${lookupName}: After field filtering: ${finalItemsToStore.length} items`
        );
      }

      console.log(
        `${lookupName} Final items to store (${finalItemsToStore.length}):`,
        JSON.parse(JSON.stringify(finalItemsToStore.slice(0, 3)))
      ); // Log first 3 processed

      // Set the data
      console.log(`${lookupName}: Setting data in state...`);
      dataSetter(finalItemsToStore);
      lastFetchedSetter(new Date());

      console.log(`${lookupName}: Data set successfully in state`);
      showToast({
        title: "Success",
        description: `${
          finalItemsToStore.length
        } ${lookupName.toLowerCase()} fetched and cached.`,
      });
    } catch (error: any) {
      console.error(`Error fetching ${lookupName}:`, error);
      let description = error.message || `Could not fetch ${lookupName}.`;
      if (
        error.message &&
        error.message.toLowerCase().includes("failed to fetch")
      ) {
        description +=
          " This might be a network issue or a CORS problem. Check the browser console and network tab for more details.";
      }
      showToast({
        title: `Fetch Error (${lookupName})`,
        description,
        variant: "destructive",
        duration: 7000,
      });
      dataSetter(null);
      lastFetchedSetter(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Chassis Lookups
  const fetchAndStoreChassisOwners = useCallback(async () => {
    await genericFetchLookupData(
      "/carrier/getTMSChassisOwner",
      setChassisOwnersDataState,
      setChassisOwnersLastFetched,
      "Chassis Owners",
      ["company_name", "_id"]
    );
  }, [getApiToken, setIsLoading, showToast]);

  const clearChassisOwnersData = useCallback(() => {
    setChassisOwnersDataState(null);
    setChassisOwnersLastFetched(null);
    showToast({
      title: "Cache Cleared",
      description: "Chassis owner data has been cleared.",
    });
  }, [showToast]);

  const fetchAndStoreChassisSizes = useCallback(async () => {
    await genericFetchLookupData(
      "/admin/getChassisSize",
      setChassisSizesDataState,
      setChassisSizesLastFetched,
      "Chassis Sizes",
      ["name", "_id"]
    );
  }, [getApiToken, setIsLoading, showToast]);

  const clearChassisSizesData = useCallback(() => {
    setChassisSizesDataState(null);
    setChassisSizesLastFetched(null);
    showToast({
      title: "Cache Cleared",
      description: "Chassis size data has been cleared.",
    });
  }, [showToast]);

  const fetchAndStoreChassisTypes = useCallback(async () => {
    await genericFetchLookupData(
      "/admin/getChassisType",
      setChassisTypesDataState,
      setChassisTypesLastFetched,
      "Chassis Types",
      ["name", "_id"]
    );
  }, [getApiToken, setIsLoading, showToast]);

  const clearChassisTypesData = useCallback(() => {
    setChassisTypesDataState(null);
    setChassisTypesLastFetched(null);
    showToast({
      title: "Cache Cleared",
      description: "Chassis type data has been cleared.",
    });
  }, [showToast]);

  // Container Lookups
  const fetchAndStoreContainerSizes = useCallback(async () => {
    await genericFetchLookupData(
      "/admin/getContainerSize",
      setContainerSizesDataState,
      setContainerSizesLastFetched,
      "Container Sizes",
      ["name", "_id"]
    );
  }, [getApiToken, setIsLoading, showToast]);

  const clearContainerSizesData = useCallback(() => {
    setContainerSizesDataState(null);
    setContainerSizesLastFetched(null);
    showToast({
      title: "Cache Cleared",
      description: "Container size data has been cleared.",
    });
  }, [showToast]);

  const fetchAndStoreContainerTypes = useCallback(async () => {
    await genericFetchLookupData(
      "/admin/getContainerType",
      setContainerTypesDataState,
      setContainerTypesLastFetched,
      "Container Types",
      ["name", "_id"]
    );
  }, [getApiToken, setIsLoading, showToast]);

  const clearContainerTypesData = useCallback(() => {
    setContainerTypesDataState(null);
    setContainerTypesLastFetched(null);
    showToast({
      title: "Cache Cleared",
      description: "Container type data has been cleared.",
    });
  }, [showToast]);

  const fetchAndStoreContainerOwners = useCallback(async () => {
    await genericFetchLookupData(
      "/carrier/getTMSContainerOwner",
      setContainerOwnersDataState,
      setContainerOwnersLastFetched,
      "Container Owners",
      ["company_name", "_id"]
    );
  }, [getApiToken, setIsLoading, showToast]);

  const clearContainerOwnersData = useCallback(() => {
    setContainerOwnersDataState(null);
    setContainerOwnersLastFetched(null);
    showToast({
      title: "Cache Cleared",
      description: "Container owner data has been cleared.",
    });
  }, [showToast]);

  // Branches Lookup
  const fetchAndStoreBranches = useCallback(async () => {
    await genericFetchLookupData(
      "/getTerminal",
      setBranchesDataState,
      setBranchesLastFetched,
      "Branches",
      ["name", "_id"]
    );
  }, [getApiToken, setIsLoading, showToast]);

  const clearBranchesData = useCallback(() => {
    setBranchesDataState(null);
    setBranchesLastFetched(null);
    showToast({
      title: "Cache Cleared",
      description: "Branches data has been cleared.",
    });
  }, [showToast]);

  // Driver Profile Types Lookup (static)
  const fetchAndStoreDriverProfileTypes = useCallback(async () => {
    setDriverProfileTypesData(driverProfileTypes);
    setDriverProfileTypesLastFetched(new Date());
    showToast({
      title: "Success",
      description: `${driverProfileTypes.length} driver profile types loaded.`,
    });
  }, []);

  const clearDriverProfileTypesData = useCallback(() => {
    setDriverProfileTypesData(null);
    setDriverProfileTypesLastFetched(null);
    showToast({
      title: "Cache Cleared",
      description: "Driver profile types data has been cleared.",
    });
  }, [showToast]);

  // Customer Lookup (API-based)
  const fetchAndStoreCustomer = useCallback(async () => {
    try {
      await genericFetchLookupData(
        "/carrier/getTMSCustomers",
        setCustomerDataState,
        setCustomerLastFetched,
        "Customer",
        ["_id", "type", "company_name", "city", "state", "address1", "country", "zip_code", "address"]
      );
    } catch (error) {
      console.error("Error fetching customer data:", error);
    }
  }, [getApiToken, setIsLoading, showToast]);

  const clearCustomerData = useCallback(() => {
    setCustomerDataState(null);
    setCustomerLastFetched(null);
    showToast({
      title: "Cache Cleared",
      description: "Customer data has been cleared.",
    });
  }, [showToast]);

  // Permission Roles Lookup (API-based)
  const fetchAndStorePermissionRoles = useCallback(async () => {
    try {
      await genericFetchLookupData(
        "/tms/getPermissionRoles?isDeleted=false",
        setPermissionRolesData,
        setPermissionRolesLastFetched,
        "Permission",
        ["_id", "roleName"]
      );
    } catch (error) {
      console.error("Error fetching permission roles:", error);
    }
  }, [getApiToken, setIsLoading, showToast]);

  const clearPermissionRolesData = useCallback(() => {
    setCustomerDataState(null);
    setCustomerLastFetched(null);
    showToast({
      title: "Cache Cleared",
      description: "Customer data has been cleared.",
    });
  }, [showToast]);

  // Fleet Owners Lookup (API-based)
  const fetchAndStoreFleetOwners = useCallback(async () => {
    await genericFetchLookupData(
      "/tms/getFleetTruckOwner",
      setFleetOwnersDataState,
      setFleetOwnersLastFetched,
      "Fleet Owners",
      ["_id", "company_name"]
    );
  }, [getApiToken, setIsLoading, showToast]);

  const clearFleetOwnersData = useCallback(() => {
    setFleetOwnersDataState(null);
    setFleetOwnersLastFetched(null);
    showToast({
      title: "Cache Cleared",
      description: "Fleet owners data has been cleared.",
    });
  }, [showToast]);

  // Customer Fleet Lookup
  const fetchAndStoreCustomerFleet = useCallback(async () => {
    try {
      await genericFetchLookupData(
        "/tms/getTMSFleetCustomers",
        setCustomerFleetDataState,
        setCustomerFleetLastFetched,
        "Customer Fleet",
        ["_id", "company_name"]
      );
    } catch (error) {
      console.error("Error fetching customer fleet data:", error);
    }
  }, [getApiToken, setIsLoading, showToast]);
  const clearCustomerFleetData = useCallback(() => {
    setCustomerFleetDataState(null);
    setCustomerFleetLastFetched(null);
    showToast({
      title: "Cache Cleared",
      description: "Customer fleet data has been cleared.",
    });
  }, [showToast]);

  // Timezone List Lookup (static)
  const fetchAndStoreTimezoneList = useCallback(async () => {
    setTimezoneListData(timezoneList);
    setTimezoneListLastFetched(new Date());
    showToast({
      title: "Success",
      description: `${timezoneList.length} timezones loaded.`,
    });
  }, []);

  const clearTimezoneListData = useCallback(() => {
    setTimezoneListData(null);
    setTimezoneListLastFetched(null);
    showToast({
      title: "Cache Cleared",
      description: "Timezone list data has been cleared.",
    });
  }, [showToast]);

  // Commodity Lookup (API-based)
  const fetchAndStoreCommodities = useCallback(async () => {
    await genericFetchLookupData(
      "/tms/getCommodityProfile",
      setCommoditiesDataState,
      setCommoditiesLastFetched,
      "Commodities",
      ["name", "_id"]
    );
  }, [getApiToken, setIsLoading, showToast]);

  const clearCommoditiesData = useCallback(() => {
    setCommoditiesDataState(null);
    setCommoditiesLastFetched(null);
    showToast({
      title: "Cache Cleared",
      description: "Commodities data has been cleared.",
    });
  }, [showToast]);

  // Chassis Lookup (API-based)
  const fetchAndStoreChassis = useCallback(async () => {
    await genericFetchLookupData(
      "/carrier/getTMSChassis",
      setChassisDataState,
      setChassisLastFetched,
      "Chassis",
      ["_id", "chassisNo"]
    );
  }, [getApiToken, setIsLoading, showToast]);

  const clearChassisData = useCallback(() => {
    setChassisDataState(null);
    setChassisLastFetched(null);
    showToast({
      title: "Cache Cleared",
      description: "Chassis data has been cleared.",
    });
  }, [showToast]);

  // Truck Lookup (API-based)
  const fetchAndStoreTrucks = useCallback(async () => {
    await genericFetchLookupData(
      "/carrier/getTMSEquipments",
      setTrucksDataState,
      setTrucksLastFetched,
      "Trucks",
      ["_id", "equipmentID"]
    );
  }, [getApiToken, setIsLoading, showToast]);

  const clearTrucksData = useCallback(() => {
    setTrucksDataState(null);
    setTrucksLastFetched(null);
    showToast({
      title: "Cache Cleared",
      description: "Trucks data has been cleared.",
    });
  }, [showToast]);

  // Driver Pay Group Lookup (API-based)
  const fetchAndStoreDriverPayGroups = useCallback(async () => {
    await genericFetchLookupData('/rate-engine/vendor-rate/charge-profile-groups?skip=0&limit=30&&vendorType=driver', setDriverPayGroupsDataState, setDriverPayGroupsLastFetched, 'Driver Pay Groups', ['_id', 'name']);
  }, [getApiToken, setIsLoading, showToast]);
  const clearDriverPayGroupsData = useCallback(() => {
    setDriverPayGroupsDataState(null);
    setDriverPayGroupsLastFetched(null);
    showToast({ title: 'Cache Cleared', description: 'Driver pay groups data has been cleared.' });
  }, [showToast]);

  // City Groups Lookup (API-based)
  const fetchAndStoreCityGroups = useCallback(async () => {
    const carrierId = getCarrierId();
    if (!carrierId) {
      showToast({ title: 'Carrier ID Missing', description: 'Please set a carrier ID before fetching city groups.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URI;
      const fullUrl = `${baseUrl}/getFleetCarrier?carrier=${carrierId}`;
      const token = getApiToken();
      const response = await fetch(fullUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json, text/plain, */*",
        },
      });
      const result = await response.json();
      setCityGroupsDataState(
        result?.data?.groupedCities?.map(({ _id, name }: { _id: string; name: string }) => ({ _id, name })) || []
      );
      setCityGroupsLastFetched(new Date());
      showToast({
        title: "Success",
        description: `${result?.data?.groupedCities?.length || 0} city groups fetched and cached.`,
      });
    } catch (error: any) {
      showToast({
        title: "Fetch Error (City Groups)",
        description: error.message || "Failed to fetch city groups.",
        variant: "destructive",
      });
      setCityGroupsDataState(null);
      setCityGroupsLastFetched(null);
    } finally {
      setIsLoading(false);
    }
  }, [getApiToken, setIsLoading, showToast, getCarrierId]);

  const clearCityGroupsData = useCallback(() => {
    setCityGroupsDataState(null);
    setCityGroupsLastFetched(null);
    showToast({ title: 'Cache Cleared', description: 'City groups data has been cleared.' });
  }, [showToast]);

  // Zip Code Groups Lookup (API-based)
  const fetchAndStoreZipCodeGroups = useCallback(async () => {
    const carrierId = getCarrierId();
    if (!carrierId) {
      showToast({ title: 'Carrier ID Missing', description: 'Please set a carrier ID before fetching zip code groups.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URI;
      const fullUrl = `${baseUrl}/getFleetCarrier?carrier=${carrierId}`;
      const token = getApiToken();
      const response = await fetch(fullUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json, text/plain, */*",
        },
      });
      const result = await response.json();
      setZipCodeGroupsDataState(
        result?.data?.groupedZipcodes?.map(({ _id, name }: { _id: string; name: string }) => ({ _id, name })) || []
      );
      setZipCodeGroupsLastFetched(new Date());
      showToast({
        title: "Success",
        description: `${result?.data?.groupedZipcodes?.length || 0} zip code groups fetched and cached.`,
      });
    } catch (error: any) {
      showToast({
        title: "Fetch Error (Zip Code Groups)",
        description: error.message || "Failed to fetch zip code groups.",
        variant: "destructive",
      });
      setZipCodeGroupsDataState(null);
      setZipCodeGroupsLastFetched(null);
    } finally {
      setIsLoading(false);
    }
  }, [getApiToken, setIsLoading, showToast, getCarrierId]);

  const clearZipCodeGroupsData = useCallback(() => {
    setZipCodeGroupsDataState(null);
    setZipCodeGroupsLastFetched(null);
    showToast({ title: 'Cache Cleared', description: 'Zip code groups data has been cleared.' });
  }, [showToast]);

  // Currency Lookup (API-based)
  const fetchAndStoreCurrencies = useCallback(async () => {
    await genericFetchLookupData(
      "/currency",
      setCurrenciesDataState,
      setCurrenciesLastFetched,
      "Currencies",
      ["_id", "currencyCode"]
    );
  }, [getApiToken, setIsLoading, showToast]);

  const clearCurrenciesData = useCallback(() => {
    setCurrenciesDataState(null);
    setCurrenciesLastFetched(null);
    showToast({
      title: "Cache Cleared",
      description: "Currencies data has been cleared.",
    });
  }, [showToast]);

  // CSR Lookups (API-based)
  const fetchAndStoreCSR = useCallback(async () => {
    const token = getApiToken();
    if (!token) {
      showToast({
        title: "Authentication Required",
        description: "API token is missing for CSR. Please set it on the API Auth page.",
        variant: "destructive",
        duration: 7000,
      });
      return;
    }
    setIsLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URI;
      const fullUrl = `${baseUrl}/carrier/getFleetManagers`;
      console.log(
        `Fetching CSR from: ${fullUrl} with token: Bearer ${
          token ? token.substring(0, 10) + "..." : "MISSING"
        }`
      );
      const response = await fetch(fullUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json, text/plain, */*",
        },
      });
      console.log(
        `CSR API Response Status:`,
        response.status,
        response.statusText
      );

      if (!response.ok) {
        let errorData = {
          message: `API Error: ${response.status} ${response.statusText}`,
        };
        try {
          const errorText = await response.text();
          console.error(`CSR API Error Response Text:`, errorText);
          errorData = JSON.parse(errorText);
        } catch (e) {
          console.error(
            `CSR API Error: Could not parse error response or response was not JSON.`
          );
        }
        throw new Error(
          errorData.message ||
            `Failed to fetch CSR: HTTP ${response.status}`
        );
      }

      const resultData = await response.json();
      console.log(
        `CSR API Success Response Body (raw):`,
        JSON.parse(JSON.stringify(resultData))
      );

      let items: any[] = [];
      if (Array.isArray(resultData)) {
        console.log(
          `CSR: Response is direct array with ${resultData.length} items`
        );
        items = resultData;
      } else if (resultData && typeof resultData === "object") {
        // Handle double-nested data structure (data.data)
        if (resultData.data && resultData.data.data && Array.isArray(resultData.data.data)) {
          console.log(
            `CSR: Found double-nested data array with ${resultData.data.data.length} items`
          );
          items = resultData.data.data;
        } else if (resultData.data && Array.isArray(resultData.data)) {
          console.log(
            `CSR: Found data array with ${resultData.data.length} items`
          );
          items = resultData.data;
        } else {
          console.log(
            `CSR: Looking for array property in response object...`
          );
          const arrayProperty = Object.values(resultData).find(Array.isArray);
          if (arrayProperty) {
            console.log(
              `CSR: Found array property with ${arrayProperty.length} items`
            );
            items = arrayProperty as any[];
          } else {
            console.warn(
              `CSR: API response is an object but does not contain a 'data' array or any other top-level array.`
            );
            console.warn(
              `CSR: Response object keys:`,
              Object.keys(resultData)
            );
            // Check if it's a single object that should be wrapped in an array
            if (
              typeof resultData === "object" &&
              resultData !== null &&
              Object.keys(resultData).length > 0
            ) {
              console.log(
                `CSR: Treating single object as array with 1 item`
              );
              items = [resultData];
            } else {
              items = [];
            }
          }
        }
      } else {
        console.warn(
          `CSR: Unexpected API response format. Expected array or object with a data array.`
        );
        items = [];
      }

      console.log(
        `CSR: Extracted ${items.length} items before filtering`
      );

      // Filter for records where fleetManager.CSR is true and extract only _id and name
      const finalItemsToStore = items
        .filter((item) => {
          // Check if the item has fleetManager and fleetManager.CSR is true
          return item.fleetManager && item.fleetManager.CSR === true;
        })
        .map((item) => ({
          _id: item._id,
          name: item.name
        }));

      console.log(
        `CSR Final items to store (${finalItemsToStore.length}):`,
        JSON.parse(JSON.stringify(finalItemsToStore.slice(0, 3)))
      ); // Log first 3 processed

      // Set the data
      console.log(`CSR: Setting data in state...`);
      setCSRDataState(finalItemsToStore);
      setCSRLastFetched(new Date());

      console.log(`CSR: Data set successfully in state`);
      showToast({
        title: "Success",
        description: `${
          finalItemsToStore.length
        } CSR records fetched and cached.`,
      });
    } catch (error: any) {
      console.error(`Error fetching CSR:`, error);
      let description = error.message || `Could not fetch CSR.`;
      if (
        error.message &&
        error.message.toLowerCase().includes("failed to fetch")
      ) {
        description +=
          " This might be a network issue or a CORS problem. Check the browser console and network tab for more details.";
      }
      showToast({
        title: `Fetch Error (CSR)`,
        description,
        variant: "destructive",
        duration: 7000,
      });
      setCSRDataState(null);
      setCSRLastFetched(null);
    } finally {
      setIsLoading(false);
    }
  }, [getApiToken, setIsLoading, showToast]);

  const clearCSRData = useCallback(() => {
    setCSRDataState(null);
    setCSRLastFetched(null);
    showToast({
      title: "Cache Cleared",
      description: "CSR data has been cleared.",
    });
  }, [showToast]);

  // Charge Codes Lookup (API-based)
  const fetchAndStoreChargeCodes = useCallback(async () => {
    await genericFetchLookupData('/chargeCode/getChargeCode', setChargeCodesDataState, setChargeCodesLastFetched, 'Charge Codes', ['_id', 'value', 'chargeName', 'isPrimary', 'isActive']);
  }, [getApiToken, setIsLoading, showToast]);

  const clearChargeCodesData = useCallback(() => {
    setChargeCodesDataState(null);
    setChargeCodesLastFetched(null);
    showToast({ title: 'Cache Cleared', description: 'Charge codes data has been cleared.' });
  }, [showToast]);

  // Clear all lookup data function
  const clearAllLookupData = useCallback(() => {
    // Clear all chassis-related data
    setChassisOwnersDataState(null);
    setChassisOwnersLastFetched(null);
    setChassisSizesDataState(null);
    setChassisSizesLastFetched(null);
    setChassisTypesDataState(null);
    setChassisTypesLastFetched(null);
    // Clear all container-related data
    setContainerSizesDataState(null);
    setContainerSizesLastFetched(null);
    setContainerTypesDataState(null);
    setContainerTypesLastFetched(null);
    setContainerOwnersDataState(null);
    setContainerOwnersLastFetched(null);
    // Clear other lookup data
    setBranchesDataState(null);
    setBranchesLastFetched(null);
    setDriverProfileTypesData(null);
    setDriverProfileTypesLastFetched(null);
    setCustomerDataState(null);
    setCustomerLastFetched(null);
    setPermissionRolesData(null);
    setPermissionRolesLastFetched(null);
    setFleetOwnersDataState(null);
    setFleetOwnersLastFetched(null);
    setCustomerFleetDataState(null);
    setCustomerFleetLastFetched(null);
    setTimezoneListData(null);
    setTimezoneListLastFetched(null);
    setCommoditiesDataState(null);
    setCommoditiesLastFetched(null);
    setChassisDataState(null);
    setChassisLastFetched(null);
    setTrucksDataState(null);
    setTrucksLastFetched(null);
    setCurrenciesDataState(null);
    setCurrenciesLastFetched(null);
    setDriverPayGroupsDataState(null);
    setDriverPayGroupsLastFetched(null);
    setCityGroupsDataState(null);
    setCityGroupsLastFetched(null);
    setZipCodeGroupsDataState(null);
    setZipCodeGroupsLastFetched(null);
    setCSRDataState(null);
    setCSRLastFetched(null);
    setChargeCodesDataState(null);
    setChargeCodesLastFetched(null);

    console.log("All lookup data cleared");
  }, []);

  const fetchExportConfig = useCallback(async () => {
    // Don't fetch if already loaded
    if (exportConfig) {
      return;
    }

    setIsFetchingConfig(true);
    try {
      const response = await fetch("/api/export-entities");
      if (!response.ok) {
        throw new Error("Failed to fetch entities configuration");
      }
      const config: ExportConfig = await response.json();
      setExportConfig(config);
      
      // Set default selected entity if none is selected
      if (config.entities.length > 0 && !selectedEntityId) {
        setSelectedEntityId(config.entities[0].id);
      }
    } catch (error) {
      console.error("Error fetching entities config:", error);
      setExportConfig({ baseUrl: "", entities: [] });
      setSelectedEntityId("");
    } finally {
      setIsFetchingConfig(false);
    }
  }, [exportConfig, selectedEntityId]);

  const clearExportConfig = useCallback(() => {
    setExportConfig(null);
    setSelectedEntityId("");
    setFieldMappings({});
    setIsFetchingConfig(false);
  }, []);

  return (
    <AppContext.Provider
      value={{
        data,
        setData,
        columns,
        setColumns,
        fileName,
        entityName,
        setEntityName,
        setFileName,
        activeDialog,
        openDialog,
        closeDialog,
        isLoading: isLoadingState,
        setIsLoading,
        showToast,
        chatHistory,
        setChatHistory,
        addChatMessage,
        clearChatHistory,
        isAuthenticated,
        login,
        logout,
        isAuthLoading,
        currentCompanyName,
        setCurrentCompanyName,
        storeApiToken,
        clearApiToken,
        getApiToken,
        storeCarrierId,
        getCarrierId,
        clearCarrierId,
        selectedAiProvider,
        setSelectedAiProvider,
        selectedAiModelName,
        setSelectedAiModelName,
        getEnvKeys,
        // Lookup data management
        clearAllLookupData,
        // Chassis Lookups
        chassisOwnersData,
        chassisOwnersLastFetched,
        fetchAndStoreChassisOwners,
        clearChassisOwnersData,
        chassisSizesData,
        chassisSizesLastFetched,
        fetchAndStoreChassisSizes,
        clearChassisSizesData,
        chassisTypesData,
        chassisTypesLastFetched,
        fetchAndStoreChassisTypes,
        clearChassisTypesData,
        // Container Lookups
        containerSizesData,
        containerSizesLastFetched,
        fetchAndStoreContainerSizes,
        clearContainerSizesData,
        containerTypesData,
        containerTypesLastFetched,
        fetchAndStoreContainerTypes,
        clearContainerTypesData,
        containerOwnersData,
        containerOwnersLastFetched,
        fetchAndStoreContainerOwners,
        clearContainerOwnersData,
        // Branches Lookup
        branchesData,
        branchesLastFetched,
        fetchAndStoreBranches,
        clearBranchesData,
        // Driver Profile Types Lookup
        driverProfileTypesData,
        driverProfileTypesLastFetched,
        fetchAndStoreDriverProfileTypes,
        clearDriverProfileTypesData,
        // Customer Lookup
        customerData,
        customerLastFetched,
        fetchAndStoreCustomer,
        clearCustomerData,
        // Permission Roles Lookup
        permissionRolesData,
        permissionRolesLastFetched,
        fetchAndStorePermissionRoles,
        clearPermissionRolesData,
        // Fleet Owners Lookup
        fleetOwnersData,
        fleetOwnersLastFetched,
        fetchAndStoreFleetOwners,
        clearFleetOwnersData,
        // Customer Fleet Lookup
        customerFleetData,
        customerFleetLastFetched,
        fetchAndStoreCustomerFleet,
        clearCustomerFleetData,
        // Timezone List Lookup
        timezoneListData,
        timezoneListLastFetched,
        fetchAndStoreTimezoneList,
        clearTimezoneListData,
        // Commodity Lookup
        commoditiesData,
        commoditiesLastFetched,
        fetchAndStoreCommodities,
        clearCommoditiesData,
        // Chassis Lookup
        chassisData,
        chassisLastFetched,
        fetchAndStoreChassis,
        clearChassisData,
        // Truck Lookup
        trucksData,
        trucksLastFetched,
        fetchAndStoreTrucks,
        clearTrucksData,
        // Currency Lookup
        currenciesData,
        currenciesLastFetched,
        fetchAndStoreCurrencies,
        clearCurrenciesData,
        // Charge Codes Lookup
        chargeCodesData,
        chargeCodesLastFetched,
        fetchAndStoreChargeCodes,
        clearChargeCodesData,
        // Driver Pay Groups Lookup
        driverPayGroupsData,
        driverPayGroupsLastFetched,
        fetchAndStoreDriverPayGroups,
        clearDriverPayGroupsData,
        // City Groups Lookup
        cityGroupsData,
        cityGroupsLastFetched,
        fetchAndStoreCityGroups,
        clearCityGroupsData,
        // Zip Code Groups Lookup
        zipCodeGroupsData,
        zipCodeGroupsLastFetched,
        fetchAndStoreZipCodeGroups,
        clearZipCodeGroupsData,
        // CSR Lookup
        CSRData,
        CSRLastFetched,
        fetchAndStoreCSR,
        clearCSRData,

        // export data
        selectedEntityId,
        exportConfig,
        isFetchingConfig,
        fieldMappings,
        setSelectedEntityId,
        setExportConfig,
        setIsFetchingConfig,
        setFieldMappings,
        fetchExportConfig,
        clearExportConfig,
        resetExportConfigOnNewFile,
        datatableEditedCells,
        setDatatableEditedCells,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
