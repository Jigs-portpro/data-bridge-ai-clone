
"use client";

import React, { useState, useEffect } from 'react';
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
import { Layers } from 'lucide-react';

interface SheetSelectionDialogProps {
  isOpen: boolean;
  sheetNames: string[];
  onClose: () => void;
  onProcessSheet: (selectedSheetName: string) => void;
  fileName?: string | null;
}

export function SheetSelectionDialog({
  isOpen,
  sheetNames,
  onClose,
  onProcessSheet,
  fileName,
}: SheetSelectionDialogProps) {
  const [selectedSheet, setSelectedSheet] = useState<string>('');

  useEffect(() => {
    if (isOpen && sheetNames.length > 0) {
      setSelectedSheet(sheetNames[0]); // Default to the first sheet
    }
  }, [isOpen, sheetNames]);

  const handleProcess = () => {
    if (selectedSheet) {
      onProcessSheet(selectedSheet);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center">
            <Layers className="mr-2 h-5 w-5 text-primary" />
            Select Sheet to Process
          </DialogTitle>
          <DialogDescription>
            The Excel file{fileName ? ` "${fileName}"` : ''} contains multiple sheets. Please choose the one you want to load.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="sheet-select" className="text-right">
              Sheet
            </Label>
            <Select value={selectedSheet} onValueChange={setSelectedSheet}>
              <SelectTrigger id="sheet-select" className="col-span-3">
                <SelectValue placeholder="Select a sheet" />
              </SelectTrigger>
              <SelectContent>
                {sheetNames.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleProcess} disabled={!selectedSheet}>
            Process Sheet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
