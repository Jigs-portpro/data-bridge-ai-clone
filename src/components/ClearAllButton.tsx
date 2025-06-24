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
} from "@/lib/constants";
import { useDispatch } from 'react-redux';
import { resetExportDataState } from '@/store/slices/exportDataSlice';
import { clearAllExportState } from '@/utils/helpers';

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

  const handleClearAll = () => {
    // Remove all relevant localStorage keys
    localStorage.removeItem(DATATABLE_DATA_KEY);
    localStorage.removeItem(DATATABLE_COLUMNS_KEY);
    localStorage.removeItem(DATATABLE_EDITED_CELLS_KEY);
    localStorage.removeItem(CHATPANE_HISTORY_KEY);
    localStorage.removeItem(SELECTED_ENTITY_ID_KEY);
    localStorage.removeItem(EXPORT_FIELD_MAPPINGS_KEY);
    localStorage.removeItem(ENTITY_NAME_STORAGE_KEY);
    
    // Clear entity state
    clearEntityState();
    // Clear all validation state from localStorage using utility function
    clearAllExportState();
    
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
      description: "All data and chat have been reset.",
      variant: "default",
    });
  };

  return (
    <Button
      onClick={handleClearAll}
      variant="outline"
      aria-label="Clear All"
      title="Clear All"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
