
"use client";

import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppContext } from '@/hooks/useAppContext';
import { suggestDataCorrections, type SuggestDataCorrectionsOutput, type SuggestDataCorrectionsClientInput } from '@/ai/flows/data-correction-suggestions';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Wand2, Loader2 } from 'lucide-react';

export function DataCorrectionDialog() {
  const {
    data,
    columns,
    setData,
    activeDialog,
    closeDialog,
    showToast,
    isLoading: isAppLoadingGlobal, // Renamed to avoid conflict
    setIsLoading: setIsAppLoadingGlobal, // Renamed to avoid conflict
    selectedAiProvider,
    selectedAiModelName,
  } = useAppContext();
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [suggestions, setSuggestions] = useState<SuggestDataCorrectionsOutput | null>(null);
  const [isProcessing, setIsProcessing] = useState(false); // Local loading state

  useEffect(() => {
    if (columns.length > 0 && activeDialog === 'correction') {
      setSelectedColumn(columns[0]);
      setSuggestions(null); // Clear previous suggestions when dialog opens or columns change
    }
  }, [columns, activeDialog]);

  const handleSuggestCorrections = async () => {
    if (!selectedColumn) {
      showToast({ title: 'Select a column', description: 'Please select a column to get suggestions.', variant: 'destructive' });
      return;
    }
    if (!selectedAiProvider || !selectedAiModelName) {
      showToast({ title: 'AI Not Configured', description: 'Please select an AI provider and model in AI Settings.', variant: 'destructive'});
      return;
    }
    setIsProcessing(true);
    setIsAppLoadingGlobal(true);
    setSuggestions(null);
    try {
      const columnData = data.map(row => String(row[selectedColumn] ?? ''));
      const input: SuggestDataCorrectionsClientInput = {
        columnName: selectedColumn,
        data: columnData,
        aiProvider: selectedAiProvider,
        aiModelName: selectedAiModelName,
      };
      const result = await suggestDataCorrections(input);
      setSuggestions(result);
    } catch (error: any) {
      console.error('Error getting data correction suggestions:', error);
      let description = 'Failed to get correction suggestions. Please try again.';
      const errorMessage = String(error?.message || error).toLowerCase();
      
      if (errorMessage.includes('api key') || errorMessage.includes('authentication')) {
        description = 'Authentication failed. Please check your AI provider API key in the .env file.';
      } else if (errorMessage.includes('not found') && errorMessage.includes('model')) {
        description = `The selected AI model ('${selectedAiProvider}/${selectedAiModelName}') was not found by the AI provider. 
        Troubleshooting steps:
        1. Verify the model name is correct in AI Settings.
        2. Ensure your API key (e.g., OPENAI_API_KEY in .env) has access to this specific model.
        3. If using OpenAI, confirm your key is for OpenAI.com (not an Azure OpenAI key, unless the Genkit plugin is specifically configured for Azure).`;
      } else if (errorMessage.includes('503') || errorMessage.includes('unavailable') || errorMessage.includes('overloaded') || errorMessage.includes('rate limit')) {
        description = 'The AI service is temporarily unavailable, overloaded, or you have hit a rate limit. Please try again later.';
      }
      showToast({ title: 'Suggestion Error', description, variant: 'destructive', duration: 12000 });
    } finally {
      setIsProcessing(false);
      setIsAppLoadingGlobal(false);
    }
  };

  const handleApplyCorrections = () => {
    if (!suggestions || !selectedColumn) return;

    // CRITICAL CHECK: Ensure the AI returned the correct number of items.
    if (suggestions.correctedData.length !== data.length) {
      showToast({
        title: 'Correction Error',
        description: `The AI returned an incorrect number of corrected items (${suggestions.correctedData.length}) for column "${selectedColumn}". Expected ${data.length}. Corrections have NOT been applied to prevent data misalignment. Please try generating suggestions again or check the AI model's reliability.`,
        variant: 'destructive',
        duration: 15000, // Longer duration for critical error
      });
      setIsProcessing(false); // Reset loading state if any was set
      setIsAppLoadingGlobal(false); // Reset global loading state if any was set
      setSuggestions(null); // Clear potentially faulty suggestions
      return; // Stop further processing
    }
    
    setIsProcessing(true); 
    setIsAppLoadingGlobal(true);
    try {
      const newData = data.map((row, index) => ({
        ...row,
        [selectedColumn]: suggestions.correctedData[index] ?? row[selectedColumn],
      }));
      setData(newData);
      showToast({ title: 'Corrections Applied', description: `Corrections applied to column "${selectedColumn}".` });
      setSuggestions(null); 
    } catch (error) {
      console.error('Error applying corrections:', error);
      showToast({ title: 'Error', description: 'Failed to apply corrections.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
      setIsAppLoadingGlobal(false);
    }
  };

  const isLoading = isAppLoadingGlobal || isProcessing;

  return (
    <Dialog open={activeDialog === 'correction'} onOpenChange={(isOpen) => { if (!isOpen) closeDialog(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center"><Wand2 className="mr-2 h-5 w-5 text-primary" />Data Correction Suggestions</DialogTitle>
          <DialogDescription>
            Select a column to get AI-powered suggestions for casing, formatting, and other corrections. Ensure AI Provider & Model are set in AI Settings.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="column-select" className="text-right">
              Column
            </Label>
            <Select value={selectedColumn} onValueChange={setSelectedColumn} disabled={isLoading}>
              <SelectTrigger id="column-select" className="col-span-3">
                <SelectValue placeholder="Select a column" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((col) => (
                  <SelectItem key={col} value={col}>
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={handleSuggestCorrections} 
            disabled={isLoading || !selectedColumn || (!selectedAiProvider || !selectedAiModelName)}
          >
            {isLoading && isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isLoading && isProcessing ? 'Getting Suggestions...' : 'Get Suggestions'}
          </Button>
        </div>

        {suggestions && (
          <div className="mt-4 space-y-4">
            <Alert>
              <Wand2 className="h-4 w-4" />
              <AlertTitle className="font-headline">Correction Details</AlertTitle>
              <AlertDescription>
                <p className="font-medium">Explanation:</p>
                <p className="text-sm text-muted-foreground">{suggestions.explanation}</p>
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-2 gap-4 max-h-60">
              <div>
                <Label>Original Data ({selectedColumn})</Label>
                <ScrollArea className="h-40 rounded-md border p-2 bg-muted/50">
                  {data.map(row => String(row[selectedColumn] ?? '')).map((val, idx) => (
                    <div key={`orig-${idx}`} className="text-sm truncate">{val}</div>
                  ))}
                </ScrollArea>
              </div>
              <div>
                <Label>Suggested Corrections</Label>
                <ScrollArea className="h-40 rounded-md border p-2 bg-accent/10">
                   {suggestions.correctedData.map((val, idx) => (
                    <div key={`sugg-${idx}`} className="text-sm truncate text-accent-foreground font-medium">{val}</div>
                  ))}
                </ScrollArea>
              </div>
            </div>
             <Button onClick={handleApplyCorrections} disabled={isLoading} className="w-full">
              Apply These Corrections
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
