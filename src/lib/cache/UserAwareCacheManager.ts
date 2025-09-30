/**
 * User-Aware Cache Manager
 * Solves multi-user caching issues across all scenarios:
 * - Single user, single browser (existing)
 * - Multiple users, same browser (shared computer)
 * - Same user, multiple browsers (sync across devices)
 * - Multiple users, multiple browsers (enterprise)
 */

import { validationService } from '@/lib/validation/ValidationService';
import { lookupCache } from '@/lib/lookupCache';

export interface UserContext {
  userId: string;
  carrierId: string;
  sessionId: string;
  email?: string;
}

export interface CacheScope {
  type: 'user' | 'carrier' | 'global';
  userId?: string;
  carrierId?: string;
}

/**
 * Cache key generator that creates user-scoped keys
 */
export class CacheKeyManager {
  private static createUserKey(baseKey: string, userContext: UserContext): string {
    return `${userContext.userId}_${userContext.carrierId}_${baseKey}`;
  }

  private static createCarrierKey(baseKey: string, carrierId: string): string {
    return `${carrierId}_${baseKey}`;
  }

  private static createSessionKey(baseKey: string, sessionId: string): string {
    return `${sessionId}_${baseKey}`;
  }

  /**
   * Generate cache key based on scope
   */
  static generateKey(baseKey: string, scope: CacheScope, userContext?: UserContext): string {
    switch (scope.type) {
      case 'user':
        if (!userContext) throw new Error('UserContext required for user-scoped cache');
        return this.createUserKey(baseKey, userContext);

      case 'carrier':
        const carrierId = scope.carrierId || userContext?.carrierId;
        if (!carrierId) throw new Error('CarrierId required for carrier-scoped cache');
        return this.createCarrierKey(baseKey, carrierId);

      case 'global':
        return baseKey;

      default:
        throw new Error(`Unknown cache scope: ${scope.type}`);
    }
  }
}

/**
 * User-aware localStorage wrapper
 */
export class UserAwareStorage {
  private userContext: UserContext;

  constructor(userContext: UserContext) {
    this.userContext = userContext;
  }

  /**
   * Set item with user scope
   */
  setItem(key: string, value: string, scope: CacheScope = { type: 'user' }): void {
    const scopedKey = CacheKeyManager.generateKey(key, scope, this.userContext);
    localStorage.setItem(scopedKey, value);

    console.log(`🔑 UserAware localStorage.setItem: ${scopedKey}`);
  }

  /**
   * Get item with user scope
   */
  getItem(key: string, scope: CacheScope = { type: 'user' }): string | null {
    const scopedKey = CacheKeyManager.generateKey(key, scope, this.userContext);
    const value = localStorage.getItem(scopedKey);

    console.log(`🔍 UserAware localStorage.getItem: ${scopedKey} = ${value ? 'found' : 'null'}`);
    return value;
  }

  /**
   * Remove item with user scope
   */
  removeItem(key: string, scope: CacheScope = { type: 'user' }): void {
    const scopedKey = CacheKeyManager.generateKey(key, scope, this.userContext);
    localStorage.removeItem(scopedKey);

    console.log(`🗑️ UserAware localStorage.removeItem: ${scopedKey}`);
  }

  /**
   * Clear all user-specific items
   */
  clearUserData(): void {
    const userPrefix = `${this.userContext.userId}_${this.userContext.carrierId}_`;

    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(userPrefix)) {
        localStorage.removeItem(key);
      }
    });

    console.log(`🗑️ Cleared all localStorage for user: ${this.userContext.userId}`);
  }

  /**
   * Get all user-specific items
   */
  getUserItems(): Record<string, string> {
    const userPrefix = `${this.userContext.userId}_${this.userContext.carrierId}_`;
    const userItems: Record<string, string> = {};

    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(userPrefix)) {
        const value = localStorage.getItem(key);
        if (value) {
          // Remove prefix for clean key
          const cleanKey = key.replace(userPrefix, '');
          userItems[cleanKey] = value;
        }
      }
    });

    return userItems;
  }
}

/**
 * User-aware memory cache manager
 */
export class UserAwareMemoryCache {
  private static userCaches = new Map<string, Map<string, any>>();
  private static cacheTimestamps = new Map<string, Map<string, number>>();

  private userContext: UserContext;
  private userCacheKey: string;

  constructor(userContext: UserContext) {
    this.userContext = userContext;
    this.userCacheKey = `${userContext.userId}_${userContext.carrierId}`;

    // Initialize user cache if not exists
    if (!UserAwareMemoryCache.userCaches.has(this.userCacheKey)) {
      UserAwareMemoryCache.userCaches.set(this.userCacheKey, new Map());
      UserAwareMemoryCache.cacheTimestamps.set(this.userCacheKey, new Map());
    }
  }

  /**
   * Set cache value for user
   */
  set(key: string, value: any, ttlMs?: number): void {
    const userCache = UserAwareMemoryCache.userCaches.get(this.userCacheKey)!;
    const timestampCache = UserAwareMemoryCache.cacheTimestamps.get(this.userCacheKey)!;

    userCache.set(key, value);
    timestampCache.set(key, Date.now() + (ttlMs || 5 * 60 * 1000)); // Default 5 min

    console.log(`💾 UserAware memoryCache.set: ${this.userCacheKey}.${key}`);
  }

  /**
   * Get cache value for user
   */
  get(key: string): any {
    const userCache = UserAwareMemoryCache.userCaches.get(this.userCacheKey);
    const timestampCache = UserAwareMemoryCache.cacheTimestamps.get(this.userCacheKey);

    if (!userCache || !timestampCache) return null;

    const expireTime = timestampCache.get(key);
    if (!expireTime || Date.now() > expireTime) {
      // Expired - remove it
      userCache.delete(key);
      timestampCache.delete(key);
      console.log(`⏰ UserAware memoryCache expired: ${this.userCacheKey}.${key}`);
      return null;
    }

    const value = userCache.get(key);
    console.log(`✅ UserAware memoryCache.get: ${this.userCacheKey}.${key} = ${value ? 'found' : 'null'}`);
    return value;
  }

