
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAppContext } from '@/hooks/useAppContext';
import { dataEnrichment, type DataEnrichmentClientInput } from '@/ai/flows/data-enrichment';
import { objectsToCsv, parseCSV } from '@/lib/csvUtils';
import { Sparkles, Loader2 } from 'lucide-react';

export function DataEnrichmentDialog() {
  const {
    data,
    columns,
    setData,
    setColumns, // Added setColumns
    activeDialog,
    closeDialog,
    showToast,
    isLoading: isAppLoadingGlobal,
    setIsLoading: setIsAppLoadingGlobal,
    selectedAiProvider,
    selectedAiModelName,
  } = useAppContext();
  const [enrichmentInstructions, setEnrichmentInstructions] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleEnrichData = async () => {
    if (!enrichmentInstructions.trim()) {
      showToast({ title: 'Instructions Needed', description: 'Please provide enrichment instructions.', variant: 'destructive' });
      return;
    }
    if (!selectedAiProvider || !selectedAiModelName) {
      showToast({ title: 'AI Not Configured', description: 'Please select an AI provider and model in AI Settings.', variant: 'destructive'});
      return;
    }
    setIsProcessing(true);
    setIsAppLoadingGlobal(true);
    try {
      const csvData = objectsToCsv(columns, data);
      const input: DataEnrichmentClientInput = {
        data: csvData,
        enrichmentInstructions,
        aiProvider: selectedAiProvider,
        aiModelName: selectedAiModelName,
      };
      const result = await dataEnrichment(input);
      
      const parsedEnrichedData = parseCSV(result.enrichedData);
      setColumns(parsedEnrichedData.headers); // Set columns first
      setData(parsedEnrichedData.rows); // Then set data

      showToast({ title: 'Data Enriched', description: 'Data has been enriched successfully.' });
      // closeDialog(); 
    } catch (error: any) {
      console.error('Error enriching data:', error);
      let description = 'Failed to enrich data. Please try again.';
      const errorMessage = String(error?.message || error).toLowerCase();
      if (errorMessage.includes('api key') || errorMessage.includes('authentication')) {
        description = 'Authentication failed with the AI provider. Check your API key.';
      } else if (errorMessage.includes('model not found')) {
        description = `The AI model ('${selectedAiProvider}/${selectedAiModelName}') was not found. Check AI Settings and key permissions.`;
      } else if (errorMessage.includes('503') || errorMessage.includes('unavailable') || errorMessage.includes('overloaded')) {
        description = 'The AI service is temporarily unavailable or overloaded. Please try again later.';
      }
      showToast({ title: 'Enrichment Error', description, variant: 'destructive', duration: 9000 });
    } finally {
      setIsProcessing(false);
      setIsAppLoadingGlobal(false);
    }
  };
  
  const isLoading = isAppLoadingGlobal || isProcessing;

  return (
    <Dialog open={activeDialog === 'enrichment'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center"><Sparkles className="mr-2 h-5 w-5 text-primary"/>AI Data Enrichment</DialogTitle>
          <DialogDescription>
            Provide instructions to enrich your data (e.g., "Add a new column 'Category' based on 'Product Name'"). Ensure AI Provider & Model are set in AI Settings.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid w-full gap-1.5">
            <Label htmlFor="enrichment-instructions">Enrichment Instructions</Label>
            <Textarea
              id="enrichment-instructions"
              placeholder="e.g., Add a column 'Sentiment' based on 'Review Text'."
              value={enrichmentInstructions}
              onChange={(e) => setEnrichmentInstructions(e.target.value)}
              rows={5}
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={closeDialog} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleEnrichData} 
            disabled={isLoading || !enrichmentInstructions.trim() || (!selectedAiProvider || !selectedAiModelName)}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4" />}
            {isLoading ? 'Enriching...' : 'Enrich Data'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
