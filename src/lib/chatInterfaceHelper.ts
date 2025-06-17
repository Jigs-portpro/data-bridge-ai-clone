import { chatInterfaceUpdates, type ChatInterfaceUpdatesClientInput } from '@/ai/flows/chat-interface-updates';

interface AppContextData {
  // Main data
  dataContext: string;
  userQuery: string;
  chatHistory?: { role: 'user' | 'assistant'; content: string }[];
  
  // AI settings
  selectedAiProvider: string | null;
  selectedAiModelName: string | null;
  
  // API token
  getApiToken: () => string | null;
  
  // Optional settings
  enableLookupValidation?: boolean;
  
  // AppContext lookup data (to avoid re-fetching)
  chassisOwnersData?: any[] | null;
  chassisOwnersLastFetched?: Date | null;
  chassisSizesData?: any[] | null;
  chassisSizesLastFetched?: Date | null;
  chassisTypesData?: any[] | null;
  chassisTypesLastFetched?: Date | null;
  driverProfileTypesData?: string[] | null;
  driverProfileTypesLastFetched?: Date | null;
  branchesData?: any[] | null;
  branchesLastFetched?: Date | null;
  customerData?: any[] | null;
  customerLastFetched?: Date | null;
  permissionRolesData?: any[] | null;
  permissionRolesLastFetched?: Date | null;
  fleetOwnersData?: any[] | null;
  fleetOwnersLastFetched?: Date | null;
  customerFleetData?: any[] | null;
  customerFleetLastFetched?: Date | null;
  timezoneListData?: string[] | null;
  timezoneListLastFetched?: Date | null;
  commoditiesData?: any[] | null;
  commoditiesLastFetched?: Date | null;
  chassisData?: any[] | null;
  chassisLastFetched?: Date | null;
  trucksData?: any[] | null;
  trucksLastFetched?: Date | null;
}

// Type that matches useAppContext return type for lookup data
interface AppContextHookType {
  data: Record<string, any>[];
  columns: string[];
  chatHistory: { role: 'user' | 'assistant'; content: string }[];
  selectedAiProvider: string | null;
  selectedAiModelName: string | null;
  getApiToken: () => string | null;
  // All the lookup data from AppContext
  chassisOwnersData: any[] | null;
  chassisOwnersLastFetched: Date | null;
  chassisSizesData: any[] | null;
  chassisSizesLastFetched: Date | null;
  chassisTypesData: any[] | null;
  chassisTypesLastFetched: Date | null;
  driverProfileTypesData: string[] | null;
  driverProfileTypesLastFetched: Date | null;
  branchesData: any[] | null;
  branchesLastFetched: Date | null;
  customerData: any[] | null;
  customerLastFetched: Date | null;
  permissionRolesData: any[] | null;
  permissionRolesLastFetched: Date | null;
  fleetOwnersData: any[] | null;
  fleetOwnersLastFetched: Date | null;
  customerFleetData: any[] | null;
  customerFleetLastFetched: Date | null;
  timezoneListData: string[] | null;
  timezoneListLastFetched: Date | null;
  commoditiesData: any[] | null;
  commoditiesLastFetched: Date | null;
  chassisData: any[] | null;
  chassisLastFetched: Date | null;
  trucksData: any[] | null;
  trucksLastFetched: Date | null;
}

