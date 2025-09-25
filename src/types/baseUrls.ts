// Base URL database model
export interface BaseUrl {
  id: number;
  name: string;
  url: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// For creating new base URLs (without id and timestamps)
export interface CreateBaseUrl {
  name: string;
  url: string;
  description?: string;
  is_active?: boolean;
}

// For updating base URLs (all fields optional except id)
export interface UpdateBaseUrl {
  id: number;
  name?: string;
  url?: string;
  description?: string;
  is_active?: boolean;
}

// API response types
export interface BaseUrlResponse {
  success: boolean;
  data?: BaseUrl;
  error?: string;
}

export interface BaseUrlListResponse {
  success: boolean;
  data?: BaseUrl[];
  error?: string;
}