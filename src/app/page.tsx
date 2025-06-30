"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/hooks/useAppContext';
import { AppLayout } from '@/components/AppLayout';
import { Loader2 } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { ChatPane } from '@/components/ChatPane';
import { SmartLookupsCard } from '@/components/SmartLookupsCard';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

export default function Home() {
  const { isAuthenticated, isAuthLoading, data, columns } = useAppContext();
  const router = useRouter();
  
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isAuthLoading, router]);


  if (isAuthLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const pageTitle = "DataWise Dashboard";
  const hasData = data && data.length > 0 && columns && columns.length > 0;
  // const hasData = false;

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
        <ResizablePanel defaultSize={hasData ? 55 : 75} minSize={40}>
          <div className="h-full">
            <DataTable />
          </div>
        </ResizablePanel>

        <ResizableHandle className="bg-transparent border-none w-1 hover:bg-border/50 transition-colors" />

        {/* Right Panel: ChatPane */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
          <ChatPane />
        </ResizablePanel>
      </ResizablePanelGroup>
    </AppLayout>
  );
}
