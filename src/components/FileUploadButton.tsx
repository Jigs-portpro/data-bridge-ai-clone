
"use client";

import type React from 'react';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { UploadCloud } from 'lucide-react';
import { useAppContext } from '@/hooks/useAppContext';
import { parseCSV, findActualDataStart } from '@/lib/csvUtils';
import * as XLSX from 'xlsx';
import { SheetSelectionDialog } from '@/components/dialogs/SheetSelectionDialog'; // Import the new dialog

export function FileUploadButton() {
  const { setData, setColumns, setFileName, showToast, setIsLoading, clearChatHistory } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const [excelFileContent, setExcelFileContent] = useState<ArrayBuffer | null>(null);
  const [excelOriginalFile, setExcelOriginalFile] = useState<File | null>(null);
  const [excelSheetNames, setExcelSheetNames] = useState<string[]>([]);
  const [isSheetSelectionDialogOpen, setIsSheetSelectionDialogOpen] = useState(false);

  const processExcelSheet = (
    fileContentBuffer: ArrayBuffer,
    originalFileForContext: File,
    sheetToParse: string
  ) => {
    setIsLoading(true); // Ensure loading is true at the start of processing
    try {
      const workbook = XLSX.read(fileContentBuffer, { type: 'array' });
      if (!workbook.SheetNames.includes(sheetToParse)) {
        showToast({
          title: 'Sheet Not Found',
          description: `The selected sheet "${sheetToParse}" was not found in the workbook.`,
          variant: 'destructive',
        });
        throw new Error(`Sheet ${sheetToParse} not found.`);
      }
      const worksheet = workbook.Sheets[sheetToParse];

      const allSheetRowsMixedTypes: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, blankrows: true });
      const allSheetRowsAsStrings: string[][] = allSheetRowsMixedTypes.map(row =>
        row.map(cell => (cell === null || cell === undefined) ? "" : String(cell).trim())
      );

      const { dataStartIndex, headers: detectedHeaders } = findActualDataStart(allSheetRowsAsStrings);
      const finalHeaders = detectedHeaders;
      let parsedDataRows: Record<string, any>[] = [];

      if (finalHeaders.length > 0) {
        const dataContentRows = allSheetRowsAsStrings.slice(dataStartIndex + 1);
        parsedDataRows = dataContentRows.map((rowArray, rowIndexInContent) => {
          const row: Record<string, any> = {};
          const originalRowIndexInData = dataStartIndex + 1 + rowIndexInContent;
          
          finalHeaders.forEach((header, colIndex) => {
            // Use original mixed-type data for actual values if possible, fallback to stringified
            const originalCellData = allSheetRowsMixedTypes[originalRowIndexInData]?.[colIndex];
            row[header] = originalCellData !== undefined ? originalCellData : (rowArray[colIndex] ?? '');
          });
          if (Object.values(row).every(val => val === '' || val === null || val === undefined)) return null; // Skip fully empty rows
          return row;
        }).filter(row => row !== null) as Record<string, any>[];
      }

      if (finalHeaders.length === 0 && parsedDataRows.length === 0) {
        showToast({
          title: 'No Data Found',
          description: `Could not find any structured data in sheet "${sheetToParse}".`,
        });
        setData([]);
        setColumns([]);
      } else {
        setData(parsedDataRows);
        setColumns(finalHeaders);
        showToast({
          title: 'File Uploaded',
          description: `${originalFileForContext.name} (Sheet: ${sheetToParse}) processed successfully.`,
        });
        router.push('/');
      }
    } catch (error) {
      console.error('Error parsing Excel sheet:', error);
      showToast({
        title: 'Error Parsing Excel Sheet',
        description: 'Could not process the selected sheet. Please check its format.',
        variant: 'destructive',
      });
      setData([]);
      setColumns([]);
      setFileName(null);
    } finally {
      setIsSheetSelectionDialogOpen(false);
      setExcelFileContent(null);
      setExcelOriginalFile(null);
      setExcelSheetNames([]);
      setIsLoading(false);
       if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset file input
      }
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validCsvType = 'text/csv';
      const validXlsType = 'application/vnd.ms-excel';
      const validXlsxType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      if (![validCsvType, validXlsType, validXlsxType].includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xls') && !file.name.endsWith('.xlsx')) {
        showToast({
          title: 'Invalid File Type',
          description: 'Please upload a CSV or Excel file (.csv, .xls, .xlsx).',
          variant: 'destructive',
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setIsLoading(true);
      setFileName(file.name); // Set filename early for context
      clearChatHistory();

      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const fileContent = e.target?.result;
          if (!fileContent) {
            throw new Error("File content is empty or unreadable.");
          }

          if (file.type === validCsvType || file.name.endsWith('.csv')) {
            const parsedResult = parseCSV(fileContent as string);
            setData(parsedResult.rows);
            setColumns(parsedResult.headers);
            showToast({
              title: 'File Uploaded',
              description: `${file.name} processed successfully.`,
            });
            router.push('/');
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = ''; // Reset file input
          } else { // Excel file
            const workbook = XLSX.read(fileContent as ArrayBuffer, { type: 'array' });
            if (workbook.SheetNames.length === 0) {
                showToast({ title: 'Empty Workbook', description: 'The Excel file contains no sheets.', variant: 'destructive' });
                setIsLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }
            if (workbook.SheetNames.length === 1) {
              processExcelSheet(fileContent as ArrayBuffer, file, workbook.SheetNames[0]);
            } else {
              setExcelFileContent(fileContent as ArrayBuffer);
              setExcelOriginalFile(file);
              setExcelSheetNames(workbook.SheetNames);
              setIsSheetSelectionDialogOpen(true);
              // setIsLoading(false) will be handled by processExcelSheet or dialog close
            }
          }
        } catch (error) {
          console.error('Error processing file:', error);
          showToast({
            title: 'Error Processing File',
            description: 'Could not process the file. Please check its format.',
            variant: 'destructive',
          });
          setData([]);
          setColumns([]);
          setFileName(null);
          setIsLoading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };

      reader.onerror = () => {
        showToast({
          title: 'File Read Error',
          description: 'Could not read the file.',
          variant: 'destructive',
        });
        setIsLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      };

      if (file.type === validCsvType || file.name.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    } else {
         if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    // Reset file input value before click to allow re-uploading the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
        className="hidden"
        data-ai-hint="file input"
      />
      <Button onClick={handleClick} variant="outline">
        <UploadCloud className="mr-2 h-4 w-4" />
        Upload File
      </Button>
      <SheetSelectionDialog
        isOpen={isSheetSelectionDialogOpen}
        sheetNames={excelSheetNames}
        fileName={excelOriginalFile?.name}
        onClose={() => {
          setIsSheetSelectionDialogOpen(false);
          setExcelFileContent(null);
          setExcelOriginalFile(null);
          setExcelSheetNames([]);
          setIsLoading(false); // Ensure loading is reset if dialog is cancelled
          if (fileInputRef.current) fileInputRef.current.value = ''; // Reset
        }}
        onProcessSheet={(selectedSheet) => {
          if (excelFileContent && excelOriginalFile) {
            processExcelSheet(excelFileContent, excelOriginalFile, selectedSheet);
          }
        }}
      />
    </>
  );
}
