"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/hooks/useAppContext';
import { AppLayout } from '@/components/AppLayout';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { ChatPane } from '@/components/ChatPane';
import { SmartLookupsCard } from '@/components/SmartLookupsCard';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '@/store';
import { setSelectedEntityId, setFieldMappings, setFieldMappingConfidences } from '@/store/slices/exportDataSlice';

// Validation Status Component
function ValidationStatusDisplay() {
  const { 
    currentPage,
    totalRows,
    rowsPerPage,
    totalPages
  } = useAppContext();
  
  const { 
    hasValidated, 
    isDataValid, 
    totalErrorCount,
    pageValidationStatus,
    allPagesValidated,
    validationMessages,
    errorRows
  } = useSelector((state: RootState) => state.exportData);

  // Check if the current page has been validated
  const currentPageStatus = pageValidationStatus[currentPage];
  const hasCurrentPageBeenValidated = currentPageStatus !== undefined;

  // Don't show anything if the current page hasn't been validated
  if (!hasCurrentPageBeenValidated) {
    return null;
  }

  const currentPageIsValid = currentPageStatus.isValid;
  const currentPageErrorCount = currentPageStatus.errorCount;
  const validatedPagesCount = Object.keys(pageValidationStatus).length;
  const validPagesCount = Object.values(pageValidationStatus).filter(status => status.isValid).length;

  // Extract row numbers for better user guidance when there are errors
  let errorRowsText = '';
  if (!currentPageIsValid && currentPageErrorCount > 0) {

    
    // First try to get row numbers from the current page validation status
    if (currentPageStatus.errorRows && currentPageStatus.errorRows.length > 0) {
      // Convert global row indices to actual row numbers (1-based)
      const sortedErrorRows = currentPageStatus.errorRows.map(globalIndex => globalIndex + 1).sort((a, b) => a - b);
      errorRowsText = sortedErrorRows.length <= 3 
        ? `Rows: ${sortedErrorRows.join(', ')}`
        : `${sortedErrorRows.length} rows (${sortedErrorRows.slice(0, 2).join(', ')}, ...${sortedErrorRows[sortedErrorRows.length - 1]})`;
    }
    // Fall back to extracting from validationMessages
    else {
      const errorRowNumbers = new Set<number>();
      validationMessages.forEach((message) => {
        const rowMatch = message.match(/Row (\d+)/);
        if (rowMatch) {
          errorRowNumbers.add(parseInt(rowMatch[1]));
        }
      });

      if (errorRowNumbers.size > 0) {
        const sortedErrorRows = Array.from(errorRowNumbers).sort((a, b) => a - b);
        errorRowsText = sortedErrorRows.length <= 3 
          ? `Rows: ${sortedErrorRows.join(', ')}`
          : `${sortedErrorRows.length} rows (${sortedErrorRows.slice(0, 2).join(', ')}, ...${sortedErrorRows[sortedErrorRows.length - 1]})`;
      } 
      // Final fallback to errorRows array (convert global indices to row numbers)
      else if (errorRows.length > 0) {
        const sortedErrorRows = errorRows.map(globalIndex => globalIndex + 1).sort((a, b) => a - b);
        errorRowsText = sortedErrorRows.length <= 3 
          ? `Rows: ${sortedErrorRows.join(', ')}`
          : `${sortedErrorRows.length} rows (${sortedErrorRows.slice(0, 2).join(', ')}, ...${sortedErrorRows[sortedErrorRows.length - 1]})`;
      }
    }
  }

  return (
    <div className="mb-4">
      {currentPageIsValid ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center">
            <CheckCircle className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-green-800">
                Page {currentPage}: All data valid
              </h3>
              <p className="text-xs text-green-600 mt-0.5">
                {allPagesValidated 
                  ? `All ${totalPages} pages validated. Ready for export!`
                  : validatedPagesCount < totalPages 
                    ? `${validatedPagesCount}/${totalPages} pages validated`
                    : 'Validate remaining pages to enable export'
                }
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center">
            <AlertTriangle className="h-4 w-4 text-red-600 mr-2 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-red-800">
                Page {currentPage}: {currentPageErrorCount} error{currentPageErrorCount !== 1 ? 's' : ''} found
                {errorRowsText && <span className="text-xs font-normal ml-2">({errorRowsText})</span>}
              </h3>
              <p className="text-xs text-red-600 mt-0.5">
                Review highlighted issues in data table
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const { isAuthenticated, isAuthLoading, data, columns, isLoading, isChatPaneCollapsed, toggleChatPane, getCarrierId, setColumns, setViewData, setEntityName, setData, initializeDataStates } = useAppContext();
  const router = useRouter();
  const dispatch = useDispatch();
  const [isRestoringData, setIsRestoringData] = useState(false);

  const pageTitle = "DataWise Dashboard";
  const hasData = data && data?.length > 0 && columns && columns.length > 0;
  const isUploadingNewFile = isLoading && !hasData;

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/login');
    }

    if(!hasData && !isRestoringData) {
      const carrierId = getCarrierId();
      if (!carrierId) return;
      
      setIsRestoringData(true);
      // Fetch all data to restore complete dataset
      fetch(`/api/data?carrier=${carrierId}`).then(res => res.json()).then(res => {
        const { data, columns, entityName, mappings, confidences, pagination } = res;

        // Initialize pagination state with all data
        initializeDataStates(data ?? [], pagination?.total || data?.length);
        
        // Set the complete data
        setData(data ?? []);
        
        // Preserve existing columns if they exist, otherwise use server columns
        if (columns && columns.length > 0) {
          setColumns(columns);
        } else {
          setColumns(columns ?? []);
        }
        
        setEntityName(entityName ?? "");
        setFieldMappings(mappings ?? {});
        setFieldMappingConfidences(confidences ?? {});
        
        // If we have data and entityName, restore the entity mapping state
        if (data && data.length > 0 && entityName) {
          // Restore entity ID from entityName
          dispatch(setSelectedEntityId(entityName));
          
          // Try to restore field mappings from localStorage
          const fileName = localStorage.getItem('currentFileName') || 'unknown';
          const storageKey = `columnMapping_${fileName}_${entityName}`;
          const confidenceStorageKey = `columnMappingConfidence_${fileName}_${entityName}`;
          
          try {
            const storedMappings = localStorage.getItem(storageKey);
            if (storedMappings) {
              const mappings = JSON.parse(storedMappings);
              dispatch(setFieldMappings(mappings));
            } else {
              // If no stored mappings, create initial mappings based on normalized names
              if (columns && columns.length > 0) {
                const initialMappings: Record<string, string> = {};
                // This is a simplified mapping - in a real scenario, you'd need the entity config
                // For now, we'll create basic mappings based on column names
                columns.forEach((col: string) => {
                  const normalizedCol = col.toLowerCase().replace(/[\s_]+/g, "");
                  // Try to match common field names
                  if (normalizedCol.includes('name') || normalizedCol.includes('company')) {
                    initialMappings['name'] = col;
                  } else if (normalizedCol.includes('email')) {
                    initialMappings['email'] = col;
                  } else if (normalizedCol.includes('phone')) {
                    initialMappings['phone'] = col;
                  }
                  // Add more mappings as needed
                });
                if (Object.keys(initialMappings).length > 0) {
                  dispatch(setFieldMappings(initialMappings));
                }
              }
            }
            
            const storedConfidences = localStorage.getItem(confidenceStorageKey);
            if (storedConfidences) {
              const confidences = JSON.parse(storedConfidences);
              dispatch(setFieldMappingConfidences(confidences));
            }
          } catch (error) {
            console.error('Error restoring field mappings:', error);
          }
        }
      }).catch(error => {
        console.error('Error fetching data on page load:', error);
      }).finally(() => {
        setIsRestoringData(false);
      });
    }
  }, [isAuthenticated, isAuthLoading, router, hasData, getCarrierId, dispatch, setData, setViewData, setColumns, setEntityName]);

  if (isAuthLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Show loading screen during file upload
  if (isUploadingNewFile) {
    return (
      <AppLayout pageTitle={pageTitle}>
        <div className="flex h-full items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Processing Your File</h3>
              <p className="text-muted-foreground">
                Uploading and analyzing your data...
              </p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle={pageTitle}>
      {/* Three-column horizontal layout */}
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Left Panel: Smart Lookups - Only show when data is loaded */}
        {hasData && (
          <>
            <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
              <div className="h-full p-2">
                <SmartLookupsCard className="h-full" />
              </div>
            </ResizablePanel>
            <ResizableHandle className="bg-transparent border-none w-1 hover:bg-border/50 transition-colors" />
          </>
        )}

        {/* Center Panel: DataTable - Takes the main space */}
        <ResizablePanel 
          defaultSize={hasData ? (isChatPaneCollapsed ? 80 : 55) : (isChatPaneCollapsed ? 100 : 75)} 
          minSize={40}
        >
          <div className="h-full flex flex-col">
            {hasData && (
              <div className="p-4 flex-shrink-0">
                <ValidationStatusDisplay />
              </div>
            )}
            
            <div className="flex-grow min-h-0">
              <DataTable />
            </div>
          </div>
        </ResizablePanel>

        {/* Right Panel: ChatPane - Always render, but conditionally show content */}
        {!isChatPaneCollapsed && (
          <>
            <ResizableHandle className="bg-transparent border-none w-1 hover:bg-border/50 transition-colors" />
            <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
              <ChatPane />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      {/* Floating chat icon when chat pane is collapsed */}
      {isChatPaneCollapsed && (
        <TooltipProvider>
          <div className="fixed bottom-6 right-6 z-50">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={toggleChatPane}
                  size="icon"
                  className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <MessageSquare className="h-6 w-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Open Chat</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      )}
    </AppLayout>
  );
}
