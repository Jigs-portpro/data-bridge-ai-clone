"use client";

import { useAppContext } from '@/hooks/useAppContext';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Pencil } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useEntityContext } from '@/contexts/EntityContext';
import { ENTITY_NAME_STORAGE_KEY } from '@/lib/constants';
import { getCustomerTypeLabels } from '@/utils/helpers';
import { Badge } from '@/components/ui/badge';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '@/store';
import {
  setErrorRows,
  setErrorCells,
  setErrorMessages,
  setOrganizedData,
} from '@/store/slices/exportDataSlice';

// Debounce utility
function debounce(fn: (...args: any[]) => void, delay: number) {
  let timer: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function DataTable() {
  const { data, columns, isLoading, fileName, datatableEditedCells, setData, setDatatableEditedCells, entityName, showToast } = useAppContext();
  const { detectedEntity } = useEntityContext();
  const { data: session } = useSession();
  const dispatch = useDispatch();
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [storedEntityName, setStoredEntityName] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const hasClearedState = useRef(false);
  
  // Get validation messages and field mappings from Redux store
  const { 
    validationMessages, 
    hasValidated, 
    fieldMappings,
    errorRows: reduxErrorRows,
    errorCells: reduxErrorCells,
    errorMessages: reduxErrorMessages,
    organizedData: reduxOrganizedData
  } = useSelector((state: RootState) => state.exportData);
  
  // Set mounted state on client side only
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get stored entity name on client side only
  useEffect(() => {
    if (isMounted) {
      const entityNameFromStorage = localStorage.getItem(ENTITY_NAME_STORAGE_KEY);
      setStoredEntityName(entityNameFromStorage);
    }
  }, [isMounted]);

  // Don't render validation-dependent content until mounted to prevent hydration mismatches
  // Also show validation if we have stored validation data in Redux
  const shouldShowValidation = isMounted && (hasValidated || (reduxErrorRows.length > 0 || Object.keys(reduxErrorCells).length > 0));
  
  // Don't render any validation-dependent content during SSR
  const isClientSide = isMounted;

  // Parse validation messages to extract row and column error information
  const parseValidationErrors = useCallback(() => {
    // If we already have stored error data in Redux, use it
    if (reduxErrorRows.length > 0 || Object.keys(reduxErrorCells).length > 0) {
      return {
        errorRows: reduxErrorRows,
        errorCells: reduxErrorCells,
        errorMessages: reduxErrorMessages
      };
    }

    if (!hasValidated || validationMessages.length === 0) {
      return { 
        errorRows: [], 
        errorCells: {},
        errorMessages: {}
      };
    }

    const errorRows = new Set<number>();
    const errorCells = new Map<string, Set<string>>();
    const errorMessages = new Map<string, string>();



    validationMessages.forEach((message) => {
      // Parse messages like "Row 46, "Zip Code" (from "ZIP*"): does not match pattern"
      const rowMatch = message.match(/Row (\d+)/);
      if (rowMatch) {
        const rowIndex = parseInt(rowMatch[1]) - 1; // Convert to 0-based index
        errorRows.add(rowIndex);

        // Try to extract column information - look for "from" pattern first
        const fieldMatch = message.match(/"([^"]+)" \(from "([^"]+)"\)/);
        if (fieldMatch) {
          const targetField = fieldMatch[1];
          const sourceColumn = fieldMatch[2];
          
          // Check if this source column exists in our data
          if (columns.includes(sourceColumn)) {
            const errorKey = `${rowIndex}:${sourceColumn}`;
            
            if (!errorCells.has(sourceColumn)) {
              errorCells.set(sourceColumn, new Set());
            }
            errorCells.get(sourceColumn)!.add(rowIndex.toString());
            errorMessages.set(errorKey, message);
          }
        } else {
          // Try alternative pattern for field names without "from" clause
          const altFieldMatch = message.match(/"([^"]+)"/);
          if (altFieldMatch) {
            const targetField = altFieldMatch[1];
            
            // Use field mappings to find the source column
            const sourceColumn = fieldMappings[targetField];
            
            if (sourceColumn && sourceColumn.trim() !== '') {
              const errorKey = `${rowIndex}:${sourceColumn}`;
              
              if (!errorCells.has(sourceColumn)) {
                errorCells.set(sourceColumn, new Set());
              }
              errorCells.get(sourceColumn)!.add(rowIndex.toString());
              errorMessages.set(errorKey, message);
            } else {
              // Fallback: try to find the source column by looking for exact match or similar names
              const fallbackSourceColumn = columns.find(col => {
                const colLower = col.toLowerCase();
                const targetLower = targetField.toLowerCase();
                
                // Exact match
                if (colLower === targetLower) return true;
                
                // Remove special characters and compare
                const colClean = colLower.replace(/[^a-z0-9]/g, '');
                const targetClean = targetLower.replace(/[^a-z0-9]/g, '');
                if (colClean === targetClean) return true;
                
                // Partial matches
                if (colLower.includes(targetLower) || targetLower.includes(colLower)) return true;
                
                // Common variations
                if (colLower.includes('zip') && targetLower.includes('zip')) return true;
                if (colLower.includes('email') && targetLower.includes('email')) return true;
                if (colLower.includes('phone') && targetLower.includes('phone')) return true;
                
                return false;
              });
              
              if (fallbackSourceColumn) {
                const errorKey = `${rowIndex}:${fallbackSourceColumn}`;
                
                if (!errorCells.has(fallbackSourceColumn)) {
                  errorCells.set(fallbackSourceColumn, new Set());
                }
                errorCells.get(fallbackSourceColumn)!.add(rowIndex.toString());
                errorMessages.set(errorKey, message);
              }
            }
          }
        }
      }
    });



    // Convert to serializable structures for Redux
    const serializableErrorRows = Array.from(errorRows);
    const serializableErrorCells: Record<string, string[]> = {};
    const serializableErrorMessages: Record<string, string> = {};

    // Convert Map to plain object
    errorCells.forEach((rowSet, column) => {
      serializableErrorCells[column] = Array.from(rowSet);
    });

    // Convert Map to plain object
    errorMessages.forEach((message, key) => {
      serializableErrorMessages[key] = message;
    });

    return { 
      errorRows: serializableErrorRows, 
      errorCells: serializableErrorCells, 
      errorMessages: serializableErrorMessages 
    };
  }, [validationMessages, hasValidated, columns, fieldMappings, reduxErrorRows, reduxErrorCells, reduxErrorMessages]);

  // Separate data into error rows and valid rows
  const organizeData = useCallback(() => {
    if (!isClientSide || !shouldShowValidation || data.length === 0) {
      return data;
    }

    // If we have edits, we need to reorganize the data
    if (datatableEditedCells.size > 0) {
      const { errorRows } = parseValidationErrors();
      const errorData = data.filter((_, index) => errorRows.includes(index));
      const validData = data.filter((_, index) => !errorRows.includes(index));
      return [...errorData, ...validData];
    }

    // If we have stored error data in Redux, create organized data
    if (reduxErrorRows.length > 0 || Object.keys(reduxErrorCells).length > 0) {
      const errorData = data.filter((_, index) => reduxErrorRows.includes(index));
      const validData = data.filter((_, index) => !reduxErrorRows.includes(index));
      return [...errorData, ...validData];
    }

    // Use parseValidationErrors to organize data
    const { errorRows } = parseValidationErrors();
    
    const errorData = data.filter((_, index) => errorRows.includes(index));
    const validData = data.filter((_, index) => !errorRows.includes(index));
    
    const organizedData = [...errorData, ...validData];
    
    return organizedData;
  }, [data, isClientSide, shouldShowValidation, parseValidationErrors, reduxErrorRows, reduxErrorCells, datatableEditedCells]);

  // Load organized data from Redis only after validation
  useEffect(() => {
    const loadOrganizedDataFromRedis = async () => {
      try {
        if (!session?.user?.sessionId || !data.length || !hasValidated) {
          return;
        }

        // Only load if we don't already have organized data or error data in Redux
        if (reduxOrganizedData.length > 0 || reduxErrorRows.length > 0 || Object.keys(reduxErrorCells).length > 0) {
          return;
        }

        const displayEntityName = detectedEntity?.entityName || entityName || storedEntityName;
        if (!displayEntityName) {
          return;
        }

        const response = await fetch(`/api/organized-data?sessionId=${session.user.sessionId}&entityName=${displayEntityName}`);
        
        if (response.ok) {
          const storedData = await response.json();
          
          // Restore the organized data and error information
          dispatch(setOrganizedData(storedData.organizedData));
          dispatch(setErrorRows(storedData.errorRows));
          dispatch(setErrorCells(storedData.errorCells));
          dispatch(setErrorMessages(storedData.errorMessages));
        }
      } catch (error) {
        // Silently fail - organized data is not critical
      }
    };

    loadOrganizedDataFromRedis();
  }, [session?.user?.sessionId, data.length, hasValidated, detectedEntity?.entityName, entityName, storedEntityName, dispatch, reduxOrganizedData.length, reduxErrorRows.length, reduxErrorCells]);

  // Reset error highlighting state when data changes (but not during navigation)
  useEffect(() => {
    if (data.length > 0 && !hasValidated && reduxErrorRows.length === 0 && Object.keys(reduxErrorCells).length === 0 && !hasClearedState.current) {
      // Clear error highlighting when new data is loaded and no validation data exists
      hasClearedState.current = true;
      dispatch(setErrorRows([]));
      dispatch(setErrorCells({}));
      dispatch(setErrorMessages({}));
      dispatch(setOrganizedData([]));
    }
  }, [data.length, hasValidated, dispatch]);

  // Clear organized data when edits are made to ensure current data is displayed
  useEffect(() => {
    if (datatableEditedCells.size > 0 && reduxOrganizedData.length > 0) {
      dispatch(setOrganizedData([]));
    }
  }, [datatableEditedCells.size, reduxOrganizedData.length, dispatch]);

  // Save organized data to Redux and Redis when it changes (but not during render)
  useEffect(() => {
    if ((hasValidated || (reduxErrorRows.length > 0 || Object.keys(reduxErrorCells).length > 0)) && data.length > 0) {
      const organizedData = organizeData();
      
      // Only save if it's different from what's already stored
      if (JSON.stringify(organizedData) !== JSON.stringify(reduxOrganizedData)) {
        dispatch(setOrganizedData(organizedData));
        
        // Save to Redis asynchronously
        saveOrganizedDataToRedis(organizedData);
      }
    }
  }, [hasValidated, reduxErrorRows.length, reduxErrorCells, data, organizeData, reduxOrganizedData, dispatch]);

  // Helper function to save organized data to Redis
  const saveOrganizedDataToRedis = async (organizedData: any[]) => {
    try {
      if (!session?.user?.sessionId) {
        return;
      }

      const displayEntityName = detectedEntity?.entityName || entityName || storedEntityName;
      if (!displayEntityName) {
        return;
      }

      const { errorRows, errorCells, errorMessages } = parseValidationErrors();

      const payload = {
        sessionId: session.user.sessionId,
        entityName: displayEntityName,
        organizedData,
        errorRows,
        errorCells,
        errorMessages
      };

      await fetch('/api/organized-data', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      // Silently fail - organized data is not critical
    }
  };

  // Save error data to Redux when it changes (but not during render)
  useEffect(() => {
    if ((hasValidated && validationMessages.length > 0) || (reduxErrorRows.length > 0 || Object.keys(reduxErrorCells).length > 0)) {
      const { errorRows, errorCells, errorMessages } = parseValidationErrors();
      
      // Only save if the data is different from what's already stored
      if (JSON.stringify(errorRows) !== JSON.stringify(reduxErrorRows) ||
          JSON.stringify(errorCells) !== JSON.stringify(reduxErrorCells) ||
          JSON.stringify(errorMessages) !== JSON.stringify(reduxErrorMessages)) {
        dispatch(setErrorRows(errorRows));
        dispatch(setErrorCells(errorCells));
        dispatch(setErrorMessages(errorMessages));
        
        // Clear organized data to force re-organization
        if (reduxOrganizedData.length > 0) {
          dispatch(setOrganizedData([]));
        }
      }
    }
  }, [hasValidated, validationMessages, parseValidationErrors, reduxErrorRows, reduxErrorCells, reduxErrorMessages, reduxOrganizedData.length, dispatch]);

  // Pagination state
  const [displayedCount, setDisplayedCount] = useState(50);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Reset pagination when data changes
  useEffect(() => {
    setDisplayedCount(50);
    setIsLoadingMore(false);
    hasClearedState.current = false; // Reset the cleared state flag when data changes
  }, [data.length]);

  // Handle scroll for pagination
  const handleTableScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = target;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
    
    if (isNearBottom && !isLoadingMore && displayedCount < data.length) {
      setIsLoadingMore(true);
      
      setTimeout(() => {
        const newCount = Math.min(displayedCount + 50, data.length);
        setDisplayedCount(newCount);
        
        setTimeout(() => {
          setIsLoadingMore(false);
        }, 300);
      }, 500);
    }
  }, [data.length, displayedCount, isLoadingMore]);

  // Helper function to check if a cell has an error
  const hasCellError = (rowIndex: number, col: string) => {
    if (!isClientSide || !shouldShowValidation) return false;
    const { errorRows, errorCells } = parseValidationErrors();
    const originalRowIndex = data.findIndex(row => 
      JSON.stringify(row) === JSON.stringify(organizedData[rowIndex])
    );
    
    if (errorRows.includes(originalRowIndex)) {
      // Try exact match first
      let errorCellsForCol = errorCells[col];
      let hasError = errorCellsForCol?.includes(originalRowIndex.toString()) || false;
      
      // If no exact match, try case-insensitive and partial matches
      if (!hasError) {
        for (const [errorCol, errorRows] of Object.entries(errorCells)) {
          const colLower = col.toLowerCase();
          const errorColLower = errorCol.toLowerCase();
          
          // Check for various matching patterns
          if (colLower === errorColLower || 
              colLower.includes(errorColLower) || 
              errorColLower.includes(colLower) ||
              colLower.replace(/[^a-z0-9]/g, '') === errorColLower.replace(/[^a-z0-9]/g, '')) {
            
            hasError = errorRows.includes(originalRowIndex.toString()) || false;
            if (hasError) {
              break;
            }
          }
        }
      }
      
      return hasError;
    }
    return false;
  };

  // Helper function to check if a row has any errors
  const hasRowError = (rowIndex: number) => {
    if (!isClientSide || !shouldShowValidation) return false;
    const errorRows = parseValidationErrors().errorRows;
    const originalRowIndex = data.findIndex(row => 
      JSON.stringify(row) === JSON.stringify(organizedData[rowIndex])
    );
    return errorRows.includes(originalRowIndex);
  };

  // Helper function to get the original row index
  const getOriginalRowIndex = (displayIndex: number) => {
    return data.findIndex(row => 
      JSON.stringify(row) === JSON.stringify(organizedData[displayIndex])
    );
  };

  // Handle double click to start editing
  const handleCellDoubleClick = (rowIndex: number, col: string) => {
    setEditingCell({ row: rowIndex, col });
    setEditValue(String(organizedData[rowIndex][col] ?? ''));
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  };

  // Helper function to save data to Redis
  const saveDataToRedis = async (updatedData: any[], updatedEditedCells: Set<string>) => {
    try {
      if (!session?.user?.sessionId) {
        console.error('No session ID available for Redis save');
        return;
      }

      const displayEntityName = detectedEntity?.entityName || entityName || storedEntityName;

      if (!displayEntityName) {
        console.error('No entity name available for Redis save');
        return;
      }

      // Get current organized data and validation state
      const organizedData = organizeData();
      const { errorRows, errorCells, errorMessages } = parseValidationErrors();

      const payload = {
        sessionId: session.user.sessionId,
        entityName: displayEntityName,
        data: updatedData,
        columns: columns,
        datatableEditedCells: Array.from(updatedEditedCells),
        organizedData: organizedData,
        errorRows: errorRows,
        errorCells: errorCells,
        errorMessages: errorMessages,
        hasValidated: hasValidated,
        validationMessages: validationMessages,
        timestamp: Date.now()
      };

      const response = await fetch('/api/data', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save data to Redis');
      }
    } catch (error) {
      console.error('Error saving to Redis:', error);
      showToast({
        title: 'Save Error',
        description: 'Failed to auto-save changes. Your changes are preserved locally.',
        variant: 'destructive',
        duration: 5000,
      });
    }
  };

  // Debounced save to Redis
  const debouncedSaveDataToRedis = useMemo(() => debounce(saveDataToRedis, 1000), [session?.user?.sessionId, detectedEntity?.entityName, entityName, storedEntityName, columns, hasValidated, validationMessages]);

  // Memoize expensive functions
  const parsedValidationErrors = useMemo(() => parseValidationErrors(), [parseValidationErrors]);
  const organizedData = useMemo(() => organizeData(), [organizeData]);

  // Save edit on blur or Enter (debounced)
  const saveEdit = async (rowIndex: number, col: string) => {
    const originalValue = String(organizedData[rowIndex][col] ?? '');
    if (editValue !== originalValue) {
      const newData = data.map((row, idx) => {
        if (idx === getOriginalRowIndex(rowIndex)) {
          return { ...row, [col]: editValue };
        }
        return row;
      });
      
      const updatedEditedCells = new Set(datatableEditedCells);
      updatedEditedCells.add(`${getOriginalRowIndex(rowIndex)}:${col}`);

      // Update local state immediately
      setData(newData);
      setDatatableEditedCells(updatedEditedCells);

      // Debounced save to Redis
      debouncedSaveDataToRedis(newData, updatedEditedCells);
    }
    setEditingCell(null);
  };

  // Handle blur
  const handleInputBlur = async (rowIndex: number, col: string) => {
    await saveEdit(rowIndex, col);
  };

  // Handle Enter key
  const handleInputKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, col: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await saveEdit(rowIndex, col);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  if (isLoading && data.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="space-y-4 p-4 border rounded-lg shadow-sm bg-card w-full max-w-md">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }
  
  if (data.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-start">
        <div className="flex flex-col items-center justify-center h-64 border rounded-lg shadow-sm bg-card text-center p-6 w-full">
          <p className="text-lg font-medium text-muted-foreground">No data to display.</p>
          <p className="text-sm text-muted-foreground">Upload a file or link a Google Sheet to get started.</p>
        </div>
      </div>
    );
  }

  // Get organized data
  const { errorCells, errorMessages } = parseValidationErrors();
  
  // Combine data with errors first, then valid data
  // const organizedData = organizeData(); // This line is removed
  
  // Calculate error counts for display
  const errorCount = isClientSide && shouldShowValidation ? parseValidationErrors().errorRows.length : 0;
  const validCount = isClientSide && shouldShowValidation ? data.length - errorCount : 0;



  // Get the data to display based on pagination
  const displayData = organizedData.slice(0, displayedCount);

  // Memoized TableRow component
  const MemoizedTableRow = useMemo(() => React.memo(({ row, rowIndex, isErrorRow, isLastErrorRow, originalRowIndex }: any) => (
    <TableRow 
      key={rowIndex}
      className={`${isClientSide && shouldShowValidation ? (isErrorRow ? 'error-row' : 'valid-row') : ''} ${isClientSide && isLastErrorRow ? 'error-valid-separator' : ''}`}
    >
      <TableCell className="font-medium text-center">
        {originalRowIndex + 1}
      </TableCell>
      {columns.map((col: string) => {
        const isEditing = editingCell && editingCell.row === rowIndex && editingCell.col === col;
        const hasError = hasCellError(rowIndex, col);
        const errorKey = `${originalRowIndex}:${col}`;
        const errorMessage = parsedValidationErrors.errorMessages[errorKey];
        return (
          <TableCell
            key={`${rowIndex}-${col}`}
            className={`whitespace-nowrap relative group${
              datatableEditedCells.has(`${originalRowIndex}:${col}`) ? ' edited-cell' : ''
            }${isClientSide && shouldShowValidation && hasError ? ' error-cell' : ''}`}
            onDoubleClick={() => handleCellDoubleClick(rowIndex, col)}
            title={isClientSide && shouldShowValidation && hasError ? errorMessage : undefined}
            style={isClientSide && shouldShowValidation && hasError ? { 
              backgroundColor: '#fca5a5', 
              border: '2px solid #ef4444',
              boxShadow: '0 0 0 1px #dc2626'
            } : {}}
          >
            {isEditing ? (
              <input
                type="text"
                className="w-full px-1 py-0.5 border rounded focus:outline-none focus:ring"
                value={editValue}
                autoFocus
                onChange={handleInputChange}
                onBlur={() => handleInputBlur(rowIndex, col)}
                onKeyDown={(e) => handleInputKeyDown(e, rowIndex, col)}
              />
            ) : (
              <>
                <div className="relative pr-6">
                  {col.toLowerCase() === 'customertype' 
                    ? (
                        <div className="flex flex-wrap gap-1">
                          {getCustomerTypeLabels(row[col]).map(label => (
                            <Badge key={label} variant="secondary">{label}</Badge>
                          ))}
                        </div>
                      )
                    : (
                      <span className={isClientSide && shouldShowValidation && hasError ? 'font-semibold' : ''}>
                        {row[col]?.toString() ?? ''}
                      </span>
                    )
                  }
                  <div className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-70 transition-opacity pointer-events-none">
                    <Pencil className="h-2 w-2 text-muted-foreground stroke-[3]" />
                  </div>
                </div>
              </>
            )}
          </TableCell>
        );
      })}
    </TableRow>
  )), [columns, datatableEditedCells, editingCell, editValue, handleCellDoubleClick, handleInputBlur, handleInputKeyDown, handleInputChange, getCustomerTypeLabels, hasCellError, isClientSide, parsedValidationErrors, shouldShowValidation]);

  return (
    <div className="space-y-4 p-1 h-full flex flex-col">
      {fileName && <h2 className="text-xl font-semibold font-headline flex-shrink-0">Preview: {fileName}</h2>}
      <div className="flex-shrink-0 text-sm text-muted-foreground flex items-center space-x-2">
        <span>Showing {displayData.length} of {data.length} rows</span>
        {isClientSide && shouldShowValidation && validationMessages.length > 0 && (
          <span className="text-orange-600">
            ({errorCount} with errors, {validCount} valid)
          </span>
        )}
        {isLoadingMore && (
          <div className="flex items-center space-x-1">
            <div className="animate-spin rounded-full h-3 w-3 border border-primary border-t-transparent"></div>
            <span className="text-xs">Loading...</span>
          </div>
        )}
      </div>
      <div 
        className="rounded-md border shadow-sm w-full bg-card flex-grow min-h-0 overflow-auto"
        onScroll={handleTableScroll}
        ref={scrollAreaRef}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold whitespace-nowrap w-[1%]">S/N</TableHead>
              {columns.map((col) => (
                <TableHead key={col} className="font-semibold whitespace-nowrap w-[1%]">{col}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayData.map((row, rowIndex) => {
              const isErrorRow = hasRowError(rowIndex);
              const isLastErrorRow = isClientSide && hasValidated && errorCount > 0 && rowIndex === errorCount - 1;
              const originalRowIndex = getOriginalRowIndex(rowIndex);
              
              return (
                <MemoizedTableRow 
                  key={rowIndex}
                  row={row}
                  rowIndex={rowIndex}
                  isErrorRow={isErrorRow}
                  isLastErrorRow={isLastErrorRow}
                  originalRowIndex={originalRowIndex}
                />
              );
            })}
            
            {/* Summary row when there are validation errors */}
            {isClientSide && shouldShowValidation && validationMessages.length > 0 && errorCount > 0 && validCount > 0 && (
              <TableRow className="error-valid-separator">
                <TableCell colSpan={columns.length + 1} className="text-center py-2">
                  <div className="flex items-center justify-center space-x-4 text-sm font-medium">
                    <span className="text-red-600 flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                      {errorCount} rows with errors
                    </span>
                    <span className="text-green-600 flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      {validCount} valid rows
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            )}
            
            {isLoadingMore && (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="text-center py-6">
                  <div className="flex items-center justify-center space-x-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span className="text-sm font-medium text-muted-foreground">Loading more rows...</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

