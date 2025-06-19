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
    localStorage.removeItem("export_field_mappings");
    // Reset in-memory state
    setData([]);
    setColumns([]);
    setDatatableEditedCells(new Set());
    clearChatHistory();
    setFileName("");
    setSelectedEntityId && setSelectedEntityId("");
    setFieldMappings && setFieldMappings({});
    showToast({ title: "Workspace Cleared", description: "All data and chat have been reset.", variant: "default" });
  };

  return (
    <Button onClick={handleClearAll} variant="outline" aria-label="Clear All" title="Clear All">
      <Trash2 className="h-4 w-4" />
    </Button>
  );
} 