export async function callChatInterfaceWithLookups(appContextData: AppContextData) {
  const {
    dataContext,
    userQuery,
    chatHistory,
    selectedAiProvider,
    selectedAiModelName,
    getApiToken,
    enableLookupValidation = true,
    // AppContext lookup data
    chassisOwnersData,
    chassisOwnersLastFetched,
    chassisSizesData,
    chassisSizesLastFetched,
    chassisTypesData,
    chassisTypesLastFetched,
    driverProfileTypesData,
    driverProfileTypesLastFetched,
    branchesData,
    branchesLastFetched,
    customerData,
    customerLastFetched,
    permissionRolesData,
    permissionRolesLastFetched,
    fleetOwnersData,
    fleetOwnersLastFetched,
    customerFleetData,
    customerFleetLastFetched,
    timezoneListData,
    timezoneListLastFetched,
    commoditiesData,
    commoditiesLastFetched,
    chassisData,
    chassisLastFetched,
    trucksData,
    trucksLastFetched,
  } = appContextData;

  // Validate required fields
  if (!selectedAiProvider || !selectedAiModelName) {
    throw new Error('AI provider and model must be selected. Please configure them in AI Settings.');
  }

  // Get API token
  const apiToken = getApiToken();

  // Prepare AppContext lookup data for caching
  const appContextLookupData = {
    chassisOwnersData,
    chassisOwnersLastFetched,
    chassisSizesData,
    chassisSizesLastFetched,
    chassisTypesData,
    chassisTypesLastFetched,
    driverProfileTypesData,
    driverProfileTypesLastFetched,
    branchesData,
    branchesLastFetched,
    customerData,
    customerLastFetched,
    permissionRolesData,
    permissionRolesLastFetched,
    fleetOwnersData,
    fleetOwnersLastFetched,
    customerFleetData,
    customerFleetLastFetched,
    timezoneListData,
    timezoneListLastFetched,
    commoditiesData,
    commoditiesLastFetched,
    chassisData,
    chassisLastFetched,
    trucksData,
    trucksLastFetched,
  };

  // Count available lookup data from AppContext
  const availableLookups = Object.entries(appContextLookupData)
    .filter(([key, value]) => key.endsWith('Data') && value && Array.isArray(value) && value.length > 0)
    .length;

  // Prepare input for chat interface
  const input: ChatInterfaceUpdatesClientInput = {
    dataContext,
    userQuery,
    aiProvider: selectedAiProvider,
    aiModelName: selectedAiModelName,
    apiToken: apiToken || undefined,
    enableLookupValidation,
    appContextLookupData,
    chatHistory,
  };

  console.log('🤖 Calling chat interface with cached lookup system:', {
    enableLookupValidation,
    hasApiToken: !!apiToken,
    availableAppContextLookups: availableLookups,
    aiProvider: selectedAiProvider,
    aiModel: selectedAiModelName,
  });

  try {
    const result = await chatInterfaceUpdates(input);
    console.log('✅ Chat interface completed successfully');
    return result;
  } catch (error) {
    console.error('❌ Chat interface error:', error);
    throw error;
  }
}

/**
 * Convenience function to call chat interface directly with useAppContext hook
 * @param appContext - The return value from useAppContext()
 * @param userQuery - The user's query
 * @param dataContextOverride - Optional override for data context
 * @param enableLookupValidation - Whether to enable lookup validation (default: true)
 */
export async function callChatWithAppContext(
  appContext: AppContextHookType,
  userQuery: string,
  dataContextOverride?: string,
  enableLookupValidation = true
) {
  const dataContext = dataContextOverride || JSON.stringify({
    data: appContext.data,
    columns: appContext.columns,
    // Auto-detect entity if not provided - this could be enhanced
  });

  return callChatInterfaceWithLookups({
    dataContext,
    userQuery,
    chatHistory: appContext.chatHistory,
    selectedAiProvider: appContext.selectedAiProvider,
    selectedAiModelName: appContext.selectedAiModelName,
    getApiToken: appContext.getApiToken,
    enableLookupValidation,
    // Pass all AppContext lookup data
    chassisOwnersData: appContext.chassisOwnersData,
    chassisOwnersLastFetched: appContext.chassisOwnersLastFetched,
    chassisSizesData: appContext.chassisSizesData,
    chassisSizesLastFetched: appContext.chassisSizesLastFetched,
    chassisTypesData: appContext.chassisTypesData,
    chassisTypesLastFetched: appContext.chassisTypesLastFetched,
    driverProfileTypesData: appContext.driverProfileTypesData,
    driverProfileTypesLastFetched: appContext.driverProfileTypesLastFetched,
    branchesData: appContext.branchesData,
    branchesLastFetched: appContext.branchesLastFetched,
    customerData: appContext.customerData,
    customerLastFetched: appContext.customerLastFetched,
    permissionRolesData: appContext.permissionRolesData,
    permissionRolesLastFetched: appContext.permissionRolesLastFetched,
    fleetOwnersData: appContext.fleetOwnersData,
    fleetOwnersLastFetched: appContext.fleetOwnersLastFetched,
    customerFleetData: appContext.customerFleetData,
    customerFleetLastFetched: appContext.customerFleetLastFetched,
    timezoneListData: appContext.timezoneListData,
    timezoneListLastFetched: appContext.timezoneListLastFetched,
    commoditiesData: appContext.commoditiesData,
    commoditiesLastFetched: appContext.commoditiesLastFetched,
    chassisData: appContext.chassisData,
    chassisLastFetched: appContext.chassisLastFetched,
    trucksData: appContext.trucksData,
    trucksLastFetched: appContext.trucksLastFetched,
  });
}

// Type for easier usage in components
export type ChatInterfaceHelperInput = AppContextData;
export type { AppContextHookType }; 