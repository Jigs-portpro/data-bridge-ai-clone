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
    const endIndex = Math.min(startIndex + limit, sessionData.data.length);
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

// Get paginated data with validation
export const getPaginatedSessionData = async (carrier: string, page: number, limit: number) => {
  try {
    await connectToDatabase();
    
    const sessionData = await SessionData.findOne({ carrier });
    
    if (!sessionData) {
      console.log(`No session data found for carrier: ${carrier}`);
      return {
        data: [],
        columns: [],
        totalRows: 0,
        fileName: null,
        sheetName: null,
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          startIndex: 0,
          endIndex: 0,
          hasNextPage: false,
          hasPrevPage: false
        },
        timestamp: new Date()
      };
    }
    
    // Check if data is still valid (within 24 hours)
    const isRecent = Date.now() - sessionData.timestamp.getTime() < 24 * 60 * 60 * 1000;
    
    if (!isRecent) {
      console.log(`Session data expired for carrier: ${carrier}`);
      // Delete expired data
      await SessionData.deleteOne({ carrier });
      await Metadata.deleteOne({ carrier });
      return {
        data: [],
        columns: [],
        totalRows: 0,
        fileName: null,
        sheetName: null,
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          startIndex: 0,
          endIndex: 0,
          hasNextPage: false,
          hasPrevPage: false
        },
        timestamp: new Date()
      };
    }
    
    // Validate page and limit parameters
    if (page < 1 || limit < 1) {
      console.warn(`Invalid pagination parameters: page=${page}, limit=${limit}`);
      return {
        data: [],
        columns: sessionData.columns || [],
        totalRows: sessionData.totalRows || 0,
        fileName: sessionData.fileName,
        sheetName: sessionData.sheetName,
        pagination: {
          page: 1,
          limit: 500,
          total: sessionData.totalRows || 0,
          totalPages: Math.ceil((sessionData.totalRows || 0) / 500),
          startIndex: 0,
          endIndex: 0,
          hasNextPage: false,
          hasPrevPage: false
        },
        timestamp: sessionData.timestamp
      };
    }
    
    // Calculate pagination
    const totalRows = sessionData.totalRows || sessionData.data?.length || 0;
    const totalPages = Math.ceil(totalRows / limit);
    
    // Handle case where there's no data
    if (totalRows === 0) {
      return {
        data: [],
        columns: sessionData.columns || [],
        totalRows: 0,
        fileName: sessionData.fileName,
        sheetName: sessionData.sheetName,
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          startIndex: 0,
          endIndex: 0,
          hasNextPage: false,
          hasPrevPage: false
        },
        timestamp: sessionData.timestamp
      };
    }
    
    // Validate page number and adjust if necessary
    let adjustedPage = page;
    if (page > totalPages && totalPages > 0) {
      console.warn(`Page ${page} exceeds total pages ${totalPages}, adjusting to page 1`);
      adjustedPage = 1;
    }
    
    // Get paginated data
    const startIndex = (adjustedPage - 1) * limit;
    const endIndex = Math.min(startIndex + limit, totalRows);
    
    // Ensure we don't go out of bounds
    if (startIndex >= totalRows) {
      console.warn(`Start index ${startIndex} exceeds total rows ${totalRows}, returning empty data`);
      return {
        data: [],
        columns: sessionData.columns || [],
        totalRows,
        fileName: sessionData.fileName,
        sheetName: sessionData.sheetName,
        pagination: {
          page: adjustedPage,
          limit,
          total: totalRows,
          totalPages,
          startIndex: 0,
          endIndex: 0,
          hasNextPage: false,
          hasPrevPage: false
        },
        timestamp: sessionData.timestamp
      };
    }
    
    const paginatedData = sessionData.data.slice(startIndex, endIndex);
    
    // Validate that we got the expected number of rows
    const expectedRows = Math.min(limit, totalRows - startIndex);
    if (paginatedData.length !== expectedRows) {
      console.warn(`Expected ${expectedRows} rows for page ${adjustedPage}, got ${paginatedData.length}`);
    }
    
    const pagination = {
      page: adjustedPage,
      limit,
      total: totalRows,
      totalPages,
      startIndex,
      endIndex,
      hasNextPage: adjustedPage < totalPages,
      hasPrevPage: adjustedPage > 1
    };

    return {
      data: paginatedData,
      columns: sessionData.columns || [],
      totalRows,
      fileName: sessionData.fileName,
      sheetName: sessionData.sheetName,
      pagination,
      timestamp: sessionData.timestamp
    };
  } catch (error) {
    console.error(`Error in getPaginatedSessionData for carrier ${carrier}:`, error);
    // Return a safe fallback response
    return {
      data: [],
      columns: [],
      totalRows: 0,
      fileName: null,
      sheetName: null,
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
        startIndex: 0,
        endIndex: 0,
        hasNextPage: false,
        hasPrevPage: false
      },
      timestamp: new Date()
    };
  }
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
export const updateSessionData = async (carrier: string, page: number, limit: number, docs: { data?: any[], mappings?: Record<string, string>, confidences?: Record<string, { score: number; reasoning: string } | null>, columns?: string[] }) => {
  try {
    await connectToDatabase();

    const { data, columns, ...rest } = docs;
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

    // If columns are being updated, transform the data structure to match new column names
    if (columns && Array.isArray(columns) && columns.length > 0) {
      const originalColumns = sessionData.columns || [];
      
      // Check if column names have actually changed
      const hasColumnChanges = columns.some((col, index) => {
        const originalCol = originalColumns[index];
        return col !== originalCol;
      });

      if (hasColumnChanges) {
        // Transform the data structure to use new column names as keys
        const transformedData = sessionData.data.map((row: Record<string, any>) => {
          const newRow: Record<string, any> = {};
          
          // Map each column to its new name
          columns.forEach((newColName, index) => {
            const originalColName = originalColumns[index];
            if (originalColName && newColName) {
              // Copy value from old column name to new column name
              newRow[newColName] = row[originalColName];
            } else if (newColName) {
              // For newly named columns (previously null), set empty value
              newRow[newColName] = '';
            }
          });
          
          return newRow;
        });

        // Update the data with transformed structure
        sessionData.data = transformedData;
      }

      // Update the columns
      sessionData.columns = columns;
    }

    // Optionally update other fields if present in rest
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
      
      } else {
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

export const clearExportedDataFromMongoDB = async (carrier: string, entityName: string, successfulRows: Record<string, any>[]) => {
  await connectToDatabase();
  
  try {
    const sessionData = await SessionData.findOne({ carrier });
    
    if (!sessionData) {
      console.log(`No session data found for carrier: ${carrier}`);
      return { success: false, message: "No session data found" };
    }

    // Create a set of unique row identifiers for exact matching
    const successfulRowIdentifiers = new Set<string>();
    
    successfulRows.forEach((row: Record<string, any>) => {
      // Create a unique fingerprint for each row using key fields
      const profileName = row['Profile Name'] || row['Profile Name*'] || row['Company Name'] || row['Company Name*'];
      const address = row['Address'] || row['Address*'] || row['Street'] || row['Street Address'];
      const city = row['City'] || row['City*'] || row['Town'];
      const zipCode = row['Zip Code'] || row['Zip Code*'] || row['Postal Code'] || row['Postcode'];
      const email = row.email || row.Email || row['Email*'] || row['Login Email Address'];
      
      // Create unique identifier using profile name + address + city + zip
      if (profileName && address && city && zipCode) {
        const identifier = `${profileName.trim()}_${address.trim()}_${city.trim()}_${zipCode.trim()}`;
        successfulRowIdentifiers.add(identifier);
      }
      
      // Fallback: use email if available
      if (email && email.trim()) {
        const emailIdentifier = `email:${email.trim()}`;
        successfulRowIdentifiers.add(emailIdentifier);
      }
      
      // Additional fallback: use any unique combination of available fields
      if (!profileName && !email) {
        // Try to create identifier from other available fields
        const availableFields = Object.keys(row).filter(key => row[key] && String(row[key]).trim());
        if (availableFields.length >= 2) {
          const fallbackIdentifier = availableFields.slice(0, 3).map(key => `${key}:${String(row[key]).trim()}`).join('_');
          successfulRowIdentifiers.add(fallbackIdentifier);
        }
      }
    });

    // Filter out successful rows from the data
    const originalDataLength = sessionData.data.length;
    const filteredData = sessionData.data.filter((row: Record<string, any>) => {
      // Create the same identifier for the current row
      const profileName = row['Profile Name'] || row['Profile Name*'] || row['Company Name'] || row['Company Name*'];
      const address = row['Address'] || row['Address*'] || row['Street'] || row['Street Address'];
      const city = row['City'] || row['City*'] || row['Town'];
      const zipCode = row['Zip Code'] || row['Zip Code*'] || row['Postal Code'] || row['Postcode'];
      const email = row.email || row.Email || row['Email*'] || row['Login Email Address'];
      
      // Check if this row should be kept (not exported successfully)
      for (const identifier of Array.from(successfulRowIdentifiers)) {
        if (identifier.startsWith('email:')) {
          // Email-based matching
          const emailValue = identifier.replace('email:', '');
          if (email && email.trim() === emailValue) {
            return false; // This row was exported successfully, remove it
          }
        } else if (identifier.includes(':')) {
          // Fallback identifier format (field:value_field:value_field:value)
          const fallbackParts = identifier.split('_');
          let allFieldsMatch = true;
          
          for (const part of fallbackParts) {
            const [fieldName, fieldValue] = part.split(':');
            if (fieldName && fieldValue) {
              const rowValue = row[fieldName];
              if (!rowValue || String(rowValue).trim() !== fieldValue) {
                allFieldsMatch = false;
                break;
              }
            }
          }
          
          if (allFieldsMatch) {
            return false; // This row was exported successfully, remove it
          }
        } else {
          // Profile name + address + city + zip matching
          if (profileName && address && city && zipCode) {
            const rowIdentifier = `${profileName.trim()}_${address.trim()}_${city.trim()}_${zipCode.trim()}`;
            if (rowIdentifier === identifier) {
              return false; // This row was exported successfully, remove it
            }
          }
        }
      }
      
      return true; // Keep this row (it wasn't exported successfully)
    });

    // Update the session data with filtered data
    sessionData.data = filteredData;
    sessionData.totalRows = filteredData.length;
    sessionData.timestamp = new Date();
    
    await sessionData.save();

    const removedRowsCount = originalDataLength - filteredData.length;
    
    
    
    return {
      success: true,
      message: `Cleared ${removedRowsCount} exported rows`,
      removedRowsCount,
      remainingRowsCount: filteredData.length,
      totalRows: filteredData.length
    };
    
  } catch (error: any) {
    console.error(`❌ Error clearing exported data for ${carrier}:`, error);
    return { 
      success: false, 
      message: `Error clearing exported data: ${error.message || 'Unknown error'}`,
      error: error.message || 'Unknown error'
    };
  }
};

export const deleteRowsFromMongoDB = async (carrier: string, entityName: string, rowsToDelete: Record<string, any>[], deletionType: string = 'manual') => {
  await connectToDatabase();
  
  try {
    const sessionData = await SessionData.findOne({ carrier });
    
    if (!sessionData) {
      console.log(`No session data found for carrier: ${carrier}`);
      return { success: false, message: "No session data found" };
    }

    // Create a set of unique row identifiers for exact matching
    const rowsToDeleteIdentifiers = new Set<string>();
    
    rowsToDelete.forEach((row: Record<string, any>) => {
      // Create a unique fingerprint for each row using key fields
      const profileName = row['Profile Name'] || row['Profile Name*'];
      const address = row['Address'] || row['Address*'];
      const city = row['City'] || row['City*'];
      const zipCode = row['Zip Code'] || row['Zip Code*'];
      const email = row.email || row.Email || row['Email*'];
      
      // Create unique identifier using profile name + address + city + zip
      if (profileName && address && city && zipCode) {
        const identifier = `${profileName.trim()}_${address.trim()}_${city.trim()}_${zipCode.trim()}`;
        rowsToDeleteIdentifiers.add(identifier);
      }
      
      // Fallback: use email if available
      if (email && email.trim()) {
        const emailIdentifier = `email:${email.trim()}`;
        rowsToDeleteIdentifiers.add(emailIdentifier);
      }
    });

    // Filter out rows to delete from the data
    const originalDataLength = sessionData.data.length;
    const filteredData = sessionData.data.filter((row: Record<string, any>) => {
      // Create the same identifier for the current row
      const profileName = row['Profile Name'] || row['Profile Name*'];
      const address = row['Address'] || row['Address*'];
      const city = row['City'] || row['City*'];
      const zipCode = row['Zip Code'] || row['Zip Code*'];
      const email = row.email || row.Email || row['Email*'];
      
      // Check if this row should be deleted
      for (const identifier of Array.from(rowsToDeleteIdentifiers)) {
        if (identifier.startsWith('email:')) {
          // Email-based matching
          const emailValue = identifier.replace('email:', '');
          if (email && email.trim() === emailValue) {
            return false; // This row should be deleted
          }
        } else {
          // Profile name + address + city + zip matching
          if (profileName && address && city && zipCode) {
            const rowIdentifier = `${profileName.trim()}_${address.trim()}_${city.trim()}_${zipCode.trim()}`;
            if (rowIdentifier === identifier) {
              return false; // This row should be deleted
            }
          }
        }
      }
      
      return true; // Keep this row (it's not in the deletion list)
    });

    // Update the session data with filtered data
    sessionData.data = filteredData;
    sessionData.totalRows = filteredData.length;
    sessionData.timestamp = new Date();
    
    await sessionData.save();

    const deletedRowsCount = originalDataLength - filteredData.length;
    
    
    return {
      success: true,
      message: `Deleted ${deletedRowsCount} rows`,
      deletedRowsCount,
      remainingRowsCount: filteredData.length,
      totalRows: filteredData.length,
      deletionType
    };
    
  } catch (error: any) {
    console.error(`❌ Error deleting rows for ${carrier}:`, error);
    return { 
      success: false, 
      message: `Error deleting rows: ${error.message || 'Unknown error'}`,
      error: error.message || 'Unknown error'
    };
  }
};

// Backward compatibility - these functions match the Redis helpers API
export { generateAbortKey }; 