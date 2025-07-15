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
} from '@/store/slices/exportDataSlice';
import { Button } from '@/components/ui/button';

// Debounce utility
function debounce(fn: (...args: any[]) => void, delay: number) {
  let timer: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function DataTable() {
  const { 
    data, 
    columns, 
    isLoading, 
    fileName, 
    datatableEditedCells, 
    setData, 
    setDatatableEditedCells, 
    entityName, 
    showToast,
    viewData,
    setViewData,
    error,
    dataTable,
    currentPage,
    setCurrentPage,
    totalPages,
    setTotalPages,
    rowsPerPage,
    totalRows,
    handlePageChange,
    updateErrorState
  } = useAppContext();
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
    pageValidationStatus,
  } = useSelector((state: RootState) => state.exportData);

  // Check if current page has been validated
  const currentPageStatus = pageValidationStatus[currentPage];
  const hasCurrentPageBeenValidated = currentPageStatus !== undefined;
  
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
  // Also show validation only if current page has been validated
  const shouldShowValidation = isMounted && hasCurrentPageBeenValidated;
  
  // Don't render any validation-dependent content during SSR
  const isClientSide = isMounted;

  // Parse validation messages to extract row and column error information
  const parseValidationErrors = useCallback(() => {
    // Only show errors if current page has been validated
    if (!hasCurrentPageBeenValidated) {
      return { 
        errorRows: [], 
        errorCells: {},
        errorMessages: {}
      };
    }

    // If we already have stored error data in Redux for current page, use it
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

    return {
      errorRows: Array.from(errorRows),
      errorCells: Object.fromEntries(
        Array.from(errorCells.entries()).map(([col, rows]) => [col, Array.from(rows)])
      ),
      errorMessages: Object.fromEntries(errorMessages)
    };
  }, [validationMessages, hasValidated, columns, fieldMappings, reduxErrorRows, reduxErrorCells, reduxErrorMessages, hasCurrentPageBeenValidated]);

  // Reset error highlighting state when data changes
  useEffect(() => {
    if (data.length > 0 && !hasValidated && reduxErrorRows.length === 0 && Object.keys(reduxErrorCells).length === 0 && !hasClearedState.current) {
      // Clear error highlighting when new data is loaded and no validation data exists
      hasClearedState.current = true;
      dispatch(setErrorRows([]));
      dispatch(setErrorCells({}));
      dispatch(setErrorMessages({}));
    }
  }, [data.length, hasValidated, reduxErrorRows, reduxErrorCells, dispatch]);

  // Save error data to Redux when it changes
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
      }
      
      // Update error state with error rows from current page data
      if (errorRows.length > 0) {
        const errorData = errorRows.map(rowIndex => viewData[rowIndex]).filter(Boolean);
        updateErrorState(errorData);
      } else {
        updateErrorState([]);
      }
    }
  }, [hasValidated, validationMessages, parseValidationErrors, reduxErrorRows, reduxErrorCells, reduxErrorMessages, dispatch, viewData, updateErrorState]);

  // New pagination system - no infinite scroll needed
  const handleLocalPageChange = async (page: number) => {
    if (page >= 1 && page <= totalPages) {
      await handlePageChange(page, data);
    }
  };

  // Helper function to check if a cell has an error
  const hasCellError = (rowIndex: number, col: string) => {
    if (!isClientSide || !shouldShowValidation) return false;
    const { errorRows, errorCells } = parseValidationErrors();
    
    // Check if the current row in viewData has an error
    const originalRowIndex = ((currentPage - 1) * rowsPerPage) + rowIndex;
    
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
    const originalRowIndex = ((currentPage - 1) * rowsPerPage) + rowIndex;
    return errorRows.includes(originalRowIndex);
  };

  // Helper function to get the original row index
  const getOriginalRowIndex = (displayIndex: number) => {
    return ((currentPage - 1) * rowsPerPage) + displayIndex;
  };

  // Handle double click to start editing
  const handleCellDoubleClick = (rowIndex: number, col: string) => {
    setEditingCell({ row: rowIndex, col });
    setEditValue(String(viewData[rowIndex][col] ?? ''));
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

              // Get current validation state
        const { errorRows, errorCells, errorMessages } = parseValidationErrors();

        const payload = {
          sessionId: session.user.sessionId,
          entityName: displayEntityName,
          data: updatedData,
          columns: columns,
          datatableEditedCells: Array.from(updatedEditedCells),
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

  // Save edit on blur or Enter (no API call - only update viewData)
  const saveEdit = async (rowIndex: number, col: string) => {
    const originalValue = String(viewData[rowIndex][col] ?? '');
    if (editValue !== originalValue) {
      // Update only viewData (current page data)
      const updatedViewData = viewData.map((row, idx) => {
        if (idx === rowIndex) {
          return { ...row, [col]: editValue };
        }
        return row;
      });
      
      const updatedEditedCells = new Set(datatableEditedCells);
      updatedEditedCells.add(`${getOriginalRowIndex(rowIndex)}:${col}`);

      // Update only viewData and edited cells - no API call
      setViewData(updatedViewData);
      setDatatableEditedCells(updatedEditedCells);
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
        // For page-based validation, use page-relative row index for error message key
        const errorKey = `${rowIndex}:${col}`;
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
                          {getCustomerTypeLabels(viewData[rowIndex][col]).map(label => (
                            <Badge key={label} variant="secondary">{label}</Badge>
                          ))}
                        </div>
                      )
                    : (
                      <span className={isClientSide && shouldShowValidation && hasError ? 'font-semibold' : ''}>
                        {viewData[rowIndex][col]?.toString() ?? ''}
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
  )), [columns, datatableEditedCells, editingCell, editValue, handleCellDoubleClick, handleInputBlur, handleInputKeyDown, handleInputChange, getCustomerTypeLabels, hasCellError, isClientSide, parsedValidationErrors, shouldShowValidation, viewData]);

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
  const validCount = isClientSide && shouldShowValidation ? viewData.length - errorCount : 0;



  // Get the data to display based on new state management
  const displayData = viewData;

  return (
    <div className="space-y-4 p-1 h-full flex flex-col">
      {fileName && <h2 className="text-xl font-semibold font-headline flex-shrink-0">Preview: {fileName}</h2>}
      <div className="flex-shrink-0 text-sm text-muted-foreground flex items-center space-x-2">
        <span>
          Showing {((currentPage - 1) * rowsPerPage) + 1}
          - {Math.min(currentPage * rowsPerPage, totalRows)}
          of {totalRows} rows
        </span>
      </div>
      
      {/* Pagination Controls */}
      {data.length > 0 && (
        <div className="flex-shrink-0 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleLocalPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              Previous
            </Button>
            <span className="text-sm">
              {((currentPage - 1) * rowsPerPage) + 1} - {Math.min(currentPage * rowsPerPage, totalRows)} of {totalRows}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleLocalPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
      
      <div 
        className="rounded-md border shadow-sm w-full bg-card flex-grow min-h-0 overflow-auto"
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
            

          </TableBody>
        </Table>
      </div>
    </div>
  );
}

