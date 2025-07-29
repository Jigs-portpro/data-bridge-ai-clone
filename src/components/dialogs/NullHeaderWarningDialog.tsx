import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Upload, X, Edit3 } from 'lucide-react';

interface NullHeaderWarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: (updatedColumns: string[]) => void;
  onReupload: () => void;
  nullHeaders: string[];
  fileName?: string;
  originalColumns: string[];
}

export function NullHeaderWarningDialog({
  isOpen,
  onClose,
  onContinue,
  onReupload,
  nullHeaders,
  fileName,
  originalColumns
}: NullHeaderWarningDialogProps) {
  const [showHeaderEditor, setShowHeaderEditor] = useState(false);
  const [updatedColumns, setUpdatedColumns] = useState<string[]>([]);
  const [headerInputs, setHeaderInputs] = useState<Record<number, string>>({});

  // Initialize when dialog opens
  useEffect(() => {
    if (isOpen) {
      setUpdatedColumns([...originalColumns]);
      setShowHeaderEditor(false);
      setHeaderInputs({});
    }
  }, [isOpen, originalColumns]);

  // Find indices of null headers
  const nullHeaderIndices = originalColumns
    .map((col, index) => ({ col, index }))
    .filter(({ col }) => !col || col.trim() === '')
    .map(({ index }) => index);

  const handleEditHeaders = () => {
    setShowHeaderEditor(true);
    // Initialize inputs with empty strings for null headers
    const inputs: Record<number, string> = {};
    nullHeaderIndices.forEach(index => {
      inputs[index] = '';
    });
    setHeaderInputs(inputs);
  };

  const handleHeaderInputChange = (index: number, value: string) => {
    setHeaderInputs(prev => ({
      ...prev,
      [index]: value
    }));
  };



  const handleContinueWithUpdatedHeaders = () => {
    // Create the updated columns array with the current header inputs
    const newColumns = [...originalColumns];
    Object.entries(headerInputs).forEach(([indexStr, value]) => {
      const index = parseInt(indexStr);
      if (value.trim()) {
        newColumns[index] = value.trim();
      }
    });
    onContinue(newColumns);
  };



  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <DialogTitle>Null Headers Detected</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            Your uploaded file contains columns with null or empty headers. You can name them now or continue as-is.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="text-sm font-medium text-yellow-800 mb-1">
              File: {fileName || 'Unknown file'}
            </div>
            <div className="text-sm text-yellow-700">
              <strong>Null headers found:</strong> {nullHeaders.length} column(s)
            </div>
            <div className="text-xs text-yellow-600 mt-1">
              Column positions: {nullHeaderIndices.map(i => i + 1).join(', ')}
            </div>
          </div>

          {!showHeaderEditor ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm font-medium text-blue-800 mb-2">
                💡 What would you like to do?
              </div>
              <div className="text-sm text-blue-700 space-y-1">
                <div>• <strong>Name the headers:</strong> Give meaningful names to blank columns</div>
                <div>• <strong>Re-upload:</strong> Upload a new file with proper headers</div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="text-sm font-medium text-green-800 mb-2">
                  ✏️ Name Your Headers
                </div>
                <div className="text-sm text-green-700">
                  Give meaningful names to the blank columns. This will help with data mapping.
                </div>
              </div>
              
              <div className="space-y-2">
                {nullHeaderIndices.map((index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Label className="text-sm font-medium min-w-[80px] flex-shrink-0">
                      Column {index + 1}:
                    </Label>
                    <Input
                      value={headerInputs[index] || ''}
                      onChange={(e) => handleHeaderInputChange(index, e.target.value)}
                      placeholder={`Enter name for column ${index + 1}`}
                      className="flex-1 min-w-0"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-wrap gap-2 justify-end">
          {!showHeaderEditor ? (
            <>
              <Button
                variant="outline"
                onClick={onReupload}
                className="flex items-center gap-2 flex-shrink-0"
              >
                <Upload className="h-4 w-4" />
                Re-upload File
              </Button>
              <Button
                variant="destructive"
                onClick={onClose}
                className="flex items-center gap-2 flex-shrink-0"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={handleEditHeaders}
                className="flex items-center gap-2 flex-shrink-0"
              >
                <Edit3 className="h-4 w-4" />
                Name Headers
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setShowHeaderEditor(false)}
                className="flex-shrink-0"
              >
                Cancel
              </Button>
              <Button
                onClick={handleContinueWithUpdatedHeaders}
                className="flex items-center gap-2 flex-shrink-0"
                disabled={Object.values(headerInputs).some(input => !input.trim())}
              >
                Continue to Mapping
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 