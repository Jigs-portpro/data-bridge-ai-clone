"use client";

import { useAppContext } from "@/hooks/useAppContext";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  memo,
} from "react";
import { Pencil, Trash2, Check } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEntityContext } from "@/contexts/EntityContext";
import { ENTITY_NAME_STORAGE_KEY } from "@/lib/constants";
import { getCustomerTypeLabels } from "@/utils/helpers";
import { Badge } from "@/components/ui/badge";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "@/store";
import {
  setErrorRows,
  setErrorCells,
  setErrorMessages,
} from "@/store/slices/exportDataSlice";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Virtualization configuration
const ITEM_HEIGHT = 60; // Height of each row in pixels
const OVERSCAN = 5; // Number of items to render outside visible area

// Column width calculation
const MIN_COLUMN_WIDTH = 150; // Minimum width in pixels
const MAX_COLUMN_WIDTH = 400; // Maximum width in pixels
const CHAR_WIDTH = 8; // Approximate width per character in pixels
const PADDING = 24; // Padding for the column
const RESIZE_HANDLE_WIDTH = 4; // Width of resize handle

// Calculate optimal column width based on header text
function calculateColumnWidth(headerText: string | null | undefined): number {
  if (!headerText) {
    return MIN_COLUMN_WIDTH;
  }
  const textWidth = headerText.length * CHAR_WIDTH;
  const totalWidth = textWidth + PADDING;
  return Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, totalWidth));
}

// Calculate all column widths
function calculateColumnWidths(columns: (string | null | undefined)[]): { [key: string]: number } {
  const widths: { [key: string]: number } = {};
  
  columns.forEach(col => {
    if (col) {
    widths[col] = calculateColumnWidth(col);
    }
  });
  
  return widths;
}

// Debounce utility
function debounce(fn: (...args: any[]) => void, delay: number) {
  let timer: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Pre-compute error states to avoid expensive calculations on every render
interface ErrorState {
  errorRowsSet: Set<number>;
  errorCellsMap: Map<string, Set<number>>;
  errorMessagesMap: Map<string, string>;
}

// Virtualization hook
function useVirtualization(
  itemCount: number,
  itemHeight: number,
  containerHeight: number,
  scrollTop: number,
  overscan: number = 5
) {
  return useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(startIndex + visibleCount, itemCount);
    
    const visibleStartIndex = Math.max(0, startIndex - overscan);
    const visibleEndIndex = Math.min(itemCount, endIndex + overscan);
    
    const offsetY = visibleStartIndex * itemHeight;
    const totalHeight = itemCount * itemHeight;
    
    return {
      visibleStartIndex,
      visibleEndIndex,
      offsetY,
      totalHeight,
      visibleCount: visibleEndIndex - visibleStartIndex,
    };
  }, [itemCount, itemHeight, containerHeight, scrollTop, overscan]);
}

