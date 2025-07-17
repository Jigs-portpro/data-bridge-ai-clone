"use server"

import connectToDatabase from '@/lib/mongodb';
import { SessionData, Metadata, LookupCache, AbortSignal, generateAbortKey } from '@/lib/models/sessions';
import EntityModel from '@/lib/models/entity';
import { ExportConfig } from '@/config/exportEntities';


export const storeSessionData = async (sessionId: string, entityName: string, data: Record<string, any>[], columns: string[], fileName?: string, sheetName?: string, carrier?: string) => {
  await connectToDatabase();
  
  const sessionData = await SessionData.findOneAndUpdate(
    { carrier},
    {
      sessionId,
      entityName,
      data,
      carrier,
      columns,
      fileName,
      sheetName,
      totalRows: data?.length,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    },
    { upsert: true, new: true }
  );
  
  return sessionData;
};

export const getSessionData = async (carrier: string, page?: number, limit?: number) => {
  await connectToDatabase();
  
  const sessionData = await SessionData.findOne({ carrier });
  
  if (!sessionData) {
    return null;
  }
  
  // Check if data is still valid (within 24 hours)
  const isRecent = Date.now() - sessionData.timestamp.getTime() < 24 * 60 * 60 * 1000;
  
  if (!isRecent) {
    // Delete expired data
    await SessionData.deleteOne({ carrier });
    await Metadata.deleteOne({ carrier });
    return null;
  }
  
  let paginatedData = sessionData.data;
  let pagination = undefined;
  
  if (page && limit) {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    paginatedData = sessionData.data.slice(startIndex, endIndex);
    
    pagination = {
      page,
      limit,
      total: sessionData.totalRows,
      totalPages: Math.ceil(sessionData.totalRows / limit)
    };
  }


  return {
    ...sessionData,
    data: paginatedData,
    columns: sessionData.columns,
    totalRows: sessionData.totalRows,
    fileName: sessionData.fileName,
    sheetName: sessionData.sheetName,
    pagination,
    timestamp: sessionData.timestamp
  };
};

// Metadata Operations
export const storeMetadata = async (sessionId: string, entityName: string, metadata: {
  columns: string[];
  totalRows: number;
  datatableEditedCells?: string[];
  errorRows?: number[];
  errorCells?: Record<string, string[]>;
  errorMessages?: Record<string, string>;
  hasValidated?: boolean;
  validationMessages?: string[];
  organizedData?: Record<string, any>[];
}) => {
  await connectToDatabase();
  
  const metadataDoc = await Metadata.findOneAndUpdate(
    { sessionId, entityName },
    {
      sessionId,
      entityName,
      ...metadata,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    },
    { upsert: true, new: true }
  );
  
  return metadataDoc;
};

export const getMetadata = async (carrier: string) => {
  await connectToDatabase();
  
  const metadata = await Metadata.findOne({ carrier });
  
  if (!metadata) {
    return null;
  }
  
  // Check if metadata is still valid (within 24 hours)
  const isRecent = Date.now() - metadata.timestamp.getTime() < 24 * 60 * 60 * 1000;
  
  if (!isRecent) {
    // Delete expired metadata
    await Metadata.deleteOne({ carrier });
    return null;
  }
  
  return metadata;
};

// Combined data and metadata operations
export const storeDataWithMetadata = async (sessionId: string, entityName: string, data: Record<string, any>[], columns: string[], metadata: {
  datatableEditedCells?: string[];
  errorRows?: number[];
  errorCells?: Record<string, string[]>;
  errorMessages?: Record<string, string>;
  hasValidated?: boolean;
  validationMessages?: string[];
  organizedData?: Record<string, any>[];
}) => {
  await connectToDatabase();
  
  // Store session data
  await storeSessionData(sessionId, entityName, data, columns);
  
  // Store metadata
  await storeMetadata(sessionId, entityName, {
    columns,
    totalRows: data?.length,
    ...metadata
  });
  
  return { success: true, totalRows: data?.length };
};

