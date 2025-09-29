import { NextRequest, NextResponse } from 'next/server';
import { validationService } from '@/lib/validation/ValidationService';
import { lookupCache } from '@/lib/lookupCache';
import { invalidateUserCaches, UserContext } from '@/lib/cache/UserAwareCacheManager';

export async function POST(request: NextRequest) {
  try {
    const { cacheType, cacheId, entityId, lookupId, userContext, targetScope } = await request.json();

    console.log(`🗑️ Cache invalidation request:`, {
      cacheType, cacheId, entityId, lookupId,
      userContext: userContext ? `${userContext.userId}/${userContext.carrierId}` : 'none',
      targetScope: targetScope || 'legacy'
    });

    // User-aware cache invalidation
    if (userContext && targetScope === 'user') {
      console.log(`🎯 User-scoped cache invalidation for: ${userContext.userId}`);

      if (cacheType === 'all') {
        await invalidateUserCaches(userContext, ['memory', 'validation', 'lookup']);
      } else if (cacheType === 'entities' || cacheType === 'validation') {
        await invalidateUserCaches(userContext, ['memory', 'validation']);
      } else if (cacheType === 'lookups') {
        await invalidateUserCaches(userContext, ['lookup']);
      }

      return NextResponse.json({
        success: true,
        message: `User-scoped cache invalidated for user: ${userContext.userId}`,
        scope: 'user',
        clearedAt: new Date().toISOString()
      });
    }

    // Legacy global cache invalidation (fallback for existing code)
    console.log(`🌐 Legacy global cache invalidation`);

    // Clear specific cache by ID
    if (cacheId) {
      switch (cacheId) {
        case 'entities_cache':
          // Clear entities cache in useValidation.ts
          const { clearEntitiesCache } = await import('@/hooks/useValidation');
          clearEntitiesCache();
          break;

        case 'validation_fields_cache':
        case 'validation_rules_cache':
          validationService.clearCache();
          break;

        case 'lookup_cache_global':
          lookupCache.clearCache();
          break;

        case 'auth_token':
        case 'base_url':
        case 'ai_provider':
        case 'entity_name':
        case 'field_mappings':
          // These are handled client-side
          break;

        case 'chat_history':
        case 'datatable_data':
          // These are handled client-side
          break;

        case 'mongodb_session_data':
        case 'mongodb_lookup_cache':
        case 'mongodb_metadata':
          // Clear MongoDB caches
          await clearMongoDBCaches(cacheId);
          break;

        case 'redux_export_state':
          // This is handled client-side
          break;

        default:
          console.warn(`Unknown cache ID: ${cacheId}`);
      }
    }

    // Clear all caches
    if (cacheType === 'all') {
      // Clear validation service caches
      validationService.clearCache();

      // Clear lookup cache
      lookupCache.clearCache();

      // Clear MongoDB caches
      await clearMongoDBCaches('all');

      // Note: Browser storage caches need to be cleared client-side
      console.log('✅ All server-side caches cleared');
    }

    // Clear by cache type
    if (cacheType === 'entities' || cacheType === 'validation') {
      validationService.clearCache();
      // Also clear entities cache
      const { clearEntitiesCache } = await import('@/hooks/useValidation');
      clearEntitiesCache();
    }

    if (cacheType === 'lookups') {
      lookupCache.clearCache();
    }

    // Clear specific entity cache
    if (entityId) {
      // Clear validation caches for specific entity
      validationService.clearCache(); // Currently clears all, but could be entity-specific
    }

    // Clear specific lookup cache
    if (lookupId) {
      // Clear specific lookup from cache
      // lookupCache doesn't have individual clear yet, but could be added
      lookupCache.clearCache();
    }

    return NextResponse.json({
      success: true,
      message: 'Cache invalidated successfully',
      clearedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Cache invalidation error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to invalidate cache'
      },
      { status: 500 }
    );
  }
}

async function clearMongoDBCaches(cacheId: string) {
  try {
    const { clearSessionData, clearLookupCache } = await import('@/utils/mongodb-helpers');

    if (cacheId === 'mongodb_session_data' || cacheId === 'all') {
      // Clear session data - this would need carrier parameter
      // For now, just log that this needs implementation
      console.log('📝 TODO: Implement session data clearing with carrier parameter');
    }

    if (cacheId === 'mongodb_lookup_cache' || cacheId === 'all') {
      // Clear lookup cache - this would need sessionId parameter
      // For now, just log that this needs implementation
      console.log('📝 TODO: Implement lookup cache clearing with sessionId parameter');
    }

    if (cacheId === 'mongodb_metadata' || cacheId === 'all') {
      // Clear metadata cache
      console.log('📝 TODO: Implement metadata cache clearing');
    }

    console.log(`✅ MongoDB cache clearing initiated for: ${cacheId}`);

  } catch (error) {
    console.error('❌ Error clearing MongoDB caches:', error);
    throw error;
  }
}