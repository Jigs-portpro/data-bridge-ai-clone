
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/hooks/useAppContext';
import { AppLayout } from '@/components/AppLayout';
import { Loader2 } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { ChatPane } from '@/components/ChatPane';

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
      <div className="flex flex-col h-full">
        {/* DataTable Section - Takes remaining space and scrolls internally */}
        <div className="flex-grow min-h-0">
          <DataTable />
        </div>

        {/* ChatPane Section - Fixed Size at the bottom */}
        <div className="flex-shrink-0 pt-6">
          <ChatPane />
        </div>
      </div>
    </AppLayout>
  );
}
