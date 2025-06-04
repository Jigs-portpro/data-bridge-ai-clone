
"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/hooks/useAppContext';
import { generateAnomalyReport, type AnomalyReportOutput, type AnomalyReportClientInput } from '@/ai/flows/anomaly-report';
import { objectsToCsv } from '@/lib/csvUtils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Siren, Loader2 } from 'lucide-react';

export function AnomalyReportDialog() {
  const {
    data,
    columns,
    activeDialog,
    closeDialog,
    showToast,
    isLoading: isAppLoadingGlobal,
    setIsLoading: setIsAppLoadingGlobal,
    selectedAiProvider,
    selectedAiModelName,
  } = useAppContext();
  const [report, setReport] = useState<AnomalyReportOutput | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleGenerateReport = async () => {
    if (!selectedAiProvider || !selectedAiModelName) {
      showToast({ title: 'AI Not Configured', description: 'Please select an AI provider and model in AI Settings.', variant: 'destructive'});
      return;
    }
    setIsProcessing(true);
    setIsAppLoadingGlobal(true);
    setReport(null);
    try {
      const csvData = objectsToCsv(columns, data);
      const input: AnomalyReportClientInput = {
        data: csvData,
        columnNames: columns,
        aiProvider: selectedAiProvider,
        aiModelName: selectedAiModelName,
      };
      const result = await generateAnomalyReport(input);
      setReport(result);
    } catch (error: any) {
      console.error('Error generating anomaly report:', error);
      let description = 'Failed to generate anomaly report. Please try again.';
      const errorMessage = String(error?.message || error).toLowerCase();
      if (errorMessage.includes('api key') || errorMessage.includes('authentication')) {
        description = 'Authentication failed with the AI provider. Check your API key.';
      } else if (errorMessage.includes('model not found')) {
        description = `The AI model ('${selectedAiProvider}/${selectedAiModelName}') was not found. Check AI Settings and key permissions.`;
      } else if (errorMessage.includes('503') || errorMessage.includes('unavailable') || errorMessage.includes('overloaded')) {
        description = 'The AI service is temporarily unavailable or overloaded. Please try again later.';
      }
      showToast({ title: 'Anomaly Report Error', description, variant: 'destructive', duration: 9000 });
    } finally {
      setIsProcessing(false);
      setIsAppLoadingGlobal(false);
    }
  };

  const isLoading = isAppLoadingGlobal || isProcessing;

  return (
    <Dialog open={activeDialog === 'anomaly'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center"><Siren className="mr-2 h-5 w-5 text-primary"/>Anomaly Report</DialogTitle>
          <DialogDescription>
            Generate a report highlighting potential data anomalies based on statistical analysis. Ensure AI Provider & Model are set in AI Settings.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
           {!report && (
            <Button 
              onClick={handleGenerateReport} 
              disabled={isLoading || (!selectedAiProvider || !selectedAiModelName)} 
              className="w-full"
            >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                {isLoading ? 'Generating Report...' : 'Generate Anomaly Report'}
            </Button>
           )}
        </div>

        {report && (
          <div className="space-y-4">
            <Alert>
                <Siren className="h-4 w-4" />
                <AlertTitle className="font-headline">Anomaly Report Details</AlertTitle>
                <ScrollArea className="h-60 mt-2">
                    <AlertDescription className="whitespace-pre-wrap text-sm">
                        {report.report}
                    </AlertDescription>
                </ScrollArea>
            </Alert>
            <Button 
              onClick={handleGenerateReport} 
              disabled={isLoading || (!selectedAiProvider || !selectedAiModelName)} 
              variant="outline" 
              className="w-full"
            >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                {isLoading ? 'Generating Report...' : 'Re-generate Report'}
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={closeDialog} disabled={isLoading}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