// Simplified and optimized cell component
const TableCellComponent = memo(({
  col,
  rowIndex,
  originalRowIndex,
  cellValue,
  isEdited,
  hasError,
  errorMessage,
  isEditing,
  onDoubleClick,
  onCellEdit,
  columnWidth,
}: {
  col: string | null;
  rowIndex: number;
  originalRowIndex: number;
  cellValue: any;
  isEdited: boolean;
  hasError: boolean;
  errorMessage?: string;
  isEditing: boolean;
  onDoubleClick: (col: string) => void;
  onCellEdit: (col: string, newValue: string) => void;
  columnWidth: number;
}) => {
  // Create stable handlers that use the `col` prop
  const handleDoubleClick = useCallback(() => {
    if (col) {
    onDoubleClick(col);
    }
  }, [onDoubleClick, col]);

  const handleCellEdit = useCallback((newValue: string) => {
    if (col) {
    onCellEdit(col, newValue);
    }
  }, [onCellEdit, col]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCellEdit(e.currentTarget.value);
    } else if (e.key === "Escape") {
      handleCellEdit(String(cellValue ?? ""));
    }
  }, [handleCellEdit, cellValue]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    handleCellEdit(e.target.value);
  }, [handleCellEdit]);

  return (
    <TableCell
      className={`relative group${
        isEdited ? " edited-cell" : ""
      }${hasError ? " error-cell" : ""}`}
      onDoubleClick={handleDoubleClick}
      title={hasError ? errorMessage : undefined}
      style={{
        minWidth: `${columnWidth}px`,
        maxWidth: `${columnWidth}px`,
        width: `${columnWidth}px`,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }}
    >
      {isEditing ? (
        <input
          type="text"
          className="w-full px-1 py-0.5 border rounded focus:outline-none focus:ring"
          defaultValue={String(cellValue ?? "")}
          autoFocus
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <div className="relative pr-6 w-full">
          {col && col.toLowerCase() === "customertype" ? (
            <div className="flex flex-wrap gap-1">
              {getCustomerTypeLabels(cellValue).map((label) => (
                <Badge key={label} variant="secondary">
                  {label}
                </Badge>
              ))}
            </div>
          ) : (
            <Tooltip delayDuration={1000}>
              <TooltipTrigger asChild>
                <div className="truncate cursor-help" title={Array.isArray(cellValue) ? cellValue.join(', ') : (cellValue?.toString() ?? "")}>
                  <span className={hasError ? "font-semibold" : ""}>
                    {Array.isArray(cellValue) ? cellValue.join(', ') : (cellValue?.toString() ?? "")}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-md">
                <div className="break-words">
                  <div className="font-semibold mb-1">{col || "Unknown Column"}:</div>
                  <div className="text-sm">{Array.isArray(cellValue) ? cellValue.join(', ') : (cellValue?.toString() ?? "")}</div>
                </div>
              </TooltipContent>
            </Tooltip>
          )}
          <div className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-70 transition-opacity pointer-events-none">
            <Pencil className="h-2 w-2 text-muted-foreground stroke-[3]" />
          </div>
        </div>
      )}
    </TableCell>
  );
});

TableCellComponent.displayName = "TableCellComponent";

// Resize handle component
const ResizeHandle = memo(({
  onResize,
  columnKey,
  currentWidth,
  onResizeStart,
  onResizeEnd,
}: {
  onResize: (columnKey: string, newWidth: number) => void;
  columnKey: string;
  currentWidth: number;
  onResizeStart: () => void;
  onResizeEnd: () => void;
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setStartX(e.clientX);
    setStartWidth(currentWidth);
    onResizeStart();
  }, [currentWidth, onResizeStart, columnKey]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - startX;
    const newWidth = Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, startWidth + deltaX));
    onResize(columnKey, newWidth);
  }, [isResizing, startX, startWidth, onResize, columnKey]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    onResizeEnd();
  }, [onResizeEnd]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div
      className="resize-handle"
      onMouseDown={handleMouseDown}
      title="Drag to resize column"
    />
  );
});

ResizeHandle.displayName = "ResizeHandle";