export const getDataWithMetadata = async (carrier: string, page?: number, limit?: number) => {
  await connectToDatabase();
  
  const [sessionData, metadata] = await Promise.all([
    getSessionData(carrier, page, limit),
    getMetadata(carrier)
  ]);
  
  if (!sessionData) {
    return null;
  }
  
  delete sessionData.data;
  console.log("sessionData", sessionData);
  return {
    ...sessionData,
    // entityName: sessionData.entityName,
    datatableEditedCells: metadata?.datatableEditedCells || [],
    errorRows: metadata?.errorRows || [],
    errorCells: metadata?.errorCells || {},
    errorMessages: metadata?.errorMessages || {},
    hasValidated: metadata?.hasValidated || false,
    validationMessages: metadata?.validationMessages || [],
    organizedData: metadata?.organizedData,
    timestamp: sessionData.timestamp
  };
};

// update session data by carrier id, based on given page number and remove that page data from session data
export const updateSessionData = async (carrier: string, page: number, limit: number, docs: { data?: any[], mappings?: Record<string, string>, confidences?: Record<string, { score: number; reasoning: string } | null> }) => {
  try {
    await connectToDatabase();

    const { data, ...rest } = docs;
    const sessionData = await SessionData.findOne({ carrier });

    if (!sessionData) {
      return null;
    }

    if(data && data?.length > 0) {
      const startIndex = (page - 1) * limit;

      // Remove the old page's data
      sessionData.data.splice(startIndex, limit);
  
      // Insert the new data (array of objects) at the correct position
      sessionData.data.splice(startIndex, 0, ...data ?? []);
    }

    // Optionally update columns, datatableEditedCells, etc. if present in rest
    if(Object.keys(rest ?? {}).length > 0) {
      for (const [key, value] of Object.entries(rest ?? {})) {
        sessionData[key] = value;
      }
    }

    // Update timestamp and totalRows
    sessionData.timestamp = new Date();
    sessionData.totalRows = Array.isArray(sessionData.data) ? sessionData.data?.length : 0;

    await sessionData.save();

    return JSON.stringify(sessionData);
  } catch (error) {
    console.error(`❌ Error updating session data for ${carrier}:`, error);
    return null;
  }
};

// Session Management
export const clearSessionData = async (carrier: string) => {
  await connectToDatabase();
  
  try {
    // Delete all session data and metadata for this session
    const [sessionResult, metadataResult] = await Promise.all([
      SessionData.deleteMany({ carrier }),
      Metadata.deleteMany({ carrier })
    ]);
    
    const totalDeleted = sessionResult.deletedCount + metadataResult.deletedCount;
    
    console.log(`🗑️ Cleared ${totalDeleted} MongoDB documents for session: ${carrier}`);
  } catch (error) {
    console.error(`❌ Error clearing session data for ${carrier}:`, error);
    // Don't throw error - continue with upload even if cleanup fails
  }
};

export const clearEntityData = async (carrier: string) => {
  await connectToDatabase();
  
  try {
    // Delete specific entity data and metadata
    const [sessionResult, metadataResult] = await Promise.all([
      SessionData.deleteOne({ carrier }),
      Metadata.deleteOne({ carrier })
    ]);
    
    const totalDeleted = sessionResult.deletedCount + metadataResult.deletedCount;
    
    if (totalDeleted > 0) {
      console.log(`🗑️ Cleared data and metadata for carrier: ${carrier}`);
    } else {
      console.log(`🗑️ No existing data found for carrier: ${carrier}`);
    }
  } catch (error) {
    console.error(`❌ Error clearing entity data for carrier: ${carrier}`, error);
    // Don't throw error - continue with operation even if cleanup fails
  }
};

