"use client";

import { useEffect } from "react";
import { AppProvider } from "@/contexts/AppContext";
import { Toaster } from "@/components/ui/toaster";
import { SessionProvider } from "next-auth/react";
import { useAppContext } from "@/hooks/useAppContext";
import { useEntityContext } from "@/contexts/EntityContext";
import { usePathname } from 'next/navigation';
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import store, { persistor } from "@/store";

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

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      console.log('handleBeforeUnload called', { data, columns, pathname });
      if (data && data.length > 0 && columns && columns.length > 0) {
        console.log('Preventing unload and setting reload flag');
        e.preventDefault();
        localStorage.setItem(RELOAD_FLAG_KEY, JSON.stringify({ path: pathname }));
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    const wasReloaded = localStorage.getItem(RELOAD_FLAG_KEY);
    if (wasReloaded) {
      const reloadInfo = JSON.parse(wasReloaded);
      // Only clear data if reload happened on main page
      if (reloadInfo.path === '/') {
        // Clear all data but preserve entity state for chat functionality
        setData([]);
        setColumns([]);
        setDatatableEditedCells(new Set());
        clearChatHistory();
        setFileName("");
        setSelectedEntityId && setSelectedEntityId("");
        setFieldMappings && setFieldMappings({});
        // Note: We're NOT calling clearEntityState() here to preserve the detected entity
        // This allows chat functionality to continue working after page reload

        showToast({
          title: "Workspace Cleared",
          description: "Page was reloaded. Table data has been reset, but entity detection preserved for chat.",
          variant: "default",
        });
      }
      localStorage.removeItem(RELOAD_FLAG_KEY);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return <>{children}</>;
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
