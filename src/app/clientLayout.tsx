"use client";

import { useEffect, useState } from "react";
import { AppProvider } from "@/contexts/AppContext";
import { Toaster } from "@/components/ui/toaster";
import { SessionProvider } from "next-auth/react";
import { useAppContext } from "@/hooks/useAppContext";
import { useEntityContext } from "@/contexts/EntityContext";
import { usePathname } from 'next/navigation';
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import store, { persistor } from "@/store";
import { ConfirmationDialog } from '@/components/dialogs/ConfirmationDialog';
import { useDispatch } from 'react-redux';
import { resetExportDataState } from '@/store/slices/exportDataSlice';

// Flag to track if page was reloaded
const RELOAD_FLAG_KEY = 'portpro-page-reloaded';

function ClientLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { 
    showToast, 
    setData, 
    setColumns, 
    setDatatableEditedCells, 
    clearChatHistory, 
    setFileName, 
    setSelectedEntityId, 
    setFieldMappings,
    data,
    columns,
    fileName
  } = useAppContext();
  const { clearEntityState } = useEntityContext();
  const dispatch = useDispatch();
  const [isMounted, setIsMounted] = useState(false);
  const [showRefreshConfirmation, setShowRefreshConfirmation] = useState(false);
  const [pendingRefreshAction, setPendingRefreshAction] = useState<(() => Promise<void>) | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      console.log('handleBeforeUnload called', { data, columns, pathname });
      if (data && data.length > 0 && columns && columns.length > 0) {
        console.log('Preventing unload and setting reload flag');
        e.preventDefault();
        localStorage.setItem(RELOAD_FLAG_KEY, JSON.stringify({ path: pathname }));
        return 'You have unsaved data. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    const wasReloaded = localStorage.getItem(RELOAD_FLAG_KEY);
    if (wasReloaded) {
      const reloadInfo = JSON.parse(wasReloaded);
      // Only clear data if reload happened on main page
      if (reloadInfo.path === '/') {
        // Show confirmation dialog instead of immediately clearing
        const clearDataAction = async () => {
          try {
            // Clear Redis data first
            const response = await fetch('/api/clear-data', {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              },
            });

            if (!response.ok) {
              console.warn('Failed to clear Redis data:', response.statusText);
            } else {
              console.log('✅ Redis data cleared successfully');
            }


          } catch (error) {
            console.warn('Error clearing Redis data:', error);
          }

          // Clear all data but preserve entity state for chat functionality
          setData([]);
          setColumns([]);
          setDatatableEditedCells(new Set());
          clearChatHistory();
          setFileName("");
          setSelectedEntityId && setSelectedEntityId("");
          setFieldMappings && setFieldMappings({});
          
          // Clear Redux state for export data
          dispatch(resetExportDataState());
          
          // Note: We're NOT calling clearEntityState() here to preserve the detected entity
          // This allows chat functionality to continue working after page reload

          showToast({
            title: "Workspace Cleared",
            description: "Page was reloaded. Table data has been reset, but entity detection preserved for chat.",
            variant: "default",
          });
        };
        
        setPendingRefreshAction(() => clearDataAction);
        setShowRefreshConfirmation(true);
      }
      localStorage.removeItem(RELOAD_FLAG_KEY);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
      }, [isMounted, data, columns, pathname, setData, setColumns, setDatatableEditedCells, clearChatHistory, setFileName, setSelectedEntityId, setFieldMappings, showToast, dispatch]);

  return (
    <>
      {children}
      
      <ConfirmationDialog
        isOpen={showRefreshConfirmation}
        onClose={() => {
          setShowRefreshConfirmation(false);
          setPendingRefreshAction(null);
        }}
        onConfirm={async () => {
          if (pendingRefreshAction) {
            await pendingRefreshAction();
          }
          setShowRefreshConfirmation(false);
          setPendingRefreshAction(null);
        }}
        title="Page Refreshed"
        description="The page was refreshed and data was detected. Would you like to clear all data and start fresh? This will remove all uploaded files, chat history, and validation results."
        confirmText="Yes, clear all data"
        cancelText="Keep existing data"
        variant="default"
      />
    </>
  );
}


export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <AppProvider>
            <ClientLayoutContent>
              {children}
              <Toaster />
            </ClientLayoutContent>
          </AppProvider>
        </PersistGate>
      </Provider>
    </SessionProvider>
  );
}