// Simplified row component
const TableRowComponent = memo(({
  rowIndex,
  originalRowIndex,
  columns,
  rowData,
  errorRowsSet,
  errorCellsMap,
  errorMessagesMap,
  datatableEditedCells,
  editingCell,
  isClientSide,
  shouldShowValidation,
  selectedRows,
  onCellDoubleClick,
  onCellEdit,
  onRowSelect,
  style,
  columnWidths,
}: {
  rowIndex: number;
  originalRowIndex: number;
  columns: string[];
  rowData: any;
  errorRowsSet: Set<number>;
  errorCellsMap: Map<string, Set<number>>;
  errorMessagesMap: Map<string, string>;
  datatableEditedCells: Set<string>;
  editingCell: { row: number; col: string } | null;
  isClientSide: boolean;
  shouldShowValidation: boolean;
  selectedRows: Set<number>;
  onCellDoubleClick: (rowIndex: number, col: string) => void;
  onCellEdit: (rowIndex: number, col: string, newValue: string) => void;
  onRowSelect: (originalRowIndex: number, checked: boolean) => void;
  style?: React.CSSProperties;
  columnWidths: { [key: string]: number };
}) => {
  const hasRowError = errorRowsSet.has(originalRowIndex);
  const isSelected = selectedRows.has(originalRowIndex);

  // Create stable handlers for all cells in this row
  const handleDoubleClickForCell = useCallback((col: string) => {
    onCellDoubleClick(rowIndex, col);
  }, [onCellDoubleClick, rowIndex]);

  const handleEditForCell = useCallback((col: string, newValue: string) => {
    onCellEdit(rowIndex, col, newValue);
  }, [onCellEdit, rowIndex]);

  const handleRowSelect = useCallback((checked: boolean) => {
    onRowSelect(originalRowIndex, checked);
  }, [onRowSelect, originalRowIndex]);
  
  return (
    <TableRow
      className={`${
        isClientSide && shouldShowValidation
          ? hasRowError
            ? "error-row"
            : "valid-row"
          : ""
      } ${isSelected ? "bg-primary/5" : ""}`}
      style={style}
    >
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={handleRowSelect}
          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
      </TableCell>
      <TableCell className="font-medium text-center">
        {originalRowIndex + 1}
      </TableCell>
      {columns.map((col, index) => {
        const columnKey = col || `unnamed_${index}`;
        const cellValue = rowData[columnKey];
        const isEdited = datatableEditedCells.has(`${originalRowIndex}:${columnKey}`);
        const isEditing = editingCell?.row === rowIndex && editingCell?.col === columnKey;
        
        // Fast error checking with case-insensitive matching
        let hasError = false;
        if (isClientSide && shouldShowValidation && errorRowsSet.has(originalRowIndex)) {
          // Try exact match first
          let errorCellsForCol = errorCellsMap.get(columnKey);
          hasError = errorCellsForCol?.has(originalRowIndex) || false;
          
          // If no exact match, try case-insensitive match
          if (!hasError) {
            for (const [errorCol, errorRows] of errorCellsMap.entries()) {
              // Remove asterisks for comparison
              const normalizedErrorCol = errorCol.replace(/\*/g, '');
              const normalizedColumnKey = columnKey.replace(/\*/g, '');
              
              if (normalizedErrorCol.toLowerCase() === normalizedColumnKey.toLowerCase()) {
                hasError = errorRows.has(originalRowIndex) || false;
                if (hasError) {
                  break;
                }
              }
            }
          }
          

        }
        
        const errorMessage = hasError 
          ? errorMessagesMap.get(`${originalRowIndex}:${columnKey}`)
          : undefined;

        return (
          <TableCellComponent
            key={columnKey}
            col={col}
            rowIndex={rowIndex}
            originalRowIndex={originalRowIndex}
            cellValue={cellValue}
            isEdited={isEdited}
            hasError={hasError}
            errorMessage={errorMessage}
            isEditing={isEditing}
            onDoubleClick={handleDoubleClickForCell}
            onCellEdit={handleEditForCell}
            columnWidth={columnWidths[columnKey] || 150}
          />
        );
      })}
    </TableRow>
  );
});

