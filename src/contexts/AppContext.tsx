"use client";

import type React from "react";
import {
  createContext,
  useState,
  useCallback,
  useEffect,
  Dispatch,
  SetStateAction,
  useRef,
} from "react";
import { useToast } from "@/hooks/use-toast";
import type { ToastProps } from "@/components/ui/toast";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import driverProfileTypes from "@/static/driverProfileTypes.json";
import timezoneList from "@/static/timezoneList.json";
import { ExportConfig } from "@/config/exportEntities";
import { useSession, signIn, signOut } from "next-auth/react";
import { useDispatch, useSelector } from 'react-redux';
import {
  setErrorRows,
  setErrorCells,
  setErrorMessages,
  setHasValidated,
  setValidationMessages,
} from '@/store/slices/exportDataSlice';
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
import { clearAllExportState } from "@/utils/helpers";
import { RootState } from "@/store";

type AppContextType = {
  data: Record<string, any>[];
  setData: (data: Record<string, any>[]) => void;
  setDataState: React.Dispatch<React.SetStateAction<Record<string, any>[]>>;
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
    React.SetStateAction<
      { role: "user" | "model" | "system" | "tool"; content: string }[]
    >
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
  // Driver Group Lookup State
  driverGroupsData: any[] | null;
  driverGroupsLastFetched: Date | null;
  fetchAndStoreDriverGroups: () => Promise<void>;
  clearDriverGroupsData: () => void;
  // Carrier Groups Lookup State
  carrierGroupsData: any[] | null;
  carrierGroupsLastFetched: Date | null;
  fetchAndStoreCarrierGroups: () => Promise<void>;
  clearCarrierGroupsData: () => void;
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

  // Charge Profile Lookup State
  chargeProfileData: any[] | null;
  chargeProfileLastFetched: Date | null;
  fetchAndStoreChargeProfile: () => Promise<void>;
  clearChargeProfileData: () => void;

  // Driver Charge Profile Lookup State
  driverChargeProfileData: any[] | null;
  driverChargeProfileLastFetched: Date | null;
  driverChargeProfileSkip: number;
  driverChargeProfileHasMore: boolean;
  fetchAndStoreDriverChargeProfile: (isLoadMore?: boolean) => Promise<void>;
  clearDriverChargeProfileData: () => void;

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
  refreshData: () => Promise<void>;
  viewData: Record<string, any>[];
  setViewData: React.Dispatch<React.SetStateAction<Record<string, any>[]>>;
  error: Record<string, any>[];
  setError: React.Dispatch<React.SetStateAction<Record<string, any>[]>>;
  dataTable: Record<number, Record<string, any>[]>;
  setDataTable: React.Dispatch<React.SetStateAction<Record<number, Record<string, any>[]>>>;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
  setTotalPages: React.Dispatch<React.SetStateAction<number>>;
  rowsPerPage: number;
  totalRows: number;
  setTotalRows: React.Dispatch<React.SetStateAction<number>>;
  isInitialDataLoading: boolean;
  setIsInitialDataLoading: React.Dispatch<React.SetStateAction<boolean>>;
  initializeDataStates: (allData: Record<string, any>[], totalRows?: number) => void;
  handlePageChange: (page: number, allData: Record<string, any>[]) => void;
  handlePageChangeWithPreload: (page: number, allData: Record<string, any>[]) => void;
  fetchPageData: (page: number, allData: Record<string, any>[]) => Promise<void>;
  updateErrorState: (errorRows: Record<string, any>[]) => void;
  // Chat pane collapse state
  isChatPaneCollapsed: boolean;
  setIsChatPaneCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  toggleChatPane: () => void;

  // Null header warning state
  showNullHeaderWarning: boolean;
  setShowNullHeaderWarning: React.Dispatch<React.SetStateAction<boolean>>;
  nullHeaders: string[];
  setNullHeaders: React.Dispatch<React.SetStateAction<string[]>>;
  detectNullHeaders: (columns: string[]) => string[];
  handleNullHeaderWarning: (columns: string[], fileName?: string) => boolean;

  // entity config
  entityConfig: ExportConfig | null;
  setEntityConfig: React.Dispatch<React.SetStateAction<ExportConfig | null>>;
  getBaseUrl: () => string;
  fetchActiveBaseUrl: () => Promise<string>;

  // Function to clear exported data from the main data array
  clearExportedData: (successfulRows: Record<string, any>[]) => Promise<{ success: boolean; removedRowsCount?: number; remainingRowsCount?: number; error?: any }>;
  // Function to delete rows from both local state and MongoDB
  deleteRows: (rowsToDelete: Record<string, any>[], deletionType?: string) => Promise<{ success: boolean; deletedRowsCount?: number; remainingRowsCount?: number; message?: string; error?: any }>;
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
  // Initialize with empty state - data will be loaded from MongoDB via refreshData
  function getInitialChatHistory() {
    return [];
  }
  function getInitialEditedCells() {
    return new Set<string>();
  }
  function getInitialFileName() {
    return null;
  }

  const [data, setDataState] = useState<Record<string, any>[]>([]);
  const [columns, setColumnsState] = useState<string[]>([]);
  const [fileName, setFileNameState] = useState<string | null>(null);
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [isLoadingState, setIsLoadingStateInner] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<
    { role: "user" | "model" | "system" | "tool"; content: string }[]
  >(getInitialChatHistory);
  const { data: session, status } = useSession();
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Replace isAuthenticated and isAuthLoading with NextAuth session
  const isAuthenticated = status === "authenticated";
  const isAuthLoading = status === "loading";

  // New state variables for the new requirements
  const [viewData, setViewData] = useState<Record<string, any>[]>([]);
  const [error, setError] = useState<Record<string, any>[]>([]);
  const [dataTable, setDataTable] = useState<Record<number, Record<string, any>[]>>({});
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [rowsPerPage] = useState<number>(500);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [isInitialDataLoading, setIsInitialDataLoading] = useState<boolean>(false);
  const [isChatPaneCollapsed, setIsChatPaneCollapsed] = useState<boolean>(true);
  
  // Null header warning state
  const [showNullHeaderWarning, setShowNullHeaderWarning] = useState<boolean>(false);
  const [nullHeaders, setNullHeaders] = useState<string[]>([]);

  const toggleChatPane = useCallback(() => {
    setIsChatPaneCollapsed(prev => !prev);
  }, []);

  // Function to detect null headers
  const detectNullHeaders = useCallback((columns: string[]) => {
    const nullHeaderIndices: string[] = [];
    columns.forEach((col, index) => {
      if (!col || col.trim() === '') {
        nullHeaderIndices.push(`Column ${index + 1}`);
      }
    });
    return nullHeaderIndices;
  }, []);

  // Function to handle null header warning
  const handleNullHeaderWarning = useCallback((columns: string[], fileName?: string) => {
    const detectedNullHeaders = detectNullHeaders(columns);
    if (detectedNullHeaders.length > 0) {
      setNullHeaders(detectedNullHeaders);
      setShowNullHeaderWarning(true);
      return true; // Return true if null headers were detected
    }
    return false; // Return false if no null headers
  }, [detectNullHeaders]);


  // entity config
  const [entityConfig, setEntityConfig] = useState<ExportConfig | null>(null);


  // export data state
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const [exportConfig, setExportConfig] = useState<ExportConfig | null>(null);
  const [isFetchingConfig, setIsFetchingConfig] = useState(false);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>(
    {}
  );

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

  // Charge Profile Lookup State
  const [chargeProfileData, setChargeProfileDataState] = useState<any[] | null>(null);
  const [chargeProfileLastFetched, setChargeProfileLastFetched] = useState<Date | null>(null);

  // Driver Charge Profile Lookup State
  const [driverChargeProfileData, setDriverChargeProfileDataState] = useState<any[] | null>(null);
  const [driverChargeProfileLastFetched, setDriverChargeProfileLastFetched] = useState<Date | null>(null);
  const [driverChargeProfileSkip, setDriverChargeProfileSkip] = useState<number>(0);
  const [driverChargeProfileHasMore, setDriverChargeProfileHasMore] = useState<boolean>(true);

  // Driver Group Lookup State
  const [driverGroupsData, setDriverGroupsDataState] = useState<any[] | null>(null);
  const [driverGroupsLastFetched, setDriverGroupsLastFetched] = useState<Date | null>(null);

  // Carrier Groups Lookup State
  const [carrierGroupsData, setCarrierGroupsDataState] = useState<any[] | null>(null);
  const [carrierGroupsLastFetched, setCarrierGroupsLastFetched] = useState<Date | null>(null);

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

  // Persist only non-data state to localStorage
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

    // Clear localStorage for validation state but preserve Redux validation state
    clearAllExportState(dispatch, false);
  }, [dispatch]);

  // URL state management for pagination
  const updateURLWithPage = useCallback((page: number) => {
    // Prevent URL updates during data initialization to avoid RSC requests that reset pagination
    if (isInitialDataLoading) {
      return;
    }
    
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams, isInitialDataLoading]);

  const getPageFromURL = useCallback(() => {
    const pageParam = searchParams.get('page');
    return pageParam ? parseInt(pageParam) : 1;
  }, [searchParams]);

  // New functions for the new requirements
  const initializeDataStates = useCallback((allData: Record<string, any>[], totalRows?: number) => {
    // Calculate total pages using totalRows if provided, otherwise use data length
    const totalCount = totalRows || allData?.length;
    const totalPagesCount = Math.ceil(totalCount / rowsPerPage);
    setTotalPages(totalPagesCount);
    
    // For new data uploads, always start with page 1 to avoid empty data issues
    // Only use URL page if we're not initializing with new data
    const urlPage = getPageFromURL();
    const initialPage = allData && allData.length > 0 ? 1 : Math.min(Math.max(urlPage, 1), totalPagesCount);
    setCurrentPage(initialPage);
    setTotalRows(totalCount);
    
    // Set viewData to the correct page data
    const startIndex = (initialPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, allData?.length || 0);
    const pageData = allData?.slice(startIndex, endIndex);
    setViewData(pageData);
    
    // Initialize dataTable with the complete dataset cached for all pages
    const completeDataTable: Record<number, Record<string, any>[]> = {};
    
          // Cache all pages if we have the complete dataset
      if (allData && allData.length > 0) {
        for (let page = 1; page <= totalPagesCount; page++) {
          const pageStartIndex = (page - 1) * rowsPerPage;
          const pageEndIndex = Math.min(pageStartIndex + rowsPerPage, allData.length);
          const pageDataForCache = allData.slice(pageStartIndex, pageEndIndex);
          completeDataTable[page] = pageDataForCache;
        }
      } else {
        // If we don't have complete data, fallback to just the initial page
        // Note: We can't fetch from API here due to function declaration order
        // The complete dataset will be loaded when pages are accessed
        completeDataTable[initialPage] = pageData;
      }
    
    setDataTable(completeDataTable);
    setError([]);
    
    // Update URL to match the initial page, but only if we're not initializing with new data
    // This prevents the RSC request that resets pagination after data load
    if (initialPage !== urlPage && !(allData && allData.length > 0)) {
      updateURLWithPage(initialPage);
    }
  }, [rowsPerPage, getPageFromURL, updateURLWithPage]);

  // Simplified setData: only updates data rows. Column updates must be handled separately by callers.
  const setData = useCallback(
    (newData: Record<string, any>[]) => {
      // Store the complete dataset in dataState
      setDataState(newData);

      // Always reset export configuration when new file is uploaded
      resetExportConfigOnNewFile();
      
      // Initialize the new state management with the complete dataset
      initializeDataStates(newData);
    },
    [resetExportConfigOnNewFile, initializeDataStates]
  );



  const updateErrorState = useCallback((errorRows: Record<string, any>[]) => {
    setError(errorRows);
  }, []);

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

  const refreshData = useCallback(async () => {
    // Prevent refreshData from running during page changes
    if (pageChangeInProgress.current) {
      return;
    }
    
    const carrierId = getCarrierId();
    if (!isAuthenticated || !carrierId) return;

    const storedEntityName = localStorage.getItem(ENTITY_NAME_STORAGE_KEY);
    if (storedEntityName) {
      setIsLoading(true);
      setIsInitialDataLoading(true);
      try {
        // Get the page from URL or default to 1
        const urlPage = getPageFromURL();
        
        const response = await fetch(
          `/api/data?carrier=${carrierId}&page=${urlPage}&limit=500`
        );

        if (response.ok) {
          const payload = await response.json();
          if (payload.data && Array.isArray(payload.data)) {
            // Use current columns if they exist and are not empty, otherwise use server columns
            const currentColumns = columns && columns.length > 0 ? columns : null;
            const serverColumns = payload.columns || (payload.data?.length > 0 ? Object.keys(payload.data[0]) : []);
            
            // Always prefer current columns if they exist, even if they're different from server
            const newColumns = currentColumns || serverColumns;
            
            // Use the data as-is since transformation is now handled on the server
            const transformedData = payload.data;
            
            setDataState(transformedData);
            initializeDataStates(transformedData, payload.pagination?.total);
            setTotalRows(payload.pagination?.total || payload.data?.length);
            
            // Cache the current page data
            setDataTable({ [urlPage]: payload.data });
            
            // CRITICAL: Always preserve current columns if they exist
            if (currentColumns && currentColumns.length > 0) {
              setColumnsState(currentColumns);
            } else {
              setColumnsState(newColumns);
            }
            setIsInitialDataLoading(false);
            setEntityName(storedEntityName);

            // Check for null headers and show warning if found
            if (newColumns && newColumns.length > 0) {
              const hasNullHeaders = handleNullHeaderWarning(newColumns, fileName || undefined);
              if (hasNullHeaders) {
                // Don't proceed with data loading until user decides
                return;
              }
            }

            // Load DataTable state from MongoDB
            if (payload.datatableEditedCells && Array.isArray(payload.datatableEditedCells)) {
              setDatatableEditedCells(new Set(payload.datatableEditedCells));
            } else {
              setDatatableEditedCells(new Set());
            }

            
            if (payload.errorRows && Array.isArray(payload.errorRows)) {
              dispatch(setErrorRows(payload.errorRows));
            }
            
            if (payload.errorCells && typeof payload.errorCells === 'object') {
              dispatch(setErrorCells(payload.errorCells));
            }
            
            if (payload.errorMessages && typeof payload.errorMessages === 'object') {
              dispatch(setErrorMessages(payload.errorMessages));
            }
            
            if (payload.hasValidated !== undefined) {
              dispatch(setHasValidated(payload.hasValidated));
            }
            
            if (payload.validationMessages && Array.isArray(payload.validationMessages)) {
              dispatch(setValidationMessages(payload.validationMessages));
            }
            

          }
        } else if (response.status === 404) {
          localStorage.removeItem(ENTITY_NAME_STORAGE_KEY);
          setDataState([]);
          setColumnsState([]);
          setEntityName(null);
          setDatatableEditedCells(new Set());
          setDataTable({});
          setViewData([]);
          setError([]);
          setCurrentPage(1);
          setTotalPages(1);
          setTotalRows(0);
          setIsInitialDataLoading(false);
          
          // Clear DataTable state
          dispatch(setErrorRows([]));
          dispatch(setErrorCells({}));
          dispatch(setErrorMessages({}));
          dispatch(setHasValidated(false));
          dispatch(setValidationMessages([]));
        } else {
          const errorData = await response.json();
          showToast({
            title: "Error Fetching Data",
            description: errorData.error || "Could not fetch initial data.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
        showToast({
          title: "Network Error",
          description: "Failed to connect to server.",
          variant: "destructive",
        });
        setDataState([]);
        setColumnsState([]);
        setEntityName(null);
        setDatatableEditedCells(new Set());
        setDataTable({});
        setViewData([]);
        setError([]);
        setCurrentPage(1);
        setTotalPages(1);
        setTotalRows(0);
        setIsInitialDataLoading(false);
      } finally {
        setIsLoading(false);
      }
    }
  }, [isAuthenticated, setIsLoading, showToast, setEntityName, dispatch, getPageFromURL, initializeDataStates, columns, setColumnsState]);

  useEffect(() => {
    // On initial auth, fetch data from mongodb
    if (isAuthenticated) {
      refreshData();
    }
  }, [isAuthenticated]);

  const addChatMessage = useCallback(
    (message: {
      role: "user" | "model" | "system" | "tool";
      content: string;
    }) => {
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

  // Add a ref to track ongoing page changes to prevent duplicate calls
  const pageChangeInProgress = useRef(false);

  // Helper function to validate cached data
  const validateCachedData = useCallback((page: number, cachedData: Record<string, any>[]) => {
    if (!cachedData || cachedData.length === 0) {
      return false;
    }
    
    // Check if the cached data has the correct number of rows
    const expectedRowCount = Math.min(rowsPerPage, totalRows - (page - 1) * rowsPerPage);
    const isValid = cachedData.length === expectedRowCount;
    
    if (!isValid) {
      console.warn(`⚠️ Invalid cached data for page ${page}: expected ${expectedRowCount} rows, got ${cachedData.length}`);
    }
    
    return isValid;
  }, [rowsPerPage, totalRows]);

  // Helper function to clean up corrupted cache
  const cleanupCorruptedCache = useCallback(() => {
    setDataTable(prev => {
      const cleanedCache: Record<number, Record<string, any>[]> = {};
      
      Object.entries(prev).forEach(([pageStr, pageData]) => {
        const page = parseInt(pageStr);
        if (validateCachedData(page, pageData)) {
          cleanedCache[page] = pageData;
        } else {
  
        }
      });
      
      return cleanedCache;
    });
  }, [validateCachedData]);

  // Helper function to fetch page data
  const fetchPageData = useCallback(async (page: number, allData: Record<string, any>[]) => {
    try {
      const entityName = localStorage.getItem(ENTITY_NAME_STORAGE_KEY);
      if (!entityName) return;
      
      const carrierId = getCarrierId();
      if (!carrierId) return;
      
      const response = await fetch(`/api/data?carrier=${carrierId}&page=${page}&limit=${rowsPerPage}`);
      if (response.ok) {
        const pageData = await response.json();
        // Cache the fetched data and set it as viewData
        setDataTable(prev => ({ ...prev, [page]: [...pageData.data] }));
        setViewData([...pageData.data]);

      } else {
        // Fallback to client-side pagination
        const startIndex = (page - 1) * rowsPerPage;
        const endIndex = Math.min(startIndex + rowsPerPage, allData?.length || 0);
        const pageData = allData?.slice(startIndex, endIndex);
        setDataTable(prev => ({ ...prev, [page]: [...pageData] }));
        setViewData([...pageData]);

      }
    } catch (error) {
      console.error('Error fetching page data:', error);
      // Fallback to client-side pagination
      const startIndex = (page - 1) * rowsPerPage;
      const endIndex = Math.min(startIndex + rowsPerPage, allData?.length || 0);
      const pageData = allData?.slice(startIndex, endIndex);
      setDataTable(prev => ({ ...prev, [page]: [...pageData] }));
      setViewData([...pageData]);
      
    }
  }, [rowsPerPage, getCarrierId]);

  // Helper function to preload adjacent pages
  const preloadAdjacentPages = useCallback(async (currentPage: number, allData: Record<string, any>[]) => {
    const pagesToPreload = [];
    
    // Preload next page if it exists
    if (currentPage < totalPages) {
      pagesToPreload.push(currentPage + 1);
    }
    
    // Preload previous page if it exists
    if (currentPage > 1) {
      pagesToPreload.push(currentPage - 1);
    }
    
    // Preload pages in background
    for (const page of pagesToPreload) {
      if (!dataTable[page] || dataTable[page].length === 0) {

        // Use setTimeout to avoid blocking the UI
        setTimeout(async () => {
          try {
            await fetchPageData(page, allData);

          } catch (error) {
            console.warn(`⚠️ Failed to preload page ${page}:`, error);
          }
        }, 100);
      }
    }
  }, [totalPages, dataTable, fetchPageData]);

  // Enhanced page change handler with preloading
  const handlePageChangeWithPreload = useCallback(async (page: number, allData: Record<string, any>[]) => {
    if (page < 1 || page > totalPages) return;
    
    // Prevent duplicate calls
    if (pageChangeInProgress.current) {
      return;
    }
    
    pageChangeInProgress.current = true;
    
    try {

      
      // Store current page data in dataTable before switching
      // Use the actual cached data for the current page, not viewData
      setDataTable(prev => {
        const currentPageData = prev[currentPage];
        // Only update if we have valid data for the current page
        if (currentPageData && currentPageData.length > 0) {

          return { ...prev, [currentPage]: [...currentPageData] };
        }
        // If no cached data exists for current page, use viewData as fallback
        if (viewData.length > 0) {

          return { ...prev, [currentPage]: [...viewData] };
        }
        return prev;
      });
      
      setCurrentPage(page);
      updateURLWithPage(page);
      
      // Check if the requested page is already cached and validate the data
      if (dataTable[page] && dataTable[page].length > 0) {
        // Validate that cached data has the correct number of rows
        if (validateCachedData(page, dataTable[page])) {
          // Use cached data
  
          setViewData([...dataTable[page]]);
        } else {
          // Cached data is invalid, fetch fresh data
  
          await fetchPageData(page, allData);
        }
      } else {
        // Fetch from API if not cached

        await fetchPageData(page, allData);
      }
      
      // Preload adjacent pages for better UX
      setTimeout(() => {
        preloadAdjacentPages(page, allData);
      }, 200);
      
      // Clean up corrupted cache after page change
      setTimeout(() => {
        cleanupCorruptedCache();
      }, 100);
      
    } finally {
      // Reset the flag after a short delay to allow state updates to complete
      setTimeout(() => {
        pageChangeInProgress.current = false;
      }, 100);
    }
  }, [totalPages, rowsPerPage, updateURLWithPage, getCarrierId, dataTable, currentPage, viewData, totalRows, validateCachedData, cleanupCorruptedCache, fetchPageData, preloadAdjacentPages]);

  // Backward compatibility - delegate to enhanced version
  const handlePageChange = useCallback(async (page: number, allData: Record<string, any>[]) => {
    return handlePageChangeWithPreload(page, allData);
  }, [handlePageChangeWithPreload]);

  const getEnvKeys = useCallback(() => envKeys, [envKeys]);

  // Function to fetch active Base URL from database
  const fetchActiveBaseUrl = useCallback(async (): Promise<string> => {
    try {
      const response = await fetch('/api/admin/base-urls');
      const data = await response.json();

      if (data.success && data.data) {
        const activeBaseUrl = data.data.find((baseUrl: any) => baseUrl.is_active);
        if (activeBaseUrl) {
          return activeBaseUrl.url;
        }
      }
    } catch (error) {
      console.error('Failed to fetch active base URL:', error);
    }

    // Fallback to entityConfig baseUrl or default
    return entityConfig?.baseUrl || 'https://api.axle.network';
  }, [entityConfig]);

  // Helper function to get baseUrl with priority: database active URL > entityConfig (database) > default
  const getBaseUrl = useCallback(() => {
    // For synchronous calls, use entityConfig baseUrl or default
    // The active base URL will be used in async operations through fetchActiveBaseUrl
    const url = entityConfig?.baseUrl || 'https://api.axle.network';
    return url;
  }, [entityConfig]);

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
      const baseUrl = await fetchActiveBaseUrl();
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
            `${lookupName}: Found double-nested data array with ${resultData.data.data?.length} items`
          );
          items = resultData.data.data;
        } else if (resultData.data && Array.isArray(resultData.data)) {
          console.log(
            `${lookupName}: Found data array with ${resultData.data?.length} items`
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
      finalItemsToStore.push({ name: 'All Driver Group'});
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
      "/admin/getChassisType?isDeleted=true",
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
      "/admin/getContainerType?isDeleted=true",
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
      "/carrier/getTMSContainerOwner?isDeleted=true",
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
        ["_id", "customerType", "company_name", "city", "state", "address1", "country", "zip_code", "address"]
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

  // Charge Profile Lookup (API-based)
  const fetchAndStoreChargeProfile = useCallback(async () => {
    await genericFetchLookupData('/charge-templates', setChargeProfileDataState, setChargeProfileLastFetched, 'Charge Profile', ['_id', 'name']);
  }, [getApiToken, setIsLoading, showToast]);
  const clearChargeProfileData = useCallback(() => {
    setChargeProfileDataState(null);
    setChargeProfileLastFetched(null);
    showToast({ title: 'Cache Cleared', description: 'Charge profile data has been cleared.' });
  }, [showToast]);

  // Driver Charge Profile Lookup (API-based)
  const fetchAndStoreDriverChargeProfile = useCallback(async (isLoadMore = false) => {
    const token = getApiToken();
    if (!token) {
      showToast({
        title: "Authentication Required",
        description: "API token is missing for Driver Charge Profile. Please set it on the API Auth page.",
        variant: "destructive",
        duration: 7000,
      });
      return;
    }

    // If loading more and no more data, return early
    if (isLoadMore && !driverChargeProfileHasMore) {
      return;
    }

    setIsLoading(true);
    try {
      const baseUrl = await fetchActiveBaseUrl();
      const skip = isLoadMore ? driverChargeProfileSkip : 0;
      
      const response = await fetch(`${baseUrl}/rate-engine/vendor-rate/v2/charge-profile`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          skip: skip,
          limit: 30,
          vendorType: "driver"
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Driver Charge Profile: HTTP ${response.status}`);
      }

      const resultData = await response.json();
      let items: any[] = [];
      
      if (Array.isArray(resultData)) {
        items = resultData;
      } else if (resultData?.data?.data && Array.isArray(resultData.data.data)) {
        items = resultData.data.data;
      } else if (resultData?.data && Array.isArray(resultData.data)) {
        items = resultData.data;
      } else if (resultData && typeof resultData === "object") {
        const arrayProperty = Object.values(resultData).find(Array.isArray);
        if (arrayProperty) {
          items = arrayProperty as any[];
        } else if (Object.keys(resultData).length > 0) {
          items = [resultData];
        }
      }

      const finalItemsToStore = items
        .map((item) => ({ _id: item._id, name: item.name }))
        .filter((item) => item._id && item.name);

      if (isLoadMore) {
        // Append new items to existing data
        setDriverChargeProfileDataState(prev => [...(prev || []), ...finalItemsToStore]);
        setDriverChargeProfileSkip(prev => prev + 30);
      } else {
        // Replace existing data
        setDriverChargeProfileDataState(finalItemsToStore);
        setDriverChargeProfileSkip(30);
      }

      // Check if we have more data to load
      setDriverChargeProfileHasMore(finalItemsToStore.length === 30);
      setDriverChargeProfileLastFetched(new Date());

      showToast({
        title: "Success",
        description: `${finalItemsToStore.length} driver charge profiles ${isLoadMore ? 'added' : 'fetched and cached'}.`,
      });
    } catch (error: any) {
      console.error(`Error fetching Driver Charge Profile:`, error);
      showToast({
        title: `Fetch Error (Driver Charge Profile)`,
        description: error.message || `Could not fetch Driver Charge Profile.`,
        variant: "destructive",
        duration: 7000,
      });
      if (!isLoadMore) {
        setDriverChargeProfileDataState(null);
        setDriverChargeProfileLastFetched(null);
        setDriverChargeProfileSkip(0);
        setDriverChargeProfileHasMore(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [getApiToken, setIsLoading, showToast, driverChargeProfileSkip, driverChargeProfileHasMore]);
  const clearDriverChargeProfileData = useCallback(() => {
    setDriverChargeProfileDataState(null);
    setDriverChargeProfileLastFetched(null);
    setDriverChargeProfileSkip(0);
    setDriverChargeProfileHasMore(true);
    showToast({ title: 'Cache Cleared', description: 'Driver charge profile data has been cleared.' });
  }, [showToast]);

  // Driver Group Lookup (API-based)
  const fetchAndStoreDriverGroups = useCallback(async () => {
    await genericFetchLookupData('/tms/create-payment-group', setDriverGroupsDataState, setDriverGroupsLastFetched, 'Driver Groups', ['_id', 'name']);
  }, [getApiToken, setIsLoading, showToast]);
  const clearDriverGroupsData = useCallback(() => {
    setDriverGroupsDataState(null);
    setDriverGroupsLastFetched(null);
    showToast({ title: 'Cache Cleared', description: 'Driver groups data has been cleared.' });
  }, [showToast]);

  // Carrier Groups Lookup (API-based)
  const fetchAndStoreCarrierGroups = useCallback(async () => {
    const token = getApiToken();
    if (!token) {
      showToast({
        title: "Authentication Required",
        description: "API token is missing for Carrier Groups. Please set it on the API Auth page.",
        variant: "destructive",
        duration: 7000,
      });
      return;
    }
    setIsLoading(true);
    try {
      const baseUrl = await fetchActiveBaseUrl();
      const response = await fetch(`${baseUrl}/getCarrierProfileFilter`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json, text/plain, */*",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Carrier Groups: HTTP ${response.status}`);
      }

      const resultData = await response.json();
      const items = resultData?.data?.drayosCarriers || [];
      
      const finalItemsToStore = items
        .map((item: any) => ({ _id: item._id, company_name: item.company_name }))
        .filter((item: any) => item._id && item.company_name);

      finalItemsToStore.push({ company_name: 'All Carrier Group'});
      setCarrierGroupsDataState(finalItemsToStore);
      setCarrierGroupsLastFetched(new Date());
      
      showToast({
        title: "Success",
        description: `${finalItemsToStore.length} carrier groups fetched and cached.`,
      });
    } catch (error: any) {
      console.error(`Error fetching Carrier Groups:`, error);
      showToast({
        title: `Fetch Error (Carrier Groups)`,
        description: error.message || `Could not fetch Carrier Groups.`,
        variant: "destructive",
        duration: 7000,
      });
      setCarrierGroupsDataState(null);
      setCarrierGroupsLastFetched(null);
    } finally {
      setIsLoading(false);
    }
  }, [getApiToken, setIsLoading, showToast]);
  const clearCarrierGroupsData = useCallback(() => {
    setCarrierGroupsDataState(null);
    setCarrierGroupsLastFetched(null);
    showToast({ title: 'Cache Cleared', description: 'Carrier groups data has been cleared.' });
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
      const baseUrl = await fetchActiveBaseUrl();
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
  }, [getApiToken, setIsLoading, showToast, getCarrierId, getBaseUrl]);

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
      const baseUrl = await fetchActiveBaseUrl();
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
  }, [getApiToken, setIsLoading, showToast, getCarrierId, getBaseUrl]);

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
      const baseUrl = await fetchActiveBaseUrl();
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
            `CSR: Found double-nested data array with ${resultData.data.data?.length} items`
          );
          items = resultData.data.data;
        } else if (resultData.data && Array.isArray(resultData.data)) {
          console.log(
            `CSR: Found data array with ${resultData.data?.length} items`
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
  }, [getApiToken, setIsLoading, showToast, getBaseUrl]);

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
    setDriverGroupsDataState(null);
    setDriverGroupsLastFetched(null);
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
    setCarrierGroupsDataState(null);
    setCarrierGroupsLastFetched(null);
    setChargeProfileDataState(null);
    setChargeProfileLastFetched(null);
    setDriverChargeProfileDataState(null);
    setDriverChargeProfileLastFetched(null);
    setDriverChargeProfileSkip(0);
    setDriverChargeProfileHasMore(true);

    console.log("All lookup data cleared");
  }, []);

  const fetchExportConfig = useCallback(async () => {
    // Don't fetch if already loaded or already fetching
    if (exportConfig || isFetchingConfig) {
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
      // Use functional update to avoid dependency on selectedEntityId
      setSelectedEntityId(prev => {
        if (config.entities.length > 0 && !prev) {
          return config.entities[0].id;
        }
        return prev;
      });
    } catch (error) {
      console.error("Error fetching entities config:", error);
      setExportConfig({ baseUrl: "", entities: [] });
      setSelectedEntityId("");
    } finally {
      setIsFetchingConfig(false);
    }
  }, [exportConfig]);

  const clearExportConfig = useCallback(() => {
    setExportConfig(null);
    setSelectedEntityId("");
    setFieldMappings({});
    setIsFetchingConfig(false);
  }, []);

  // Function to clear exported data from the main data array
  const clearExportedData = useCallback(async (successfulRows: Record<string, any>[]) => {
    try {
      // Create a set of unique row identifiers for exact matching
      const successfulRowIdentifiers = new Set<string>();
      
      successfulRows.forEach((row: Record<string, any>) => {
        // Create a unique fingerprint for each row using key fields
        const profileName = row['Profile Name'] || row['Profile Name*'] || row['Company Name'] || row['Company Name*'];
        const address = row['Address'] || row['Address*'] || row['Street'] || row['Street Address'];
        const city = row['City'] || row['City*'] || row['Town'];
        const zipCode = row['Zip Code'] || row['Zip Code*'] || row['Postal Code'] || row['Postcode'];
        const email = row.email || row.Email || row['Email*'] || row['Login Email Address'];
        
        // Create unique identifier using profile name + address + city + zip
        if (profileName && address && city && zipCode) {
          const identifier = `${profileName.trim()}_${address.trim()}_${city.trim()}_${zipCode.trim()}`;
          successfulRowIdentifiers.add(identifier);
        }
        
        // Fallback: use email if available
        if (email && email.trim()) {
          const emailIdentifier = `email:${email.trim()}`;
          successfulRowIdentifiers.add(emailIdentifier);
        }
        
        // Additional fallback: use any unique combination of available fields
        if (!profileName && !email) {
          // Try to create identifier from other available fields
          const availableFields = Object.keys(row).filter(key => row[key] && String(row[key]).trim());
          if (availableFields.length >= 2) {
            const fallbackIdentifier = availableFields.slice(0, 3).map(key => `${key}:${String(row[key]).trim()}`).join('_');
            successfulRowIdentifiers.add(fallbackIdentifier);
          }
        }
      });

      // Filter out successful rows from the main data array
      const originalDataLength = data.length;
      const filteredData = data.filter((row: Record<string, any>) => {
        // Create the same identifier for the current row
        const profileName = row['Profile Name'] || row['Profile Name*'] || row['Company Name'] || row['Company Name*'];
        const address = row['Address'] || row['Address*'] || row['Street'] || row['Street Address'];
        const city = row['City'] || row['City*'] || row['Town'];
        const zipCode = row['Zip Code'] || row['Zip Code*'] || row['Postal Code'] || row['Postcode'];
        const email = row.email || row.Email || row['Email*'] || row['Login Email Address'];
        
        // Check if this row should be kept (not exported successfully)
        for (const identifier of successfulRowIdentifiers) {
          if (identifier.startsWith('email:')) {
            // Email-based matching
            const emailValue = identifier.replace('email:', '');
            if (email && email.trim() === emailValue) {
              return false; // This row was exported successfully, remove it
            }
          } else if (identifier.includes(':')) {
            // Fallback identifier format (field:value_field:value_field:value)
            const fallbackParts = identifier.split('_');
            let allFieldsMatch = true;
            
            for (const part of fallbackParts) {
              const [fieldName, fieldValue] = part.split(':');
              if (fieldName && fieldValue) {
                const rowValue = row[fieldName];
                if (!rowValue || String(rowValue).trim() !== fieldValue) {
                  allFieldsMatch = false;
                  break;
                }
              }
            }
            
            if (allFieldsMatch) {
              return false; // This row was exported successfully, remove it
            }
          } else {
            // Profile name + address + city + zip matching
            if (profileName && address && city && zipCode) {
              const rowIdentifier = `${profileName.trim()}_${address.trim()}_${city.trim()}_${zipCode.trim()}`;
              if (rowIdentifier === identifier) {
                return false; // This row was exported successfully, remove it
              }
            }
          }
        }
        
        return true; // Keep this row (it wasn't exported successfully)
      });

      // Update the main data array
      setDataState(filteredData);
      
      // Update pagination and view data
      const newTotalRows = filteredData.length;
      const newTotalPages = Math.ceil(newTotalRows / rowsPerPage);
      
      setTotalRows(newTotalRows);
      setTotalPages(newTotalPages);
      
      // If current page is now beyond total pages, reset to page 1
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(1);
        const newViewData = filteredData.slice(0, rowsPerPage);
        setViewData(newViewData);
        setDataTable({ 1: newViewData });
      } else if (newTotalPages > 0) {
        // Update current page data
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = Math.min(startIndex + rowsPerPage, filteredData.length);
        const newViewData = filteredData.slice(startIndex, endIndex);
        setViewData(newViewData);
        setDataTable(prev => ({ ...prev, [currentPage]: newViewData }));
      } else {
        // No data left
        setViewData([]);
        setDataTable({});
        setCurrentPage(1);
      }

      const removedRowsCount = originalDataLength - filteredData.length;
      
      return {
        success: true,
        removedRowsCount,
        remainingRowsCount: filteredData.length
      };
      
    } catch (error: any) {
      console.error('Error clearing exported data from local state:', error);
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }, [data, currentPage, rowsPerPage, setDataState, setViewData, setDataTable, setTotalRows, setTotalPages, setCurrentPage]);

  // Helper function to delete rows from local state
  const deleteRowsFromLocalState = useCallback(async (rowsToDelete: Record<string, any>[]) => {
    try {
      // Create a set of unique row identifiers for exact matching
      const rowsToDeleteIdentifiers = new Set<string>();
      
      rowsToDelete.forEach((row: Record<string, any>) => {
        // Create a unique fingerprint for each row using key fields
        const profileName = row['Profile Name'] || row['Profile Name*'];
        const address = row['Address'] || row['Address*'];
        const city = row['City'] || row['City*'];
        const zipCode = row['Zip Code'] || row['Zip Code*'];
        const email = row.email || row.Email || row['Email*'];
        
        // Create unique identifier using profile name + address + city + zip
        if (profileName && address && city && zipCode) {
          const identifier = `${profileName.trim()}_${address.trim()}_${city.trim()}_${zipCode.trim()}`;
          rowsToDeleteIdentifiers.add(identifier);
        }
        
        // Fallback: use email if available
        if (email && email.trim()) {
          const emailIdentifier = `email:${email.trim()}`;
          rowsToDeleteIdentifiers.add(emailIdentifier);
        }
      });

      // Get the complete dataset from all cached pages, not just current page
      let completeDataset: Record<string, any>[] = [];
      
      // Collect data from all cached pages
      Object.values(dataTable).forEach(pageData => {
        if (pageData && Array.isArray(pageData)) {
          completeDataset.push(...pageData);
        }
      });
      
      // If we don't have enough cached data (less than totalRows), try to fetch the complete dataset
      if (completeDataset.length < totalRows) {
        try {
          const carrierId = getCarrierId();
          if (carrierId) {
            const response = await fetch(`/api/data?carrier=${carrierId}`);
            if (response.ok) {
              const completeData = await response.json();
              if (completeData.data && Array.isArray(completeData.data)) {
                completeDataset = completeData.data;
              }
            }
          }
        } catch (error) {
          console.warn('Failed to fetch complete dataset for deletion:', error);
        }
      }
      
      // If no cached data, fall back to current data
      const dataToFilter = completeDataset.length > 0 ? completeDataset : data;
      
      // Filter out rows to delete from the complete dataset
      const originalDataLength = dataToFilter.length;
      
      const filteredData = dataToFilter.filter((row: Record<string, any>) => {
        // Create the same identifier for the current row
        const profileName = row['Profile Name'] || row['Profile Name*'];
        const address = row['Address'] || row['Address*'];
        const city = row['City'] || row['City*'];
        const zipCode = row['Zip Code'] || row['Zip Code*'];
        const email = row.email || row.Email || row['Email*'];
        
        // Check if this row should be deleted
        for (const identifier of rowsToDeleteIdentifiers) {
          if (identifier.startsWith('email:')) {
            // Email-based matching
            const emailValue = identifier.replace('email:', '');
            if (email && email.trim() === emailValue) {
              return false; // This row should be deleted
            }
          } else {
            // Profile name + address + city + zip matching
            if (profileName && address && city && zipCode) {
              const rowIdentifier = `${profileName.trim()}_${address.trim()}_${city.trim()}_${zipCode.trim()}`;
              if (rowIdentifier === identifier) {
                return false; // This row should be deleted
              }
            }
          }
        }
        
        return true; // Keep this row (it's not in the deletion list)
      });

      // Update the main data array with the complete filtered dataset
      setDataState(filteredData);
      
      // Update pagination and view data
      const newTotalRows = filteredData.length;
      const newTotalPages = Math.ceil(newTotalRows / rowsPerPage);
      
      setTotalRows(newTotalRows);
      setTotalPages(newTotalPages);
      
      // Update the dataTable cache to reflect the new data structure
      // This ensures all cached pages show the correct data after deletion
      const updatedDataTable: Record<number, Record<string, any>[]> = {};
      
      if (newTotalPages > 0) {
        // Rebuild the cache for all pages with the new filtered data
        for (let page = 1; page <= newTotalPages; page++) {
          const startIndex = (page - 1) * rowsPerPage;
          const endIndex = Math.min(startIndex + rowsPerPage, filteredData.length);
          const pageData = filteredData.slice(startIndex, endIndex);
          updatedDataTable[page] = pageData;
        }
        
        // Update the dataTable cache
        setDataTable(updatedDataTable);
        
        // If current page is now beyond total pages, reset to page 1
        if (currentPage > newTotalPages) {
          setCurrentPage(1);
          const newViewData = updatedDataTable[1] || [];
          setViewData(newViewData);
        } else {
          // Update current page view data
          const newViewData = updatedDataTable[currentPage] || [];
          setViewData(newViewData);
        }
        
        // Force a re-render by updating the main data state as well
        // This ensures the DataTable component gets the updated data
        setTimeout(() => {
          setDataState(prevData => filteredData);
        }, 0);
      } else {
        // No data left
        setViewData([]);
        setDataTable({});
        setCurrentPage(1);
      }

      const deletedRowsCount = originalDataLength - filteredData.length;
      
      return {
        success: true,
        deletedRowsCount,
        remainingRowsCount: filteredData.length
      };
      
    } catch (error: any) {
      console.error('Error deleting rows from local state:', error);
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }, [data, currentPage, rowsPerPage, dataTable, setDataState, setViewData, setDataTable, setTotalRows, setTotalPages, setCurrentPage]);

  // Function to delete rows from both local state and MongoDB
  const deleteRows = useCallback(async (rowsToDelete: Record<string, any>[], deletionType: string = 'manual') => {
    try {
      const carrierId = getCarrierId();
      if (!carrierId) return { success: false, error: 'No carrier ID found' };

      // Try to get entity name from localStorage first, then fallback to current context state
      let entityNameToUse = localStorage.getItem(ENTITY_NAME_STORAGE_KEY);
      if (!entityNameToUse) {
        // Fallback to current entity name from context
        entityNameToUse = entityName;
        if (!entityNameToUse) {
          return { success: false, error: 'No entity name found' };
        }
      }

      // Delete rows from MongoDB
      const response = await fetch(`/api/delete-rows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          carrier: carrierId,
          entityName: entityNameToUse,
          rowsToDelete,
          deletionType
        }),
      });

      if (!response.ok) {
        console.warn('Failed to delete rows from MongoDB:', response.statusText);
        return { success: false, error: 'Failed to delete rows from database' };
      }

      // Delete rows from local state
      const result = await deleteRowsFromLocalState(rowsToDelete);

      return {
        success: true,
        deletedRowsCount: rowsToDelete.length,
        remainingRowsCount: result.remainingRowsCount,
        message: `Successfully deleted ${rowsToDelete.length} row(s)`
      };

    } catch (error: any) {
      console.error('Error deleting rows:', error);
      return { 
        success: false, 
        error: error.message || 'Unknown error occurred while deleting rows' 
      };
    }
  }, [getCarrierId, deleteRowsFromLocalState, entityName]);

  return (
    <AppContext.Provider
      value={{
        data,
        setData,
        setDataState,
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
        // Driver Group Lookup
        driverGroupsData,
        driverGroupsLastFetched,
        fetchAndStoreDriverGroups,
        clearDriverGroupsData,
        // Carrier Groups Lookup
        carrierGroupsData,
        carrierGroupsLastFetched,
        fetchAndStoreCarrierGroups,
        clearCarrierGroupsData,
        // Charge Profile Lookup
        chargeProfileData,
        chargeProfileLastFetched,
        fetchAndStoreChargeProfile,
        clearChargeProfileData,
        // Driver Charge Profile Lookup
        driverChargeProfileData,
        driverChargeProfileLastFetched,
        driverChargeProfileSkip,
        driverChargeProfileHasMore,
        fetchAndStoreDriverChargeProfile,
        clearDriverChargeProfileData,
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
        refreshData,
        viewData,
        setViewData,
        error,
        setError,
        dataTable,
        setDataTable,
        currentPage,
        setCurrentPage,
        totalPages,
        setTotalPages,
        rowsPerPage,
        totalRows,
        setTotalRows,
        isInitialDataLoading,
        setIsInitialDataLoading,
        initializeDataStates,
        handlePageChange,
        handlePageChangeWithPreload,
        fetchPageData,
        updateErrorState,
        // Chat pane collapse state
        isChatPaneCollapsed,
        setIsChatPaneCollapsed,
        toggleChatPane,

        // Null header warning state
        showNullHeaderWarning,
        setShowNullHeaderWarning,
        nullHeaders,
        setNullHeaders,
        detectNullHeaders,
        handleNullHeaderWarning,

        // entity config
        entityConfig,
        setEntityConfig,
        getBaseUrl,
        fetchActiveBaseUrl,
        clearExportedData,
        deleteRows,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
