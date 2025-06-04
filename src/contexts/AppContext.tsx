
"use client";

import type React from 'react';
import { createContext, useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { ToastProps } from '@/components/ui/toast';
import { useRouter, usePathname } from 'next/navigation';

const AUTH_TOKEN_STORAGE_KEY = 'datawiseAuthToken';
const AUTH_COMPANY_STORAGE_KEY = 'datawiseAuthCompany';
const AI_PROVIDER_STORAGE_KEY = 'datawiseAiProvider';
const AI_MODEL_NAME_STORAGE_KEY = 'datawiseAiModelName';

// Define default provider and model (ensure this provider has its key in .env for it to work)
const DEFAULT_AI_PROVIDER = 'googleai';
const DEFAULT_AI_MODEL_NAME = 'gemini-1.5-flash';


type AppContextType = {
  data: Record<string, any>[];
  setData: (data: Record<string, any>[]) => void;
  columns: string[];
  setColumns: (columns: string[]) => void;
  fileName: string | null;
  setFileName: (name: string | null) => void;
  activeDialog: string | null;
  openDialog: (dialogName: string) => void;
  closeDialog: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  showToast: (options: { title: string; description?: string; variant?: ToastProps['variant'], duration?: number }) => void;
  chatHistory: { role: 'user' | 'assistant'; content: string }[];
  addChatMessage: (message: { role: 'user' | 'assistant'; content: string }) => void;
  clearChatHistory: () => void;
  isAuthenticated: boolean;
  login: (username: string, pass: string) => boolean;
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
};

export const AppContext = createContext<AppContextType | undefined>(undefined);

const HARDCODED_USERNAME = "admin";
const HARDCODED_PASSWORD = "password";

const AI_TOOL_DIALOG_IDS = ['correction', 'enrichment', 'reorder', 'anomaly', 'duplicate', 'addressProcessing'];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setDataState] = useState<Record<string, any>[]>([]);
  const [columns, setColumnsState] = useState<string[]>([]);
  const [fileName, setFileNameState] = useState<string | null>(null);
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [isLoadingState, setIsLoadingStateInner] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [isAuthenticated, setIsAuthenticatedState] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [currentCompanyName, setCurrentCompanyNameState] = useState<string | null>(null);
  const [selectedAiProvider, setSelectedAiProviderState] = useState<string | null>(null);
  const [selectedAiModelName, setSelectedAiModelNameState] = useState<string | null>(null);
  const [envKeys, setEnvKeys] = useState<Record<string, boolean>>({});
  
  // Chassis Lookups State
  const [chassisOwnersData, setChassisOwnersDataState] = useState<any[] | null>(null);
  const [chassisOwnersLastFetched, setChassisOwnersLastFetched] = useState<Date | null>(null);
  const [chassisSizesData, setChassisSizesDataState] = useState<any[] | null>(null);
  const [chassisSizesLastFetched, setChassisSizesLastFetched] = useState<Date | null>(null);
  const [chassisTypesData, setChassisTypesDataState] = useState<any[] | null>(null);
  const [chassisTypesLastFetched, setChassisTypesLastFetched] = useState<Date | null>(null);

  // Container Lookups State
  const [containerSizesData, setContainerSizesDataState] = useState<any[] | null>(null);
  const [containerSizesLastFetched, setContainerSizesLastFetched] = useState<Date | null>(null);
  const [containerTypesData, setContainerTypesDataState] = useState<any[] | null>(null);
  const [containerTypesLastFetched, setContainerTypesLastFetched] = useState<Date | null>(null);
  const [containerOwnersData, setContainerOwnersDataState] = useState<any[] | null>(null);
  const [containerOwnersLastFetched, setContainerOwnersLastFetched] = useState<Date | null>(null);


  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  const fetchEnvKeys = useCallback(async () => {
    try {
      const response = await fetch('/api/env-check'); 
      if (response.ok) {
        const keys = await response.json();
        setEnvKeys(keys);
        
        const storedProvider = typeof window !== 'undefined' ? localStorage.getItem(AI_PROVIDER_STORAGE_KEY) : null;
        const storedModel = typeof window !== 'undefined' ? localStorage.getItem(AI_MODEL_NAME_STORAGE_KEY) : null;

        if (storedProvider && storedModel && keys[storedProvider.toUpperCase() + '_API_KEY']) {
          setSelectedAiProviderState(storedProvider);
          setSelectedAiModelNameState(storedModel);
        } else if (keys.GOOGLEAI_API_KEY) {
          setSelectedAiProviderState(DEFAULT_AI_PROVIDER);
          setSelectedAiModelNameState(DEFAULT_AI_MODEL_NAME);
          if (typeof window !== 'undefined') {
            localStorage.setItem(AI_PROVIDER_STORAGE_KEY, DEFAULT_AI_PROVIDER);
            localStorage.setItem(AI_MODEL_NAME_STORAGE_KEY, DEFAULT_AI_MODEL_NAME);
          }
        } else if (keys.OPENAI_API_KEY) { 
            setSelectedAiProviderState('openai');
            setSelectedAiModelNameState('gpt-4o-mini'); 
            if (typeof window !== 'undefined') {
              localStorage.setItem(AI_PROVIDER_STORAGE_KEY, 'openai');
              localStorage.setItem(AI_MODEL_NAME_STORAGE_KEY, 'gpt-4o-mini');
            }
        } else if (keys.ANTHROPIC_API_KEY) { 
            setSelectedAiProviderState('anthropic');
            setSelectedAiModelNameState('claude-3-haiku-20240307'); 
            if (typeof window !== 'undefined') {
              localStorage.setItem(AI_PROVIDER_STORAGE_KEY, 'anthropic');
              localStorage.setItem(AI_MODEL_NAME_STORAGE_KEY, 'claude-3-haiku-20240307');
            }
        } else {
            setSelectedAiProviderState(null);
            setSelectedAiModelNameState(null);
        }

      } else {
        console.error('Failed to fetch env key status');
         setSelectedAiProviderState(null); 
         setSelectedAiModelNameState(null);
      }
    } catch (error) {
      console.error('Error fetching env key status:', error);
       setSelectedAiProviderState(null);
       setSelectedAiModelNameState(null);
    }
  }, []);


  useEffect(() => {
    if (typeof window !== 'undefined') {
      const appAuth = localStorage.getItem('appIsAuthenticated');
      if (appAuth === 'true') {
        setIsAuthenticatedState(true);
      }
      const storedCompany = localStorage.getItem(AUTH_COMPANY_STORAGE_KEY);
      if (storedCompany) {
        setCurrentCompanyNameState(storedCompany);
      }
    }
    setIsAuthLoading(false);
    fetchEnvKeys(); 
  }, [fetchEnvKeys]);


  useEffect(() => {
    if (!isAuthLoading) {
      if (!isAuthenticated && pathname !== '/login') {
        router.push('/login');
      } else if (isAuthenticated && pathname === '/login') {
        router.push('/');
      }
    }
  }, [isAuthenticated, isAuthLoading, pathname, router]);

  // Simplified setData: only updates data rows. Column updates must be handled separately by callers.
  const setData = useCallback((newData: Record<string, any>[]) => {
    setDataState(newData);
  }, []);
  
  // Simplified setColumns: only updates column list.
  const setColumns = useCallback((newColumns: string[]) => {
    setColumnsState(newColumns);
  }, []);

  const setFileName = useCallback((name: string | null) => {
    setFileNameState(name);
  }, []);

  const openDialog = useCallback((dialogName: string) => {
    if (AI_TOOL_DIALOG_IDS.includes(dialogName) && pathname !== '/') {
      router.push('/');
    }
    setActiveDialog(dialogName);
  }, [pathname, router]);

  const closeDialog = useCallback(() => {
    setActiveDialog(null);
  }, []);

  const setIsLoading = useCallback((loading: boolean) => {
    setIsLoadingStateInner(loading);
  }, []);

  const showToast = useCallback(
    (options: { title: string; description?: string; variant?: ToastProps['variant'], duration?: number }) => {
      toast({...options, duration: options.duration || 5000});
    },
    [toast]
  );

  const addChatMessage = useCallback((message: { role: 'user' | 'assistant'; content: string }) => {
    setChatHistory(prev => [...prev, message]);
  }, []);

  const clearChatHistory = useCallback(() => {
    setChatHistory([]);
  }, []);

  const setCurrentCompanyName = useCallback((name: string | null) => {
    setCurrentCompanyNameState(name);
    if (typeof window !== 'undefined') {
        if (name) {
        localStorage.setItem(AUTH_COMPANY_STORAGE_KEY, name);
        } else {
        localStorage.removeItem(AUTH_COMPANY_STORAGE_KEY);
        }
    }
  }, []);
  
  const clearApiToken = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    }
  }, []);
  
  const login = useCallback((username: string, pass: string): boolean => {
    if (username === HARDCODED_USERNAME && pass === HARDCODED_PASSWORD) {
      setIsAuthenticatedState(true);
      if (typeof window !== 'undefined') localStorage.setItem('appIsAuthenticated', 'true');
      router.push('/');
      return true;
    }
    showToast({ title: 'Login Failed', description: 'Invalid username or password.', variant: 'destructive' });
    return false;
  }, [router, showToast]);
  
  const logout = useCallback(() => {
    setIsAuthenticatedState(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('appIsAuthenticated');
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY); 
      localStorage.removeItem(AUTH_COMPANY_STORAGE_KEY); 
    }
    setCurrentCompanyNameState(null); 
    setChatHistory([]);
    setDataState([]);
    setColumnsState([]);
    setFileNameState(null);
    router.push('/login');
  }, [router]); 

  const storeApiToken = useCallback((token: string, companyName?: string | null) => {
    if (typeof window !== 'undefined') localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    if (companyName) {
      setCurrentCompanyName(companyName);
    } else {
      setCurrentCompanyName(null); 
    }
  }, [setCurrentCompanyName]);

  const getApiToken = useCallback(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    }
    return null;
  }, []);

  const setSelectedAiProvider = useCallback((provider: string | null) => {
    setSelectedAiProviderState(provider);
    if (typeof window !== 'undefined') {
        if (provider) {
        localStorage.setItem(AI_PROVIDER_STORAGE_KEY, provider);
        } else {
        localStorage.removeItem(AI_PROVIDER_STORAGE_KEY);
        }
    }
  }, []);

  const setSelectedAiModelName = useCallback((modelName: string | null) => {
    setSelectedAiModelNameState(modelName);
    if (typeof window !== 'undefined') {
        if (modelName) {
        localStorage.setItem(AI_MODEL_NAME_STORAGE_KEY, modelName);
        } else {
        localStorage.removeItem(AI_MODEL_NAME_STORAGE_KEY);
        }
    }
  }, []);
  
  const getEnvKeys = useCallback(() => envKeys, [envKeys]);

  const genericFetchLookupData = async (
    endpoint: string,
    dataSetter: React.Dispatch<React.SetStateAction<any[] | null>>,
    lastFetchedSetter: React.Dispatch<React.SetStateAction<Date | null>>,
    lookupName: string
  ) => {
    const token = getApiToken();
    if (!token) {
      showToast({ title: 'Authentication Required', description: `API token is missing for ${lookupName}. Please set it on the API Auth page.`, variant: 'destructive', duration: 7000 });
      return;
    }
    setIsLoading(true);
    try {
      const fullUrl = `https://api.axle.network${endpoint}`;
      console.log(`Fetching ${lookupName} from: ${fullUrl} with token: Bearer ${token ? token.substring(0, 10) + '...' : 'MISSING'}`);
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json, text/plain, */*',
        },
      });
      console.log(`${lookupName} API Response Status:`, response.status, response.statusText);

      if (!response.ok) {
        let errorData = { message: `API Error: ${response.status} ${response.statusText}` };
        try {
          const errorText = await response.text(); 
          console.error(`${lookupName} API Error Response Text:`, errorText);
          errorData = JSON.parse(errorText); 
        } catch (e) {
          console.error(`${lookupName} API Error: Could not parse error response or response was not JSON.`);
        }
        throw new Error(errorData.message || `Failed to fetch ${lookupName}: HTTP ${response.status}`);
      }

      const resultData = await response.json();
      console.log(`${lookupName} API Success Response Body:`, resultData);
      
      let items: any[] = [];
      if (Array.isArray(resultData)) {
        items = resultData;
      } else if (resultData && typeof resultData === 'object') {
        if (resultData.data && Array.isArray(resultData.data)) {
          items = resultData.data;
        } else {
          const arrayProperty = Object.values(resultData).find(Array.isArray);
          if (arrayProperty) {
            items = arrayProperty as any[];
          } else {
             console.warn(`${lookupName}: API response is an object but does not contain a 'data' array or any other top-level array.`);
          }
        }
      } else {
        console.warn(`${lookupName}: Unexpected API response format. Expected array or object with a data array.`);
      }
      
      dataSetter(items);
      lastFetchedSetter(new Date());
      showToast({ title: 'Success', description: `${items.length} ${lookupName.toLowerCase()} fetched and cached.` });
    } catch (error: any) {
      console.error(`Error fetching ${lookupName}:`, error);
      let description = error.message || `Could not fetch ${lookupName}.`;
      if (error.message && error.message.toLowerCase().includes('failed to fetch')) {
        description += ' This might be a network issue or a CORS problem. Check the browser console and network tab for more details.';
      }
      showToast({ title: `Fetch Error (${lookupName})`, description, variant: 'destructive', duration: 7000 });
      dataSetter(null);
      lastFetchedSetter(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Chassis Lookups
  const fetchAndStoreChassisOwners = useCallback(async () => {
    await genericFetchLookupData('/carrier/getTMSChassisOwner', setChassisOwnersDataState, setChassisOwnersLastFetched, 'Chassis Owners');
  }, [getApiToken, setIsLoading, showToast]);

  const clearChassisOwnersData = useCallback(() => {
    setChassisOwnersDataState(null);
    setChassisOwnersLastFetched(null);
    showToast({ title: 'Cache Cleared', description: 'Chassis owner data has been cleared.' });
  }, [showToast]);

  const fetchAndStoreChassisSizes = useCallback(async () => {
    await genericFetchLookupData('/admin/getChassisSize', setChassisSizesDataState, setChassisSizesLastFetched, 'Chassis Sizes');
  }, [getApiToken, setIsLoading, showToast]);

  const clearChassisSizesData = useCallback(() => {
    setChassisSizesDataState(null);
    setChassisSizesLastFetched(null);
    showToast({ title: 'Cache Cleared', description: 'Chassis size data has been cleared.' });
  }, [showToast]);

  const fetchAndStoreChassisTypes = useCallback(async () => {
    await genericFetchLookupData('/admin/getChassisType', setChassisTypesDataState, setChassisTypesLastFetched, 'Chassis Types');
  }, [getApiToken, setIsLoading, showToast]);

  const clearChassisTypesData = useCallback(() => {
    setChassisTypesDataState(null);
    setChassisTypesLastFetched(null);
    showToast({ title: 'Cache Cleared', description: 'Chassis type data has been cleared.' });
  }, [showToast]);

  // Container Lookups
  const fetchAndStoreContainerSizes = useCallback(async () => {
    await genericFetchLookupData('/admin/getContainerSize', setContainerSizesDataState, setContainerSizesLastFetched, 'Container Sizes');
  }, [getApiToken, setIsLoading, showToast]);

  const clearContainerSizesData = useCallback(() => {
    setContainerSizesDataState(null);
    setContainerSizesLastFetched(null);
    showToast({ title: 'Cache Cleared', description: 'Container size data has been cleared.' });
  }, [showToast]);

  const fetchAndStoreContainerTypes = useCallback(async () => {
    await genericFetchLookupData('/admin/getContainerType', setContainerTypesDataState, setContainerTypesLastFetched, 'Container Types');
  }, [getApiToken, setIsLoading, showToast]);

  const clearContainerTypesData = useCallback(() => {
    setContainerTypesDataState(null);
    setContainerTypesLastFetched(null);
    showToast({ title: 'Cache Cleared', description: 'Container type data has been cleared.' });
  }, [showToast]);

  const fetchAndStoreContainerOwners = useCallback(async () => {
    await genericFetchLookupData('/carrier/getTMSContainerOwner', setContainerOwnersDataState, setContainerOwnersLastFetched, 'Container Owners');
  }, [getApiToken, setIsLoading, showToast]);

  const clearContainerOwnersData = useCallback(() => {
    setContainerOwnersDataState(null);
    setContainerOwnersLastFetched(null);
    showToast({ title: 'Cache Cleared', description: 'Container owner data has been cleared.' });
  }, [showToast]);


  return (
    <AppContext.Provider
      value={{
        data,
        setData,
        columns,
        setColumns,
        fileName,
        setFileName,
        activeDialog,
        openDialog,
        closeDialog,
        isLoading: isLoadingState,
        setIsLoading,
        showToast,
        chatHistory,
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
        selectedAiProvider,
        setSelectedAiProvider,
        selectedAiModelName,
        setSelectedAiModelName,
        getEnvKeys,
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
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
