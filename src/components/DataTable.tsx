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
import { Pencil } from "lucide-react";
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
}: {
  col: string;
  rowIndex: number;
  originalRowIndex: number;
  cellValue: any;
  isEdited: boolean;
  hasError: boolean;
  errorMessage?: string;
  isEditing: boolean;
  onDoubleClick: (col: string) => void;
  onCellEdit: (col: string, newValue: string) => void;
}) => {
  // Create stable handlers that use the `col` prop
  const handleDoubleClick = useCallback(() => {
    onDoubleClick(col);
  }, [onDoubleClick, col]);

  const handleCellEdit = useCallback((newValue: string) => {
    onCellEdit(col, newValue);
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
      className={`whitespace-nowrap relative group${
        isEdited ? " edited-cell" : ""
      }${hasError ? " error-cell" : ""}`}
      onDoubleClick={handleDoubleClick}
      title={hasError ? errorMessage : undefined}
      style={
        hasError
          ? {
              backgroundColor: "#fca5a5",
              border: "2px solid #ef4444",
              boxShadow: "0 0 0 1px #dc2626",
            }
          : {}
      }
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
        <div className="relative pr-6">
          {col.toLowerCase() === "customertype" ? (
            <div className="flex flex-wrap gap-1">
              {getCustomerTypeLabels(cellValue).map((label) => (
                <Badge key={label} variant="secondary">
                  {label}
                </Badge>
              ))}
            </div>
          ) : (
            <span className={hasError ? "font-semibold" : ""}>
              {cellValue?.toString() ?? ""}
            </span>
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
  onCellDoubleClick,
  onCellEdit,
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
  onCellDoubleClick: (rowIndex: number, col: string) => void;
  onCellEdit: (rowIndex: number, col: string, newValue: string) => void;
}) => {
  const hasRowError = errorRowsSet.has(originalRowIndex);

  // Create stable handlers for all cells in this row
  const handleDoubleClickForCell = useCallback((col: string) => {
    onCellDoubleClick(rowIndex, col);
  }, [onCellDoubleClick, rowIndex]);

  const handleEditForCell = useCallback((col: string, newValue: string) => {
    onCellEdit(rowIndex, col, newValue);
  }, [onCellEdit, rowIndex]);
  
  return (
    <TableRow
      className={`${
        isClientSide && shouldShowValidation
          ? hasRowError
            ? "error-row"
            : "valid-row"
          : ""
      }`}
    >
      <TableCell className="font-medium text-center">
        {originalRowIndex + 1}
      </TableCell>
      {columns.map((col) => {
        const cellValue = rowData[col];
        const isEdited = datatableEditedCells.has(`${originalRowIndex}:${col}`);
        const isEditing = editingCell?.row === rowIndex && editingCell?.col === col;
        
        // Fast error checking
        const hasError = isClientSide && shouldShowValidation 
          ? errorRowsSet.has(originalRowIndex) && !!errorCellsMap.get(col)?.has(originalRowIndex)
          : false;
        
        const errorMessage = hasError 
          ? errorMessagesMap.get(`${originalRowIndex}:${col}`)
          : undefined;

        return (
          <TableCellComponent
            key={col}
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
  } = useAppContext();
  
  const { detectedEntity } = useEntityContext();
  const { data: session } = useSession();
  const dispatch = useDispatch();
  const [editingCell, setEditingCell] = useState<{
    row: number;
    col: string;
  } | null>(null);
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
  } = useSelector((state: RootState) => state.exportData);

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

  const shouldShowValidation =
    isMounted &&
    (hasValidated ||
      reduxErrorRows.length > 0 ||
      Object.keys(reduxErrorCells).length > 0);

  const isClientSide = isMounted;

  // Optimized validation error parsing with better caching
  const parseValidationErrors = useCallback(() => {
    // If we already have stored error data in Redux, use it (fast path)
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
        const rowIndex = parseInt(rowMatch[1]) - 1;
        errorRows.add(rowIndex);

        const fieldMatch = message.match(/"([^"]+)" \(from "([^"]+)"\)/);
        if (fieldMatch) {
          const sourceColumn = fieldMatch[2];
          const actualColumn = columnsLookup.get(sourceColumn.toLowerCase()) || sourceColumn;

          if (columnsLookup.has(sourceColumn.toLowerCase())) {
            const errorKey = `${rowIndex}:${actualColumn}`;
            if (!errorCells.has(actualColumn)) {
              errorCells.set(actualColumn, new Set());
            }
            errorCells.get(actualColumn)!.add(rowIndex.toString());
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
  }, [
    validationMessages,
    hasValidated,
    columns,
    reduxErrorRows,
    reduxErrorCells,
    reduxErrorMessages,
  ]);

  // Stable error state with better memoization
  const errorState: ErrorState = useMemo(() => {
    const { errorRows, errorCells, errorMessages } = parseValidationErrors();
    
    return {
      errorRowsSet: new Set(errorRows),
      errorCellsMap: new Map(
        Object.entries(errorCells).map(([col, rows]) => [
          col,
          new Set(rows.map(Number)),
        ])
      ),
      errorMessagesMap: new Map(Object.entries(errorMessages)),
    };
  }, [parseValidationErrors]);

  // Reset error highlighting state when data changes
  useEffect(() => {
    if (
      data.length > 0 &&
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
  }, [data.length, hasValidated, dispatch]);

  // Optimized cell double click handler
  const handleCellDoubleClick = useCallback((rowIndex: number, col: string) => {
    setEditingCell({ row: rowIndex, col });
  }, []);

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
  }, [totalPages, handlePageChange, data]);

  if (isLoading || isInitialDataLoading) {
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

  // Calculate error counts
  const errorCount = isClientSide && shouldShowValidation ? errorState.errorRowsSet.size : 0;
  const validCount = isClientSide && shouldShowValidation ? data.length - errorCount : 0;

  return (
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
        {isClientSide &&
          shouldShowValidation &&
          validationMessages.length > 0 && (
            <span className="text-orange-600">
              ({errorCount} with errors, {validCount} valid)
            </span>
          )}
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

      <div className="rounded-md border shadow-sm w-full bg-card flex-grow min-h-0 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold whitespace-nowrap w-[1%]">
                S/N
              </TableHead>
              {columns.map((col) => (
                <TableHead
                  key={col}
                  className="font-semibold whitespace-nowrap w-[1%]"
                >
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {viewData.map((rowData, rowIndex) => {
              const originalRowIndex = (currentPage - 1) * rowsPerPage + rowIndex;

              return (
                <TableRowComponent
                  key={`row-${originalRowIndex}`}
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
                  onCellDoubleClick={handleCellDoubleClick}
                  onCellEdit={handleCellEdit}
                />
              );
            })}

            {/* Summary row when there are validation errors */}
            {isClientSide &&
              shouldShowValidation &&
              validationMessages.length > 0 &&
              errorCount > 0 &&
              validCount > 0 && (
                <TableRow className="error-valid-separator">
                  <TableCell
                    colSpan={columns.length + 1}
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
    </div>
  );
}
