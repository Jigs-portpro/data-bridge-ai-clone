import { EntityProcessingResult } from '@/ai/flows/chat-interface-updates/entity-processor';

const ENTITY_CACHE_KEY = 'entityDetectionCache';
const CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface CachedEntityData extends EntityProcessingResult {
  timestamp: number;
}

export const entityDetectionCache = {
  set: (data: EntityProcessingResult) => {
    try {
      const cacheData: CachedEntityData = {
        ...data,
        timestamp: Date.now()
      };
      localStorage.setItem(ENTITY_CACHE_KEY, JSON.stringify(cacheData));
      return true;
    } catch (error) {
      return false;
    }
  },

  get: (): EntityProcessingResult | null => {
    try {
      const cachedData = localStorage.getItem(ENTITY_CACHE_KEY);
      
      if (!cachedData) {
        return null;
      }

      const data: CachedEntityData = JSON.parse(cachedData);
      
      // Check if cache has expired (24 hours)
      if (Date.now() - data.timestamp > CACHE_EXPIRY_TIME) {
        localStorage.removeItem(ENTITY_CACHE_KEY);
        return null;
      }

      // Remove timestamp from returned data
      const { timestamp, ...entityData } = data;
      return entityData;
    } catch (error) {
      return null;
    }
  },

  clear: () => {
    try {
      localStorage.removeItem(ENTITY_CACHE_KEY);
      return true;
    } catch (error) {
      return false;
    }
  }
}; 