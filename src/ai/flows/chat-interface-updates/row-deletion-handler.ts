import { detectDuplicates } from "../duplicate-detection";
import { UserIntentDetectionOutputSchema } from "./user-intent-detection";
import { z } from "zod";
import { storeSessionData } from "@/utils/mongodb-helpers";

type IntentOutput = z.infer<typeof UserIntentDetectionOutputSchema>;

export interface RowDeletionHandlerParams {
  intentOutput: IntentOutput;
  parsedDataContext: any;
  columns: string[];
  aiProvider: string;
  aiModelName: string;
  userQuery: string;
  sessionId: string;
  entityName: string;
  sendChunk: (chunk: string) => void;
}

export async function handleRowDeletion({
  intentOutput,
  parsedDataContext,
  columns,
  aiProvider,
  aiModelName,
  userQuery,
  sessionId,
  entityName,
  sendChunk,
}: RowDeletionHandlerParams): Promise<string> {
  // Special case: deleting duplicate rows
  if (userQuery.toLowerCase().includes('duplicate') && (!intentOutput.targetRowIndices || intentOutput.targetRowIndices.length === 0)) {
    return handleDuplicateRowDeletion({
      parsedDataContext,
      columns,
      aiProvider,
      aiModelName,
      sessionId,
      entityName,
      sendChunk,
    });
  }

  if (!intentOutput.targetRowIndices || intentOutput.targetRowIndices.length === 0) {
    return `⚠️ **Row deletion request unclear**\n\nPlease specify which rows you want to delete. For example:\n- "delete row 5"\n- "remove rows 2, 4, and 6"\n- "delete rows 1 to 3"\n- "delete duplicate rows"`;
  }

  if (!intentOutput.deleteConfirmation) {
    const rowsToDelete = intentOutput.targetRowIndices.sort((a, b) => a - b);
    return `⚠️ **Confirm row deletion**\n\nYou want to delete ${rowsToDelete.length} row(s): ${rowsToDelete.join(', ')}\n\n**This action cannot be undone.** Please confirm by saying "yes, delete these rows" or "confirm deletion".`;
  }

  // Proceed with specific row deletion
  return handleSpecificRowDeletion({
    intentOutput,
    parsedDataContext,
    columns,
    sessionId,
    entityName,
    sendChunk,
  });
}

async function handleDuplicateRowDeletion({
  parsedDataContext,
  columns,
  aiProvider,
  aiModelName,
  sessionId,
  entityName,
  sendChunk,
}: {
  parsedDataContext: any;
  columns: string[];
  aiProvider: string;
  aiModelName: string;
  sessionId: string;
  entityName: string;
  sendChunk: (chunk: string) => void;
}): Promise<string> {
  sendChunk(`🔍 Finding and removing duplicate rows...\n`);
  
  try {
    const duplicateResult = await detectDuplicates({
      data: parsedDataContext.data,
      columns: columns, // Use all columns for duplicate detection
      aiProvider,
      aiModelName,
    });

    if (duplicateResult.duplicates.length === 0) {
      return `✅ **No duplicates to remove!**\n\nI found no duplicate records in your dataset.`;
    }

    // Get all duplicate row indices except the first occurrence of each group
    const rowsToDelete: number[] = [];
    duplicateResult.duplicates.forEach(group => {
      // Keep the first row (group[0]), delete the rest
      for (let i = 1; i < group.length; i++) {
        rowsToDelete.push(group[i] + 1); // Convert to 1-based indexing
      }
    });

    // Sort in descending order for safe deletion
    const sortedRowsToDelete = rowsToDelete.sort((a, b) => b - a);
    let updatedData = [...parsedDataContext.data];
    
    // Delete duplicate rows
    for (const rowIndex of sortedRowsToDelete) {
      const zeroBasedIndex = rowIndex - 1;
      updatedData.splice(zeroBasedIndex, 1);
    }

    // Update data in MongoDB
    await storeSessionData(sessionId, entityName, updatedData, columns);
    
    return `✅ **Duplicate rows removed successfully!**\n\n- Found ${duplicateResult.duplicates.length} duplicate groups\n- Removed ${rowsToDelete.length} duplicate rows (kept first occurrence of each)\n- Dataset now contains ${updatedData.length} records (was ${parsedDataContext.data?.length})`;
    
  } catch (error) {
    console.error('Duplicate removal error:', error);
    return `❌ Error removing duplicates: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

async function handleSpecificRowDeletion({
  intentOutput,
  parsedDataContext,
  columns,
  sessionId,
  entityName,
  sendChunk,
}: {
  intentOutput: IntentOutput;
  parsedDataContext: any;
  columns: string[];
  sessionId: string;
  entityName: string;
  sendChunk: (chunk: string) => void;
}): Promise<string> {
  sendChunk(`🗑️ Deleting specified rows...\n`);
  
  try {
    const originalDataLength = parsedDataContext.data?.length;
    const rowsToDelete = intentOutput.targetRowIndices!.sort((a, b) => b - a); // Sort descending for safe deletion
    let updatedData = [...parsedDataContext.data];
    
    // Validate row indices before deletion
    const validRows: number[] = [];
    const invalidRows: number[] = [];
    
    for (const rowIndex of rowsToDelete) {
      const zeroBasedIndex = rowIndex - 1;
      if (zeroBasedIndex >= 0 && zeroBasedIndex < originalDataLength) {
        validRows.push(rowIndex);
      } else {
        invalidRows.push(rowIndex);
      }
    }
    
    if (validRows.length === 0) {
      return `❌ **No valid rows to delete**\n\nAll specified row numbers (${rowsToDelete.join(', ')}) are out of range. Dataset has ${originalDataLength} rows (valid range: 1-${originalDataLength}).`;
    }
    
    // Delete valid rows in descending order to maintain correct indices
    const validRowsDescending = validRows.sort((a, b) => b - a);
    for (const rowIndex of validRowsDescending) {
      const zeroBasedIndex = rowIndex - 1;
      updatedData.splice(zeroBasedIndex, 1);
    }

    // Update data in MongoDB
    await storeSessionData(sessionId, entityName, updatedData, columns);
    
    let response = `✅ **Rows deleted successfully!**\n\n`;
    response += `- Deleted ${validRows.length} row(s): ${validRows.sort((a, b) => a - b).join(', ')}\n`;
    response += `- Dataset now contains ${updatedData.length} records (was ${originalDataLength})\n`;
    
    if (invalidRows.length > 0) {
      response += `\n⚠️ **Note:** Skipped invalid row numbers: ${invalidRows.join(', ')} (out of range)`;
    }
    
    return response;
    
  } catch (error) {
    console.error('Row deletion error:', error);
    return `❌ Error deleting rows: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
} 