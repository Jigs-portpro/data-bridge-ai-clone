import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ValidationErrorsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  validationMessages: string[];
  currentPage: number;
  errorCount: number;
}

export function ValidationErrorsDialog({
  isOpen,
  onClose,
  validationMessages,
  currentPage,
  errorCount,
}: ValidationErrorsDialogProps) {
  if (!isOpen || validationMessages.length === 0) {
    return null;
  }

  try {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
          {/* Header - Fixed height */}
          <div className="flex-shrink-0 p-6 pb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <DialogTitle className="text-lg font-semibold">
                Validation Errors - Page {currentPage}
              </DialogTitle>
            </div>
            <DialogDescription className="mt-2">
              {errorCount} error{errorCount !== 1 ? 's' : ''} found on this page. 
              Please review and fix the issues below.
            </DialogDescription>
          </div>
          
          {/* Content - Scrollable area */}
          <div className="flex-1 min-h-0 px-6">
            <div className="bg-red-50 border border-red-200 rounded-lg h-full flex flex-col">
              {/* Error list header */}
              <div className="flex items-center gap-2 p-4 pb-3 flex-shrink-0">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">
                  Validation Errors ({errorCount} found)
                </span>
              </div>
              
              {/* Scrollable error list */}
              <div className="flex-1 min-h-0 px-4 pb-4">
                <ScrollArea className="h-full">
                  <div className="space-y-2">
                    {validationMessages.map((message, index) => (
                      <div
                        key={index}
                        className="text-sm text-red-700 bg-white border border-red-100 rounded p-3"
                      >
                        {message}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
          
          {/* Footer - Fixed height */}
          <div className="flex-shrink-0 p-6 pt-4 border-t">
            <div className="flex justify-end">
              <Button onClick={onClose} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  } catch (error) {
    console.error('Error rendering ValidationErrorsDialog:', error);
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg max-w-md">
          <h3 className="text-lg font-semibold text-red-600 mb-2">Error Loading Dialog</h3>
          <p className="text-sm text-gray-600 mb-4">
            There was an error loading the validation errors dialog.
          </p>
          <Button onClick={onClose} variant="outline" className="w-full">
            Close
          </Button>
        </div>
      </div>
    );
  }
} 