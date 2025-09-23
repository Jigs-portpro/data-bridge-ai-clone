"use client";

import type React from 'react';
import { useAppContext } from '@/hooks/useAppContext';
import { DataToolsSidebar } from '@/components/DataToolsSidebar';
import { FileUploadButton } from '@/components/FileUploadButton';
import { ColumnMapperIcon } from '@/components/ColumnMapperIcon';
import { DataCorrectionDialog } from '@/components/dialogs/DataCorrectionDialog';
import { DataEnrichmentDialog } from '@/components/dialogs/DataEnrichmentDialog';
import { ColumnReorderDialog } from '@/components/dialogs/ColumnReorderDialog';
import { AnomalyReportDialog } from '@/components/dialogs/AnomalyReportDialog';
import { DuplicateDetectionDialog } from '@/components/dialogs/DuplicateDetectionDialog';
import { AddressProcessingDialog } from '@/components/dialogs/AddressProcessingDialog'; // Added new dialog
import { CityValidationDialog } from '@/components/dialogs/CityValidationDialog'; // Added city validation dialog
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Building2 } from 'lucide-react'; 


export function AppLayout({ children, pageTitle }: { children?: React.ReactNode; pageTitle: string }) {
  const { activeDialog, openDialog, data, isAuthenticated, currentCompanyName } = useAppContext();

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen bg-background w-full">
        <DataToolsSidebar />
        <div className="flex-1 flex flex-col min-h-0 w-full overflow-hidden">
          <main className="w-full mx-auto px-4 pt-4 md:px-6 md:pt-6 lg:px-8 lg:pt-8 flex flex-col flex-grow min-h-0">
            {isAuthenticated && (
              <div className="flex-shrink-0"> {/* Header wrapper */}
                <div className="flex flex-col gap-2"> {/* Vertical stacking for title block and context block */}
                  <div className="flex items-center justify-between"> {/* Title block */}
                    <div className="flex items-center gap-2">
                      <Building2 className="h-6 w-6 text-primary" />
                      <h1 className="text-2xl font-bold">{pageTitle}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileUploadButton />
                      <ColumnMapperIcon />
                    </div>
                  </div>
                  
                  {currentCompanyName && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground"> {/* Context block */}
                      <span>Company:</span>
                      <span className="font-medium">{currentCompanyName}</span>
                    </div>
                  )}
                </div>
                
                <Separator className="my-4 sm:my-6" />
              </div>
            )}

            <div className="flex-1 min-h-0 flex flex-col">
              {children}
            </div>
          </main>
        </div>
      </div>

      {activeDialog === 'correction' && <DataCorrectionDialog />}
      {activeDialog === 'enrichment' && <DataEnrichmentDialog />}
      {activeDialog === 'reorder' && <ColumnReorderDialog />}
      {activeDialog === 'anomaly' && <AnomalyReportDialog />}
      {activeDialog === 'duplicate' && <DuplicateDetectionDialog />}
      {activeDialog === 'addressProcessing' && <AddressProcessingDialog />} {/* Added new dialog */}
      {activeDialog === 'cityValidation' && <CityValidationDialog />} {/* Added city validation dialog */}
    </SidebarProvider>
  );
}
