"use client";

import type React from 'react';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { UploadCloud } from 'lucide-react';
import { useAppContext } from '@/hooks/useAppContext';
import * as XLSX from 'xlsx';
import { SheetSelectionDialog } from '@/components/dialogs/SheetSelectionDialog';
import { ClearAllButton } from "@/components/ClearAllButton";
import { CHATPANE_HISTORY_KEY, ENTITY_NAME_STORAGE_KEY, DATATABLE_COLUMNS_KEY, DATATABLE_DATA_KEY } from '@/lib/constants';
import { useDispatch } from 'react-redux';
import { resetExportDataState } from '@/store/slices/exportDataSlice';
import { clearAllExportState } from '@/utils/helpers';

export function FileUploadButton() {
  const { setData, setColumns, setFileName, showToast, setIsLoading, clearChatHistory, setDatatableEditedCells, clearAllLookupData, setEntityName } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const dispatch = useDispatch();

  const [excelOriginalFile, setExcelOriginalFile] = useState<File | null>(null);
  const [excelSheetNames, setExcelSheetNames] = useState<string[]>([]);
  const [isSheetSelectionDialogOpen, setIsSheetSelectionDialogOpen] = useState(false);

  const uploadFile = async (file: File, sheetName?: string) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    if (sheetName) {
      formData.append("sheetName", sheetName);
    }

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "File upload failed");
      }

      const result = await response.json();
      const { entityName, fileName, sheetName: processedSheetName } = result;

      localStorage.setItem(ENTITY_NAME_STORAGE_KEY, entityName);
      setEntityName(entityName);
      setFileName(fileName);

      const dataResponse = await fetch(`/api/data?entityName=${entityName}`);
      if (!dataResponse.ok) {
        const errorData = await dataResponse.json();
        throw new Error(errorData.error || "Failed to fetch data after upload.");
      }

      const dataPayload = await dataResponse.json();

      if (dataPayload.data && dataPayload.data.length > 0) {
        const columns = Object.keys(dataPayload.data[0]);
        setData(dataPayload.data);
        setColumns(columns);
        setDatatableEditedCells(new Set());
        showToast({
          title: "File Uploaded",
          description: `${fileName}${processedSheetName ? ` (Sheet: ${processedSheetName})` : ''} processed successfully.`,
        });
        router.push("/");
      } else {
        showToast({
          title: "No Data Found",
          description: `The file was uploaded, but no data could be read.`,
          variant: "destructive",
        });
        setData([]);
        setColumns([]);
      }
    } catch (error: any) {
      console.error("Error during file upload:", error);
      showToast({
        title: "Upload Error",
        description: error.message || "An unknown error occurred.",
        variant: "destructive",
      });
      setData([]);
      setColumns([]);
      setFileName(null);
    } finally {
      setIsSheetSelectionDialogOpen(false);
      setExcelOriginalFile(null);
      setExcelSheetNames([]);
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };


  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // Clear localStorage for DataTable and ChatPane on new file upload
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DATATABLE_DATA_KEY);
      localStorage.removeItem(DATATABLE_COLUMNS_KEY);
      localStorage.removeItem(CHATPANE_HISTORY_KEY);
      localStorage.removeItem(ENTITY_NAME_STORAGE_KEY);
    }
    
    // Clear all validation state from localStorage using utility function
    clearAllExportState();
    
    // Clear all Redux state for export data
    dispatch(resetExportDataState());
    
    // Clear all lookup data cache when new file is uploaded
    clearAllLookupData();
    
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

      const isCsv = file.type === validCsvType || file.name.endsWith(".csv");

      if (isCsv) {
        uploadFile(file);
      } else { // Excel file
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const fileContent = e.target?.result;
            if (!fileContent) {
              throw new Error("File content is empty or unreadable.");
            }

            const workbook = XLSX.read(fileContent as ArrayBuffer, { type: 'array' });
            if (workbook.SheetNames.length === 0) {
                showToast({ title: 'Empty Workbook', description: 'The Excel file contains no sheets.', variant: 'destructive' });
                setIsLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }
            if (workbook.SheetNames.length === 1) {
              uploadFile(file, workbook.SheetNames[0]);
            } else {
              setExcelOriginalFile(file);
              setExcelSheetNames(workbook.SheetNames);
              setIsSheetSelectionDialogOpen(true);
              // setIsLoading(false) will be handled by uploadFile or dialog close
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
      <div className="flex gap-2 items-center">
        <Button onClick={handleClick} variant="outline">
          <UploadCloud className="mr-2 h-4 w-4" />
          Upload File
        </Button>
        <ClearAllButton />
      </div>
      <SheetSelectionDialog
        isOpen={isSheetSelectionDialogOpen}
        sheetNames={excelSheetNames}
        fileName={excelOriginalFile?.name}
        onClose={() => {
          setIsSheetSelectionDialogOpen(false);
          setExcelOriginalFile(null);
          setExcelSheetNames([]);
          setIsLoading(false); // Ensure loading is reset if dialog is cancelled
          if (fileInputRef.current) fileInputRef.current.value = ''; // Reset
        }}
        onProcessSheet={(selectedSheet) => {
          if (excelOriginalFile) {
            uploadFile(excelOriginalFile, selectedSheet);
          }
        }}
      />
    </>
  );
}