TableRowComponent.displayName = "TableRowComponent";

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
    isInitialDataLoading,
    handlePageChange,
    updateErrorState,
    deleteRows,
  } = useAppContext();
  // State for selected rows
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [showDeleteButton, setShowDeleteButton] = useState(false);
  
  // Virtualization state
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);
  const containerRef = useRef<HTMLDivElement>(null);
  const tableBodyRef = useRef<HTMLTableSectionElement>(null);
  
  const { detectedEntity } = useEntityContext();
  const { data: session } = useSession();
  const dispatch = useDispatch();
  const [editingCell, setEditingCell] = useState<{
    row: number;
    col: string;
  } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [storedEntityName, setStoredEntityName] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const hasClearedState = useRef(false);

  // Calculate virtualization values
  const virtualization = useVirtualization(
    viewData?.length,
    ITEM_HEIGHT,
    containerHeight,
    scrollTop,
    OVERSCAN
  );

  // Handle scroll events for virtualization
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setScrollTop(target.scrollTop);
  }, []);

  // Update container height when component mounts or resizes
  useEffect(() => {
    const updateContainerHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerHeight(rect.height);
      }
    };

    updateContainerHeight();
    window.addEventListener('resize', updateContainerHeight);
    return () => window.removeEventListener('resize', updateContainerHeight);
  }, []);

  // Get visible rows based on virtualization
  const visibleRows = useMemo(() => {
    return viewData?.slice(virtualization.visibleStartIndex, virtualization.visibleEndIndex);
  }, [viewData, virtualization.visibleStartIndex, virtualization.visibleEndIndex]);

  // Handlers for row selection and deletion
  const handleRowSelect = useCallback((originalRowIndex: number, checked: boolean) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(originalRowIndex);
      } else {
        newSet.delete(originalRowIndex);
      }
      return newSet;
    });
  }, []);

  const handleDeleteSelectedRows = useCallback(async () => {
    if (selectedRows.size === 0) return;

    try {
      // Get the actual row data for selected rows
      const rowsToDelete: Record<string, any>[] = [];
      selectedRows.forEach(originalRowIndex => {
        const pageIndex = originalRowIndex - (currentPage - 1) * rowsPerPage;
        if (pageIndex >= 0 && pageIndex < viewData.length) {
          rowsToDelete.push(viewData[pageIndex]);
        }
      });

      if (rowsToDelete.length === 0) {
        showToast({
          title: "Error",
          description: "No valid rows found to delete",
          variant: "destructive",
        });
        return;
      }

      // Delete rows using AppContext function
      const result = await deleteRows(rowsToDelete, 'manual');
      
      if (result.success) {
    setSelectedRows(new Set());
    setShowDeleteButton(false);

    showToast({
      title: "Rows Deleted",
          description: result.message || `Successfully deleted ${rowsToDelete.length} row(s)`,
        });
      } else {
        showToast({
          title: "Deletion Failed",
          description: result.error || "Failed to delete selected rows",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting rows:', error);
      showToast({
        title: "Deletion Error",
        description: "An error occurred while deleting rows",
        variant: "destructive",
    });
    }
  }, [selectedRows, viewData, currentPage, rowsPerPage, deleteRows, showToast]);

  // Update delete button visibility when selection changes
  useEffect(() => {
    setShowDeleteButton(selectedRows.size > 0);
  }, [selectedRows.size]);

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
      const entityNameFromStorage = localStorage.getItem(
        ENTITY_NAME_STORAGE_KEY
      );
      setStoredEntityName(entityNameFromStorage);
    }
  }, [isMounted]);

  // Don't render validation-dependent content until mounted to prevent hydration mismatches
  // Also show validation if current page has been validated OR if we have export errors
  const shouldShowValidation = isMounted && (hasCurrentPageBeenValidated || reduxErrorRows.length > 0 || Object.keys(reduxErrorCells).length > 0);
  
  // Don't render any validation-dependent content during SSR
  const isClientSide = isMounted;

  // Optimized validation error parsing with better caching
  const parseValidationErrors = useCallback(() => {
    // Show errors if current page has been validated OR if we have export errors
    if (!hasCurrentPageBeenValidated && (reduxErrorRows.length === 0 && Object.keys(reduxErrorCells).length === 0)) {
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
        errorMessages: reduxErrorMessages,
      };
    }

    if (!hasValidated || validationMessages.length === 0) {
      return {
        errorRows: [],
        errorCells: {},
        errorMessages: {},
      };
    }

    // Create optimized lookups
    const columnsLookup = new Map(columns.map((col) => [col.toLowerCase(), col]));
    const errorRows = new Set<number>();
    const errorCells = new Map<string, Set<string>>();
    const errorMessages = new Map<string, string>();

    validationMessages.forEach((message) => {
      const rowMatch = message.match(/Row (\d+)/);
      if (rowMatch) {
        // The row number in the message is already the global row number (1-based)
        // We need to convert it to 0-based index for error highlighting
        const globalRowIndex = parseInt(rowMatch[1]) - 1;
        errorRows.add(globalRowIndex);

        const fieldMatch = message.match(/"([^"]+)" \(from "([^"]+)"\)/);
        if (fieldMatch) {
          const sourceColumn = fieldMatch[2];
          const actualColumn = columnsLookup.get(sourceColumn.toLowerCase()) || sourceColumn;

          if (columnsLookup.has(sourceColumn.toLowerCase())) {
            const errorKey = `${globalRowIndex}:${actualColumn}`;
            if (!errorCells.has(actualColumn)) {
              errorCells.set(actualColumn, new Set());
            }
            errorCells.get(actualColumn)!.add(globalRowIndex.toString());
            errorMessages.set(errorKey, message);
          }
        }
      }
    });

    return {
      errorRows: Array.from(errorRows),
      errorCells: Object.fromEntries(
        Array.from(errorCells.entries()).map(([col, rows]) => [
          col,
          Array.from(rows),
        ])
      ),
      errorMessages: Object.fromEntries(errorMessages),
    };
  }, [validationMessages, hasValidated, columns, fieldMappings, reduxErrorRows, reduxErrorCells, reduxErrorMessages, hasCurrentPageBeenValidated]);

  // Reset error highlighting state when data changes
  useEffect(() => {
    if (
      data?.length > 0 &&
      !hasValidated &&
      reduxErrorRows.length === 0 &&
      Object.keys(reduxErrorCells).length === 0 &&
      !hasClearedState.current
    ) {
      hasClearedState.current = true;
      dispatch(setErrorRows([]));
      dispatch(setErrorCells({}));
      dispatch(setErrorMessages({}));
    }
  }, [data?.length, hasValidated, reduxErrorRows, reduxErrorCells, dispatch]);

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

  // Optimized cell edit handler with batched state updates
  const handleCellEdit = useCallback(
    (rowIndex: number, col: string, newValue: string) => {
      const originalValue = String(viewData[rowIndex]?.[col] ?? "");
      if (newValue !== originalValue) {
        const originalRowIndex = (currentPage - 1) * rowsPerPage + rowIndex;

        // Batch state updates using React's automatic batching
        setViewData((prevViewData) => {
          const updatedViewData = [...prevViewData];
          updatedViewData[rowIndex] = {
            ...updatedViewData[rowIndex],
            [col]: newValue,
          };
          return updatedViewData;
        });

        setDatatableEditedCells((prevEditedCells) => {
          const updatedEditedCells = new Set(prevEditedCells);
          updatedEditedCells.add(`${originalRowIndex}:${col}`);
          return updatedEditedCells;
        });
      }
      setEditingCell(null);
    },
    [viewData, currentPage, rowsPerPage, setViewData, setDatatableEditedCells]
  );

  // Optimized page change handler
  const handleLocalPageChange = useCallback(async (page: number) => {
    if (page >= 1 && page <= totalPages) {
      await handlePageChange(page, data);
    }
  }, [totalPages, handlePageChange]);

  // Helper function to check if a cell has an error
  const hasCellError = (rowIndex: number, col: string) => {
    if (!isClientSide || !shouldShowValidation) {
      return false;
    }
    
    const { errorRows, errorCells } = parseValidationErrors();
    const originalRowIndex = ((currentPage - 1) * rowsPerPage) + rowIndex;
    

    
    if (errorRows.includes(originalRowIndex)) {
      // Try exact match first
      let errorCellsForCol = errorCells[col];
      let hasError = errorCellsForCol?.includes(originalRowIndex.toString()) || false;
      
      // If no exact match, try case-insensitive match
      if (!hasError) {
        for (const [errorCol, errorRows] of Object.entries(errorCells)) {
          if (errorCol.toLowerCase() === col.toLowerCase()) {
            hasError = errorRows.includes(originalRowIndex.toString()) || false;
            if (hasError) {
              break;
            }
          }
        }
      }
      

      
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

  // State for resizable column widths
  const [resizableColumnWidths, setResizableColumnWidths] = useState<{ [key: string]: number }>({});
  
  // Calculate dynamic column widths based on header text
  const initialColumnWidths = useMemo(() => {
    if (!columns || !Array.isArray(columns)) {
      return {};
    }
    return calculateColumnWidths(columns);
  }, [columns]);
  
  // Use resizable widths if available, otherwise use calculated widths
  const columnWidths = useMemo(() => {
    const widths: { [key: string]: number } = {};
    if (!columns || !Array.isArray(columns)) {
      return widths;
    }
    columns.forEach((col, index) => {
      const columnKey = col || `unnamed_${index}`;
      widths[columnKey] = resizableColumnWidths[columnKey] || initialColumnWidths[columnKey] || MIN_COLUMN_WIDTH;
    });
    return widths;
  }, [columns, resizableColumnWidths, initialColumnWidths]);
  
  // Calculate total table width to ensure data rows expand properly
  const totalTableWidth = useMemo(() => {
    const checkboxWidth = 48;
    const serialNumberWidth = 64;
    const dataColumnsWidth = Object.values(columnWidths).reduce((sum, width) => sum + width, 0);
    return checkboxWidth + serialNumberWidth + dataColumnsWidth;
  }, [columnWidths]);
  
  // State for resize feedback
  const [isResizing, setIsResizing] = useState(false);
  
  // Handle column resize
  const handleColumnResize = useCallback((columnKey: string, newWidth: number) => {
    setResizableColumnWidths(prev => ({
      ...prev,
      [columnKey]: newWidth
    }));
  }, []);
  
  // Force re-render when column widths change
  useEffect(() => {
    // This will trigger a re-render of virtualized rows when column widths change
  }, [columnWidths]);
  
  // Handle resize start/end
  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
  }, []);
  
  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);
  
  // Reset column widths to original calculated sizes
  const resetColumnWidths = useCallback(() => {
    setResizableColumnWidths({});
  }, []);

  // Memoize expensive functions
  const parsedValidationErrors = useMemo(() => parseValidationErrors(), [parseValidationErrors]);

  // Create errorState object from parsed validation errors
  const errorState: ErrorState = useMemo(() => {
    const { errorRows, errorCells, errorMessages } = parsedValidationErrors;
    
    const result = {
      errorRowsSet: new Set(errorRows),
      errorCellsMap: new Map(
        Object.entries(errorCells).map(([col, rows]) => [
          col,
          new Set(rows.map(row => typeof row === 'string' ? parseInt(row, 10) : row))
        ])
      ),
      errorMessagesMap: new Map(Object.entries(errorMessages))
    };
    

    
    return result;
  }, [parsedValidationErrors]);

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

  if (isLoading && data?.length === 0) {
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

  if (data?.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-start">
        <div className="flex flex-col items-center justify-center h-64 border rounded-lg shadow-sm bg-card text-center p-6 w-full">
          <p className="text-lg font-medium text-muted-foreground">
            No data to display.
          </p>
          <p className="text-sm text-muted-foreground">
            Upload a file or link a Google Sheet to get started.
          </p>
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

  return (
    <TooltipProvider>
      <div className="space-y-4 p-1 h-full flex flex-col">
        {fileName && (
          <h2 className="text-xl font-semibold font-headline flex-shrink-0">
            Preview: {fileName}
          </h2>
        )}
      <div className="flex-shrink-0 text-sm text-muted-foreground flex items-center space-x-2">
        <span>
          Showing {(currentPage - 1) * rowsPerPage + 1}-{" "}
          {Math.min(currentPage * rowsPerPage, totalRows)}
          of {totalRows} rows
        </span>
      </div>

      {/* Pagination Controls */}
      {data?.length > 0 && (
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
              {(currentPage - 1) * rowsPerPage + 1} -{" "}
              {Math.min(currentPage * rowsPerPage, totalRows)} of {totalRows}
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

      <div className={`data-table-container w-full bg-card flex-grow min-h-0 overflow-hidden relative ${isResizing ? 'column-resizing' : ''}`}>
        <div 
          ref={containerRef}
          className="h-full overflow-auto"
          onScroll={handleScroll}
          style={{ 
            overflowX: 'auto',
            scrollbarWidth: 'auto',
            msOverflowStyle: 'auto',
          }}
        >
          <Table 
            key={`table-${totalTableWidth}`}
            className="data-table w-full" 
            style={{ minWidth: `${totalTableWidth}px`, width: `${totalTableWidth}px` }}
          >
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead className="bg-background">
                <Checkbox
                  checked={selectedRows.size === viewData.length && viewData.length > 0}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      // Select all rows on current page
                      const allRowIndices = viewData.map((_, index) => (currentPage - 1) * rowsPerPage + index);
                      setSelectedRows(new Set(allRowIndices));
                    } else {
                      setSelectedRows(new Set());
                    }
                  }}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              </TableHead>
              <TableHead className="font-semibold text-center bg-background">
                S/N
              </TableHead>
              {columns.map((col, index) => {
                const columnKey = col || `unnamed_${index}`;
                return (
                <TableHead
                  key={columnKey}
                  className="font-semibold bg-background relative"
                  style={{
                    minWidth: `${columnWidths[columnKey] || 150}px`,
                    maxWidth: `${columnWidths[columnKey] || 150}px`,
                    width: `${columnWidths[columnKey] || 150}px`,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}
                >
                  <Tooltip delayDuration={1000}>
                    <TooltipTrigger asChild>
                      <div className="truncate cursor-help" title={col || "Unnamed Column"}>
                        {col || "Unnamed Column"}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-md">
                      <div className="break-words">
                        <div className="font-semibold">{col || "Unnamed Column"}</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  <ResizeHandle
                    onResize={handleColumnResize}
                    columnKey={columnKey}
                    currentWidth={columnWidths[columnKey] || 150}
                    onResizeStart={handleResizeStart}
                    onResizeEnd={handleResizeEnd}
                  />
                </TableHead>
              );
            })}
            </TableRow>
          </TableHeader>
          <TableBody 
            ref={tableBodyRef}
            style={{ 
              height: virtualization.totalHeight,
              position: 'relative',
              width: `${totalTableWidth}px`
            }}
          >
            {/* Virtualized rows */}
            <tr style={{ height: virtualization.offsetY }} />
            {visibleRows.map((rowData, virtualIndex) => {
              const rowIndex = virtualization.visibleStartIndex + virtualIndex;
              const originalRowIndex = (currentPage - 1) * rowsPerPage + rowIndex;

              return (
                <TableRowComponent
                  key={`row-${originalRowIndex}-${JSON.stringify(columnWidths)}`}
                  rowIndex={rowIndex}
                  originalRowIndex={originalRowIndex}
                  columns={columns}
                  rowData={rowData}
                  errorRowsSet={errorState.errorRowsSet}
                  errorCellsMap={errorState.errorCellsMap}
                  errorMessagesMap={errorState.errorMessagesMap}
                  datatableEditedCells={datatableEditedCells}
                  editingCell={editingCell}
                  isClientSide={isClientSide}
                  shouldShowValidation={shouldShowValidation}
                  selectedRows={selectedRows}
                  onCellDoubleClick={handleCellDoubleClick}
                  onCellEdit={handleCellEdit}
                  onRowSelect={handleRowSelect}
                  columnWidths={columnWidths}
                  style={{ 
                    position: 'absolute',
                    top: virtualization.offsetY + (virtualIndex * ITEM_HEIGHT),
                    height: ITEM_HEIGHT,
                    width: `${totalTableWidth}px`,
                    left: 0,
                    right: 0
                  }}
                />
              );
            })}

            {/* Summary row when there are validation errors */}
            {isClientSide &&
              shouldShowValidation &&
              validationMessages.length > 0 &&
              errorCount > 0 &&
              validCount > 0 && (
                <TableRow 
                  className="error-valid-separator"
                  style={{
                    position: 'absolute',
                    top: virtualization.totalHeight,
                    width: '100%'
                  }}
                >
                  <TableCell
                    colSpan={columns.length + 2}
                    className="text-center py-2"
                  >
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

        {/* Delete button - appears when rows are selected */}
        {showDeleteButton && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
            <Button
              onClick={handleDeleteSelectedRows}
              variant="destructive"
              size="sm"
              className="shadow-lg bg-red-500/90 hover:bg-red-600 text-white"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete {selectedRows.size} row{selectedRows.size !== 1 ? 's' : ''}
            </Button>
          </div>
        )}
      </div>
    </div>
      </TooltipProvider>
  );
}
