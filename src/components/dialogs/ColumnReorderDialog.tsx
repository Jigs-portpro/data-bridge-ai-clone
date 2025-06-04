
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
import { intelligentColumnReordering, type IntelligentColumnReorderingOutput, type IntelligentColumnReorderingClientInput } from '@/ai/flows/intelligent-column-reordering';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shuffle, CheckCircle, Loader2 } from 'lucide-react';

export function ColumnReorderDialog() {
  const {
    data,
    columns,
    setColumns, 
    setData, 
    activeDialog,
    closeDialog,
    showToast,
    isLoading: isAppLoadingGlobal, 
    setIsLoading: setIsAppLoadingGlobal, 
    selectedAiProvider,
    selectedAiModelName,
  } = useAppContext();
  const [reorderResult, setReorderResult] = useState<IntelligentColumnReorderingOutput | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleReorderColumns = async () => {
    if (!selectedAiProvider || !selectedAiModelName) {
      showToast({ title: 'AI Not Configured', description: 'Please select an AI provider and model in AI Settings.', variant: 'destructive'});
      return;
    }
    setIsProcessing(true);
    setIsAppLoadingGlobal(true);
    setReorderResult(null);
    try {
      const sampleData = data.slice(0, 5); 
      const input: IntelligentColumnReorderingClientInput = {
        columnNames: columns,
        sampleData,
        aiProvider: selectedAiProvider,
        aiModelName: selectedAiModelName,
      };
      const result = await intelligentColumnReordering(input);
      setReorderResult(result);
    } catch (error: any) {
      console.error('Error reordering columns:', error);
      let description = 'Failed to reorder columns. Please try again.';
      const errorMessage = String(error?.message || error).toLowerCase();
      if (errorMessage.includes('api key') || errorMessage.includes('authentication')) {
        description = 'Authentication failed with the AI provider. Check your API key.';
      } else if (errorMessage.includes('model not found')) {
        description = `The AI model ('${selectedAiProvider}/${selectedAiModelName}') was not found. Check AI Settings and key permissions.`;
      } else if (errorMessage.includes('503') || errorMessage.includes('unavailable') || errorMessage.includes('overloaded')) {
        description = 'The AI service is temporarily unavailable or overloaded. Please try again later.';
      }
      showToast({ title: 'Reorder Error', description, variant: 'destructive', duration: 9000 });
    } finally {
      setIsProcessing(false);
      setIsAppLoadingGlobal(false);
    }
  };

  const applyReordering = () => {
    if (!reorderResult) return;
    setIsProcessing(true); 
    setIsAppLoadingGlobal(true);
    try {
      const newColumns = reorderResult.reorderedColumnNames;
      setColumns(newColumns);
      showToast({ title: 'Columns Reordered', description: 'Columns have been intelligently reordered.' });
    } catch (error) {
        console.error('Error applying column reorder:', error);
        showToast({ title: 'Apply Error', description: 'Failed to apply new column order.', variant: 'destructive' });
    } finally {
        setIsProcessing(false);
        setIsAppLoadingGlobal(false);
    }
  };

  const isLoading = isAppLoadingGlobal || isProcessing;

  return (
    <Dialog open={activeDialog === 'reorder'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center"><Shuffle className="mr-2 h-5 w-5 text-primary"/>Intelligent Column Reordering</DialogTitle>
          <DialogDescription>
            Let AI analyze your column titles and content to suggest a more logical sequence. Ensure AI Provider & Model are set in AI Settings.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {!reorderResult && (
            <Button 
              onClick={handleReorderColumns} 
              disabled={isLoading || (!selectedAiProvider || !selectedAiModelName)} 
              className="w-full"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
              {isLoading ? 'Analyzing...' : 'Suggest Column Order'}
            </Button>
          )}
        </div>

        {reorderResult && (
          <div className="space-y-4">
            <Alert>
              <Shuffle className="h-4 w-4" />
              <AlertTitle className="font-headline">Suggested Order & Reasoning</AlertTitle>
              <AlertDescription>
                <p className="font-medium">New Order:</p>
                <p className="text-sm text-muted-foreground">{reorderResult.reorderedColumnNames.join(', ')}</p>
                <p className="font-medium mt-2">Reasoning:</p>
                <p className="text-sm text-muted-foreground">{reorderResult.reasoning}</p>
              </AlertDescription>
            </Alert>
            <Button onClick={applyReordering} disabled={isLoading} className="w-full">
              <CheckCircle className="mr-2 h-4 w-4" /> Apply This Order
            </Button>
             <Button 
                onClick={handleReorderColumns} 
                disabled={isLoading || (!selectedAiProvider || !selectedAiModelName)} 
                variant="outline" 
                className="w-full"
              >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
              Re-analyze
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
