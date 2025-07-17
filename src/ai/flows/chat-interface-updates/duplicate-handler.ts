import { detectDuplicates } from "../duplicate-detection";
import { UserIntentDetectionOutputSchema } from "./user-intent-detection";
import { z } from "zod";

type IntentOutput = z.infer<typeof UserIntentDetectionOutputSchema>;

export interface DuplicateHandlerParams {
  intentOutput: IntentOutput;
  parsedDataContext: any;
  columns: string[];
  aiProvider: string;
  aiModelName: string;
  sendChunk: (chunk: string) => void;
}

export async function handleDuplicateDetection({
  intentOutput,
  parsedDataContext,
  columns,
  aiProvider,
  aiModelName,
  sendChunk,
}: DuplicateHandlerParams): Promise<string> {
  sendChunk(`🔍 Detecting duplicate records...\n`);
  
  try {
    const columnsToCheck = intentOutput.columnsForDuplicateCheck && intentOutput.columnsForDuplicateCheck.length > 0 
      ? intentOutput.columnsForDuplicateCheck 
      : columns; // Use all columns if none specified

    const duplicateResult = await detectDuplicates({
      data: parsedDataContext.data,
      columns: columnsToCheck,
      aiProvider,
      aiModelName,
    });

    if (duplicateResult.duplicates.length === 0) {
      return `✅ **No duplicates found!**\n\nI checked ${columnsToCheck.length} columns (${columnsToCheck.join(', ')}) across ${parsedDataContext.data?.length} records and found no duplicate entries.`;
    } else {
      let response = `🔍 **Found ${duplicateResult.duplicates.length} group(s) of duplicate records:**\n\n`;
      
      duplicateResult.duplicates.forEach((group, index) => {
        const rowNumbers = group.map(i => i + 1);
        response += `**Group ${index + 1}:** Rows ${rowNumbers.join(', ')} are duplicates\n`;
        
        // Show sample data from first row in group for context
        if (group.length > 0) {
          const sampleRow = parsedDataContext.data[group[0]];
          const sampleData = columnsToCheck.slice(0, 3).map((col: string) => `${col}: "${sampleRow[col] || 'N/A'}"`).join(', ');
          response += `  ↳ Sample values: ${sampleData}${columnsToCheck.length > 3 ? '...' : ''}\n`;
        }
      });

      response += `\n📊 **Summary:**\n`;
      response += `- Total duplicate groups: ${duplicateResult.duplicates.length}\n`;
      response += `- Total duplicate rows: ${duplicateResult.duplicates.flat().length}\n`;
      response += `- Columns checked: ${columnsToCheck.join(', ')}\n`;
      response += `- Original dataset size: ${parsedDataContext.data?.length} rows\n\n`;
      
      response += `💡 **Next steps:**\n`;
      response += `- Review these rows in your data table\n`;
      response += `- Ask me to "delete duplicate rows" (keeps first occurrence)\n`;
      response += `- Or delete specific rows like "delete rows 3, 5, 8"`;

      return response;
    }
  } catch (error) {
    console.error('Duplicate detection error:', error);
    return `❌ Error detecting duplicates: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
} 