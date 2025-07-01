import redis from '@/lib/redis';

export const generateRedisKey = (sessionId: string, entityName: string) => {
  return `${sessionId}-ENTITY-${entityName}`;
};

/**
 * Clears all Redis data for a given session
 * @param sessionId - The session ID to clear data for
 */
export const clearSessionData = async (sessionId: string) => {
  try {
    // Get all keys that match the session pattern
    const pattern = `${sessionId}-*`;
    const keys = await redis.keys(pattern);
    
    if (keys.length > 0) {
      // Delete all matching keys
      await redis.del(...keys);
      console.log(`🗑️ Cleared ${keys.length} Redis keys for session: ${sessionId}`);
    } else {
      console.log(`🗑️ No existing data found for session: ${sessionId}`);
    }
  } catch (error) {
    console.error(`❌ Error clearing session data for ${sessionId}:`, error);
    // Don't throw error - continue with upload even if cleanup fails
  }
};

/**
 * Clears Redis data for a specific session and entity
 * @param sessionId - The session ID
 * @param entityName - The entity name to clear data for
 */
export const clearEntityData = async (sessionId: string, entityName: string) => {
  try {
    const redisKey = generateRedisKey(sessionId, entityName);
    const result = await redis.del(redisKey);
    
    if (result > 0) {
      console.log(`🗑️ Cleared data for ${entityName} in session: ${sessionId}`);
    } else {
      console.log(`🗑️ No existing data found for ${entityName} in session: ${sessionId}`);
    }
  } catch (error) {
    console.error(`❌ Error clearing entity data for ${sessionId}-${entityName}:`, error);
    // Don't throw error - continue with operation even if cleanup fails
  }
}; 