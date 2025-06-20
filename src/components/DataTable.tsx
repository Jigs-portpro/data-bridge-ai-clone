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

export function DataTable() {
  const { data, columns, isLoading, fileName, datatableEditedCells, setData, setDatatableEditedCells } = useAppContext();
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

  // Save edit on blur or Enter
  const saveEdit = (rowIndex: number, col: string) => {
    const originalValue = String(data[rowIndex][col] ?? '');
    if (editValue !== originalValue) {
    const newData = data.map((row, idx) => {
      if (idx === rowIndex) {
        return { ...row, [col]: editValue };
      }
      return row;
    });
    setData(newData);
    setDatatableEditedCells(prev => {
      const updated = new Set(prev);
      updated.add(`${rowIndex}:${col}`);
      return updated;
    });
    }
    setEditingCell(null);
  };

  // Handle blur
  const handleInputBlur = (rowIndex: number, col: string) => {
    saveEdit(rowIndex, col);
  };

  // Handle Enter key
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, col: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit(rowIndex, col);
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
                            {String(row[col] ?? '')}
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

