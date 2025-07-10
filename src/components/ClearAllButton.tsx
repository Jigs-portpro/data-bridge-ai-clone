import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useAppContext } from "@/hooks/useAppContext";
import { useEntityContext } from "@/contexts/EntityContext";
import {
  DATATABLE_DATA_KEY,
  DATATABLE_COLUMNS_KEY,
  DATATABLE_EDITED_CELLS_KEY,
  CHATPANE_HISTORY_KEY,
  SELECTED_ENTITY_ID_KEY,
  EXPORT_FIELD_MAPPINGS_KEY,
  ENTITY_NAME_STORAGE_KEY,
  FILENAME_STORAGE_KEY,
} from "@/lib/constants";
import { useDispatch } from 'react-redux';
import { resetExportDataState } from '@/store/slices/exportDataSlice';
import { clearAllExportState } from '@/utils/helpers';
import { ConfirmationDialog } from '@/components/dialogs/ConfirmationDialog';
import { useState } from 'react';

export function ClearAllButton() {
  const {
    setData,
    setColumns,
    setDatatableEditedCells,
    clearChatHistory,
    setFileName,
    setSelectedEntityId,
    setFieldMappings,
    showToast,
  } = useAppContext();
  const dispatch = useDispatch();

  const { clearEntityState } = useEntityContext();
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleClearAll = async () => {
    try {
      // Clear Redis data first
      const response = await fetch('/api/clear-data', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn('Failed to clear Redis data:', response.statusText);
        // Continue with local cleanup even if Redis clear fails
      } else {
        console.log('✅ Redis data cleared successfully');
      }

      // Also clear organized data from Redis
      const organizedDataResponse = await fetch('/api/organized-data', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!organizedDataResponse.ok) {
        console.warn('Failed to clear organized data from Redis:', organizedDataResponse.statusText);
      } else {
        console.log('✅ Organized data cleared from Redis successfully');
      }
    } catch (error) {
      console.warn('Error clearing Redis data:', error);
      // Continue with local cleanup even if Redis clear fails
    }

    // Clear entity state
    clearEntityState();
    // Clear all Redux state for export data
    dispatch(resetExportDataState());
    
    // Reset in-memory state
    setData([]);
    setColumns([]);
    setDatatableEditedCells(new Set());
    clearChatHistory();
    setFileName("");
    setSelectedEntityId && setSelectedEntityId("");
    setFieldMappings && setFieldMappings({});
    showToast({
      title: "Workspace Cleared",
      description: "All data, chat, and Redis cache have been reset.",
      variant: "default",
    });
  };

  return (
    <>
      <Button
        onClick={() => setShowConfirmation(true)}
        variant="outline"
        aria-label="Clear All"
        title="Clear All"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      
      <ConfirmationDialog
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleClearAll}
        title="Clear All Data"
        description="Are you sure you want to clear all data? This will remove all uploaded files, chat history, validation results, and Redis cache. This action cannot be undone."
        confirmText="Yes, clear all data"
        cancelText="Cancel"
        variant="destructive"
      />
    </>
  );
}
