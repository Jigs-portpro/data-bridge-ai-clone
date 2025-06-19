import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useAppContext } from "@/hooks/useAppContext";

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

  const handleClearAll = () => {
    // Remove all relevant localStorage keys
    localStorage.removeItem("datatable_data");
    localStorage.removeItem("datatable_columns");
    localStorage.removeItem("datatable_edited_cells");
    localStorage.removeItem("chatpane_history");
    localStorage.removeItem("export_selected_entity_id");
    // Remove all column mapping keys
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("columnMapping_")) localStorage.removeItem(key);
    });

    // Reset all in-memory state
    setData([]);
    setColumns([]);
    setDatatableEditedCells(new Set());
    clearChatHistory();
    setFileName("");
    setSelectedEntityId("");
    setFieldMappings({});

    showToast({
      title: "All Data Cleared",
      description: "All data, chat, and selections have been reset.",
      variant: "default",
    });
  };

  return (
    <Button onClick={handleClearAll} variant="destructive">
      <Trash2 className="mr-2 h-4 w-4" />
      Clear All
    </Button>
  );
} 