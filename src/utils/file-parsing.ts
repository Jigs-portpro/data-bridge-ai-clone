export function findActualDataStart(
  allRowsAsArrays: string[][],
  maxSearchDepth = 10
): { dataStartIndex: number; headers: string[] } {
  if (allRowsAsArrays.length === 0) return { dataStartIndex: 0, headers: [] };

  // For CSV files, the first row should ALWAYS be the header
  // This is a more reliable approach than trying to guess
  if (allRowsAsArrays.length > 0) {
    const firstRow = allRowsAsArrays[0];
    return { dataStartIndex: 0, headers: firstRow };
  }

  return { dataStartIndex: 0, headers: [] };
}