// Lookup Cache Operations
export const storeLookupCache = async (sessionId: string, lookupType: string, data: any[]) => {
  await connectToDatabase();
  
  const lookupCache = await LookupCache.findOneAndUpdate(
    { sessionId, lookupType },
    {
      sessionId,
      lookupType,
      data,
      lastFetched: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    },
    { upsert: true, new: true }
  );
  
  return lookupCache;
};

export const getLookupCache = async (sessionId: string, lookupType: string) => {
  await connectToDatabase();
  
  const lookupCache = await LookupCache.findOne({ sessionId, lookupType });
  
  if (!lookupCache) {
    return null;
  }
  
  // Check if cache is still valid (within 24 hours)
  const isRecent = Date.now() - lookupCache.lastFetched.getTime() < 24 * 60 * 60 * 1000;
  
  if (!isRecent) {
    // Delete expired cache
    await LookupCache.deleteOne({ sessionId, lookupType });
    return null;
  }
  
  return lookupCache;
};

export const clearLookupCache = async (sessionId: string, lookupType?: string) => {
  await connectToDatabase();
  
  try {
    let result;
    if (lookupType) {
      result = await LookupCache.deleteOne({ sessionId, lookupType });
    } else {
      result = await LookupCache.deleteMany({ sessionId });
    }
    
    console.log(`🗑️ Cleared ${result.deletedCount} lookup cache entries for session: ${sessionId}`);
  } catch (error) {
    console.error(`❌ Error clearing lookup cache for ${sessionId}:`, error);
  }
};

// Abort Signal Operations
export const setAbortSignal = async (sessionId: string, entitySessionId: string, reason?: string) => {
  await connectToDatabase();
  
  const abortSignal = await AbortSignal.findOneAndUpdate(
    { sessionId, entitySessionId },
    {
      sessionId,
      entitySessionId,
      aborted: true,
      reason,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
    },
    { upsert: true, new: true }
  );
  
  return abortSignal;
};

export const getAbortSignal = async (sessionId: string, entitySessionId: string) => {
  await connectToDatabase();
  
  const abortSignal = await AbortSignal.findOne({ sessionId, entitySessionId });
  
  if (!abortSignal) {
    return null;
  }
  
  // Check if abort signal is still valid (within 5 minutes)
  const isRecent = Date.now() - abortSignal.timestamp.getTime() < 5 * 60 * 1000;
  
  if (!isRecent) {
    // Delete expired abort signal
    await AbortSignal.deleteOne({ sessionId, entitySessionId });
    return null;
  }
  
  return abortSignal;
};

export const clearAbortSignal = async (sessionId: string, entitySessionId: string) => {
  await connectToDatabase();
  
  try {
    const result = await AbortSignal.deleteOne({ sessionId, entitySessionId });
    
    if (result.deletedCount > 0) {
      console.log(`🗑️ Cleared abort signal for ${sessionId}-${entitySessionId}`);
    }
  } catch (error) {
    console.error(`❌ Error clearing abort signal for ${sessionId}-${entitySessionId}:`, error);
  }
};



//  entity operations 
export const storeEntity = async (docId: string, entity: ExportConfig) => {
  try {
    await connectToDatabase();

    let entityModel = null;
    if(docId) {
      entityModel = await EntityModel.findOne({ _id: docId });
    }
    
    if (!entityModel) {
      entityModel = await EntityModel.create({ ...entity });
    } else {
      await EntityModel.updateOne({ _id: docId }, entity);
      entityModel = await EntityModel.findOne({ _id: docId });
    }

    return JSON.stringify(entityModel);
  } catch (error) {
    console.error(`❌ Error storing entity:`, error);
    return null;
  }
}

export const getEntity = async () => {
  try {
    await connectToDatabase();
    const entityModel = await EntityModel.findOne();
    return JSON.stringify(entityModel);
  } catch (error) {
    console.error(`❌ Error getting entity:`, error);
    return null;
  }
}


// Backward compatibility - these functions match the Redis helpers API
export { generateAbortKey }; 