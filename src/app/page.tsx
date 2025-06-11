"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/hooks/useAppContext';
import { AppLayout } from '@/components/AppLayout';
import { Loader2 } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { ChatPane } from '@/components/ChatPane';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

export default function Home() {
  const { isAuthenticated, isAuthLoading } = useAppContext();
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

  return (
    <AppLayout pageTitle={pageTitle}>
      {/* Page specific content below the global header provided by AppLayout */}
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* DataTable Section - Takes remaining space and scrolls internally */}
        <ResizablePanel defaultSize={75} minSize={50}>
          <div className="h-full">
            <DataTable />
          </div>
        </ResizablePanel>

        <ResizableHandle className="bg-transparent border-none w-1 hover:bg-border/50 transition-colors" />

        {/* ChatPane Section - Resizable */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={50}>
          <ChatPane />
        </ResizablePanel>
      </ResizablePanelGroup>
    </AppLayout>
  );
}
