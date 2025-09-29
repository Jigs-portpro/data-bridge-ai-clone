"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { UserAwareCacheManager, UserContext, createUserAwareCacheManager } from '@/lib/cache/UserAwareCacheManager';
import { CARRIER_ID_STORAGE_KEY } from '@/lib/constants';

interface UserCacheContextType {
  userContext: UserContext | null;
  cacheManager: UserAwareCacheManager | null;
  isUserIdentified: boolean;
  clearAllUserCaches: () => Promise<void>;
  clearUserCache: (cacheType: 'memory' | 'localStorage' | 'validation' | 'lookup' | 'mongodb') => Promise<void>;
  getCacheStats: () => any;
}

const UserCacheContext = createContext<UserCacheContextType | null>(null);

export function UserCacheProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [cacheManager, setCacheManager] = useState<UserAwareCacheManager | null>(null);

  // Create user context from session and localStorage
  useEffect(() => {
    if (status === 'loading') return;

    let newUserContext: UserContext | null = null;

    if (session?.user) {
      // Get carrier ID from localStorage (existing pattern)
      const carrierId = localStorage.getItem(CARRIER_ID_STORAGE_KEY) || 'default';

      // Create unique user ID from email or session
      const userId = session.user.email || session.user.id || `session_${Date.now()}`;

      // Create session ID
      const sessionId = `${userId}_${carrierId}_${Date.now()}`;

      newUserContext = {
        userId: btoa(userId), // Base64 encode for safe storage keys
        carrierId,
        sessionId,
        email: session.user.email || undefined
      };

      console.log('🆔 User identified for cache management:', {
        userId: newUserContext.userId,
        carrierId: newUserContext.carrierId,
        email: newUserContext.email
      });
    } else {
      // Fallback for unauthenticated users
      const carrierId = localStorage.getItem(CARRIER_ID_STORAGE_KEY) || 'anonymous';
      const anonymousId = localStorage.getItem('anonymousUserId') || `anon_${Date.now()}`;

      // Store anonymous ID for consistency
      localStorage.setItem('anonymousUserId', anonymousId);

      newUserContext = {
        userId: btoa(anonymousId),
        carrierId,
        sessionId: `${anonymousId}_${carrierId}_${Date.now()}`,
      };

      console.log('🕵️ Anonymous user identified for cache management:', {
        userId: newUserContext.userId,
        carrierId: newUserContext.carrierId
      });
    }

    setUserContext(newUserContext);

    // Create cache manager
    if (newUserContext) {
      const manager = createUserAwareCacheManager(newUserContext);
      setCacheManager(manager);
    }

  }, [session, status]);

  // Memoized context value
  const contextValue = useMemo<UserCacheContextType>(() => ({
    userContext,
    cacheManager,
    isUserIdentified: !!userContext,

    clearAllUserCaches: async () => {
      if (cacheManager) {
        await cacheManager.clearAllUserCaches();
      }
    },

    clearUserCache: async (cacheType) => {
      if (cacheManager) {
        await cacheManager.clearUserCache(cacheType);
      }
    },

    getCacheStats: () => {
      return cacheManager?.getCacheStats() || null;
    }

  }), [userContext, cacheManager]);

  return (
    <UserCacheContext.Provider value={contextValue}>
      {children}
    </UserCacheContext.Provider>
  );
}

export function useUserCache() {
  const context = useContext(UserCacheContext);
  if (!context) {
    throw new Error('useUserCache must be used within a UserCacheProvider');
  }
  return context;
}

/**
 * Hook to get user-aware storage (replaces direct localStorage usage)
 */
export function useUserAwareStorage() {
  const { cacheManager } = useUserCache();

  if (!cacheManager) {
    // Fallback to regular localStorage if no user context
    return {
      setItem: (key: string, value: string) => localStorage.setItem(key, value),
      getItem: (key: string) => localStorage.getItem(key),
      removeItem: (key: string) => localStorage.removeItem(key),
      clearUserData: () => console.warn('No user context for clearUserData')
    };
  }

  return cacheManager.getStorage();
}

/**
 * Hook to get user-aware memory cache
 */
export function useUserAwareMemoryCache() {
  const { cacheManager } = useUserCache();

  if (!cacheManager) {
    // Fallback to simple Map if no user context
    const fallbackCache = new Map();
    return {
      set: (key: string, value: any) => fallbackCache.set(key, value),
      get: (key: string) => fallbackCache.get(key),
      delete: (key: string) => fallbackCache.delete(key),
      clearUser: () => fallbackCache.clear(),
      getStats: () => ({ keys: fallbackCache.size, totalUsers: 1 })
    };
  }

  return cacheManager.getMemoryCache();
}