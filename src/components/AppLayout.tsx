
"use client";

import type React from 'react';
import { useAppContext } from '@/hooks/useAppContext';
import { DataToolsSidebar } from '@/components/DataToolsSidebar';
import { FileUploadButton } from '@/components/FileUploadButton';
import { DataCorrectionDialog } from '@/components/dialogs/DataCorrectionDialog';
import { DataEnrichmentDialog } from '@/components/dialogs/DataEnrichmentDialog';
import { ColumnReorderDialog } from '@/components/dialogs/ColumnReorderDialog';
import { AnomalyReportDialog } from '@/components/dialogs/AnomalyReportDialog';
import { DuplicateDetectionDialog } from '@/components/dialogs/DuplicateDetectionDialog';
import { AddressProcessingDialog } from '@/components/dialogs/AddressProcessingDialog'; // Added new dialog
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Send, Building2, ExternalLink } from 'lucide-react'; 
import Link from 'next/link';
import { useRouter } from 'next/navigation';


export function AppLayout({ children, pageTitle }: { children?: React.ReactNode; pageTitle: string }) {
  const { activeDialog, openDialog, data, isAuthenticated, currentCompanyName } = useAppContext();
  const isDataLoaded = data.length > 0;
  const router = useRouter();

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen bg-background">
        <DataToolsSidebar />
        <SidebarInset className="flex-1 flex flex-col overflow-hidden">
          <main className="container mx-auto p-4 md:p-6 lg:p-8 flex flex-col flex-grow min-h-0">
            {isAuthenticated && (
              <div className="flex-shrink-0"> {/* Header wrapper */}
                <div className="flex flex-col gap-2"> {/* Vertical stacking for title block and context block */}
                  {/* Top Block: Title and Actions */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    {/* Left: SidebarTrigger and Page Title */}
                    <div className="flex items-center gap-2 min-w-0">
                      <SidebarTrigger />
                      <h1 className="text-xl sm:text-2xl font-bold font-headline text-primary truncate" title={pageTitle}>
                        {pageTitle}
                      </h1>
                    </div>
                    
                    {/* Right: Global Actions */}
                    <div className="flex items-center gap-2 self-start sm:self-auto"> 
                      <FileUploadButton />
                      {/* Export Data button removed from global header */}
                    </div>
                  </div>

                  {/* Bottom Block: Company Context */}
                  <div className="flex items-center text-sm"> 
                    {currentCompanyName ? (
                      <div className="flex items-center text-muted-foreground">
                        <Building2 className="mr-2 h-4 w-4" />
                        <span>Target: {currentCompanyName}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-orange-600 dark:text-orange-400">No API Target Context Set</span>
                    )}
                  </div>
                </div>
                
                <Separator className="my-4 sm:my-6" />
              </div>
            )}

            <div className="flex-grow min-h-0 flex flex-col">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>

      {activeDialog === 'correction' && <DataCorrectionDialog />}
      {activeDialog === 'enrichment' && <DataEnrichmentDialog />}
      {activeDialog === 'reorder' && <ColumnReorderDialog />}
      {activeDialog === 'anomaly' && <AnomalyReportDialog />}
      {activeDialog === 'duplicate' && <DuplicateDetectionDialog />}
      {activeDialog === 'addressProcessing' && <AddressProcessingDialog />} {/* Added new dialog */}
    </SidebarProvider>
  );
}
