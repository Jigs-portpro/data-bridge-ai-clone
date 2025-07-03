"use client";

import { useAppContext } from '@/hooks/useAppContext';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useEntityContext } from '@/contexts/EntityContext';
import { ENTITY_NAME_STORAGE_KEY } from '@/lib/constants';
import { getCustomerTypeLabels } from '@/utils/helpers';
import { Badge } from '@/components/ui/badge';

export function DataTable() {
  const { data, columns, isLoading, fileName, datatableEditedCells, setData, setDatatableEditedCells, entityName, showToast } = useAppContext();
  const { detectedEntity } = useEntityContext();
  const { data: session } = useSession();
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  if (isLoading && data.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="space-y-4 p-4 border rounded-lg shadow-sm bg-card w-full max-w-md">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }
  
  if (data.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-start">
        <div className="flex flex-col items-center justify-center h-64 border rounded-lg shadow-sm bg-card text-center p-6 w-full">
          <p className="text-lg font-medium text-muted-foreground">No data to display.</p>
          <p className="text-sm text-muted-foreground">Upload a file or link a Google Sheet to get started.</p>
        </div>
      </div>
    );
  }

  // Handle double click to start editing
  const handleCellDoubleClick = (rowIndex: number, col: string) => {
    setEditingCell({ row: rowIndex, col });
    setEditValue(String(data[rowIndex][col] ?? ''));
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  };

  // Helper function to save data to Redis
  const saveDataToRedis = async (updatedData: any[], updatedEditedCells: Set<string>) => {
    try {
      if (!session?.user?.sessionId) {
        console.error('No session ID available for Redis save');
        return;
      }

      const storedEntityName = typeof window !== 'undefined' ? localStorage.getItem(ENTITY_NAME_STORAGE_KEY) : null;
      const displayEntityName = detectedEntity?.entityName || entityName || storedEntityName;

      if (!displayEntityName) {
        console.error('No entity name available for Redis save');
        return;
      }

      const payload = {
        sessionId: session.user.sessionId,
        entityName: displayEntityName,
        data: updatedData,
        columns: columns,
        datatableEditedCells: Array.from(updatedEditedCells),
      };

      const response = await fetch('/api/data', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save data to Redis');
      }
    } catch (error) {
      console.error('Error saving to Redis:', error);
      showToast({
        title: 'Save Error',
        description: 'Failed to auto-save changes. Your changes are preserved locally.',
        variant: 'destructive',
        duration: 5000,
      });
    }
  };

  // Save edit on blur or Enter
  const saveEdit = async (rowIndex: number, col: string) => {
    const originalValue = String(data[rowIndex][col] ?? '');
    if (editValue !== originalValue) {
      const newData = data.map((row, idx) => {
        if (idx === rowIndex) {
          return { ...row, [col]: editValue };
        }
        return row;
      });
      
      const updatedEditedCells = new Set(datatableEditedCells);
      updatedEditedCells.add(`${rowIndex}:${col}`);

      // Update local state immediately
      setData(newData);
      setDatatableEditedCells(updatedEditedCells);

      // Save to Redis asynchronously
      await saveDataToRedis(newData, updatedEditedCells);
    }
    setEditingCell(null);
  };

  // Handle blur
  const handleInputBlur = async (rowIndex: number, col: string) => {
    await saveEdit(rowIndex, col);
  };

  // Handle Enter key
  const handleInputKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, col: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await saveEdit(rowIndex, col);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  return (
    <div className="space-y-4 p-1 h-full flex flex-col">
      {fileName && <h2 className="text-xl font-semibold font-headline flex-shrink-0">Preview: {fileName}</h2>}
      <ScrollArea className="rounded-md border shadow-sm w-full bg-card flex-grow min-h-0">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col} className="font-semibold whitespace-nowrap w-[1%]">{col}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((col) => {
                  const isEditing = editingCell && editingCell.row === rowIndex && editingCell.col === col;
                  return (
                    <TableCell
                      key={`${rowIndex}-${col}`}
                      className={`whitespace-nowrap relative group${datatableEditedCells.has(`${rowIndex}:${col}`) ? ' edited-cell' : ''}`}
                      onDoubleClick={() => handleCellDoubleClick(rowIndex, col)}
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          className="w-full px-1 py-0.5 border rounded focus:outline-none focus:ring"
                          value={editValue}
                          autoFocus
                          onChange={handleInputChange}
                          onBlur={() => handleInputBlur(rowIndex, col)}
                          onKeyDown={(e) => handleInputKeyDown(e, rowIndex, col)}
                        />
                      ) : (
                        <>
                          <div className="relative pr-6">
                            {col.toLowerCase() === 'customertype' 
                              ? (
                                  <div className="flex flex-wrap gap-1">
                                    {getCustomerTypeLabels(row[col]).map(label => (
                                      <Badge key={label} variant="secondary">{label}</Badge>
                                    ))}
                                  </div>
                                )
                              : String(row[col] ?? '')
                            }
                            <div className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-70 transition-opacity pointer-events-none">
                              <Pencil className="h-2 w-2 text-muted-foreground stroke-[3]" />
                            </div>
                          </div>
                        </>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