  /**
   * Clear all cache for user
   */
  clearUser(): void {
    UserAwareMemoryCache.userCaches.delete(this.userCacheKey);
    UserAwareMemoryCache.cacheTimestamps.delete(this.userCacheKey);

    console.log(`🗑️ Cleared all memory cache for user: ${this.userCacheKey}`);
  }

  /**
   * Clear specific cache key for user
   */
  delete(key: string): void {
    const userCache = UserAwareMemoryCache.userCaches.get(this.userCacheKey);
    const timestampCache = UserAwareMemoryCache.cacheTimestamps.get(this.userCacheKey);

    userCache?.delete(key);
    timestampCache?.delete(key);

    console.log(`🗑️ UserAware memoryCache.delete: ${this.userCacheKey}.${key}`);
  }

  /**
   * Get cache statistics for user
   */
  getStats(): { keys: number; totalUsers: number } {
    const userCache = UserAwareMemoryCache.userCaches.get(this.userCacheKey);

    return {
      keys: userCache?.size || 0,
      totalUsers: UserAwareMemoryCache.userCaches.size
    };
  }

  /**
   * Get all user cache keys (for debugging)
   */
  static getAllUserCacheKeys(): string[] {
    return Array.from(UserAwareMemoryCache.userCaches.keys());
  }
}

/**
 * Main User-Aware Cache Manager
 */
export class UserAwareCacheManager {
  private userContext: UserContext;
  private storage: UserAwareStorage;
  private memoryCache: UserAwareMemoryCache;

  constructor(userContext: UserContext) {
    this.userContext = userContext;
    this.storage = new UserAwareStorage(userContext);
    this.memoryCache = new UserAwareMemoryCache(userContext);
  }

  /**
   * Get user context
   */
  getUserContext(): UserContext {
    return this.userContext;
  }

  /**
   * Get storage manager
   */
  getStorage(): UserAwareStorage {
    return this.storage;
  }

  /**
   * Get memory cache manager
   */
  getMemoryCache(): UserAwareMemoryCache {
    return this.memoryCache;
  }

  /**
   * Clear all caches for current user
   */
  async clearAllUserCaches(): Promise<void> {
    console.log(`🗑️ Clearing ALL caches for user: ${this.userContext.userId}`);

    // Clear memory caches
    this.memoryCache.clearUser();

    // Clear localStorage
    this.storage.clearUserData();

    // Clear validation service caches (user-specific)
    validationService.clearCache();

    // Clear lookup cache (user-specific)
    lookupCache.clearCache();

    // Clear MongoDB caches (to be implemented)
    await this.clearMongoDBUserCaches();

    console.log(`✅ All caches cleared for user: ${this.userContext.userId}`);
  }

  /**
   * Clear specific cache type for user
   */
  async clearUserCache(cacheType: 'memory' | 'localStorage' | 'validation' | 'lookup' | 'mongodb'): Promise<void> {
    console.log(`🗑️ Clearing ${cacheType} cache for user: ${this.userContext.userId}`);

    switch (cacheType) {
      case 'memory':
        this.memoryCache.clearUser();
        break;

      case 'localStorage':
        this.storage.clearUserData();
        break;

      case 'validation':
        validationService.clearCache();
        break;

      case 'lookup':
        lookupCache.clearCache();
        break;

      case 'mongodb':
        await this.clearMongoDBUserCaches();
        break;
    }

    console.log(`✅ ${cacheType} cache cleared for user: ${this.userContext.userId}`);
  }

  /**
   * Clear MongoDB caches for user (to be implemented with user-scoped collections)
   */
  private async clearMongoDBUserCaches(): Promise<void> {
    try {
      // This will be implemented when we add userId to MongoDB collections
      console.log(`📝 TODO: Clear MongoDB caches for user: ${this.userContext.userId}`);

      // For now, just log what would be cleared
      console.log(`📝 Would clear: sessions, lookup_cache, metadata for userId: ${this.userContext.userId}`);

    } catch (error) {
      console.error('Error clearing MongoDB user caches:', error);
    }
  }

  /**
   * Get cache statistics for user
   */
  getCacheStats(): {
    userId: string;
    carrierId: string;
    memory: { keys: number; totalUsers: number };
    localStorage: { keys: number };
  } {
    const memoryStats = this.memoryCache.getStats();
    const localStorageItems = this.storage.getUserItems();

    return {
      userId: this.userContext.userId,
      carrierId: this.userContext.carrierId,
      memory: memoryStats,
      localStorage: { keys: Object.keys(localStorageItems).length }
    };
  }
}

/**
 * Factory function to create user-aware cache manager
 */
export function createUserAwareCacheManager(userContext: UserContext): UserAwareCacheManager {
  return new UserAwareCacheManager(userContext);
}

/**
 * Global cache invalidation that respects user scope
 */
export async function invalidateUserCaches(
  userContext: UserContext,
  cacheTypes: ('memory' | 'localStorage' | 'validation' | 'lookup' | 'mongodb')[] = ['memory', 'validation', 'lookup']
): Promise<void> {
  console.log(`🗑️ Invalidating caches for user: ${userContext.userId}, types: ${cacheTypes.join(', ')}`);

  const cacheManager = createUserAwareCacheManager(userContext);

  for (const cacheType of cacheTypes) {
    await cacheManager.clearUserCache(cacheType);
  }

  console.log(`✅ Cache invalidation complete for user: ${userContext.userId}`);
}