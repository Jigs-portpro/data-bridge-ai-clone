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
  } = appContextData;

  // Validate required fields
  if (!selectedAiProvider || !selectedAiModelName) {
    throw new Error('AI provider and model must be selected. Please configure them in AI Settings.');
  }

  // Get API token
  const apiToken = getApiToken();

  // Prepare input for chat interface
  const input: ChatInterfaceUpdatesClientInput = {
    dataContext,
    userQuery,
    aiProvider: selectedAiProvider,
    aiModelName: selectedAiModelName,
    apiToken: apiToken || undefined,
    enableLookupValidation,
    chatHistory,
  };

  console.log('🤖 Calling chat interface with integrated lookup system:', {
    enableLookupValidation,
    hasApiToken: !!apiToken,
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

// Type for easier usage in components
export type ChatInterfaceHelperInput = AppContextData; 