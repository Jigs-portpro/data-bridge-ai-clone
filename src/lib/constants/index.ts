
export const LookupKeyMapper: any = {
    'terminals': 'branches'
}

export const AUTH_TOKEN_STORAGE_KEY = 'datawiseAuthToken';
export const AUTH_COMPANY_STORAGE_KEY = 'datawiseAuthCompany';
export const AI_PROVIDER_STORAGE_KEY = 'datawiseAiProvider';
export const AI_MODEL_NAME_STORAGE_KEY = 'datawiseAiModelName';

// Define default provider and model (ensure this provider has its key in .env for it to work)
export const DEFAULT_AI_PROVIDER = 'googleai';
export const DEFAULT_AI_MODEL_NAME = 'gemini-2.5-flash';