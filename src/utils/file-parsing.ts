export function findActualDataStart(
  allRowsAsArrays: string[][],
  maxSearchDepth = 10
): { dataStartIndex: number; headers: string[] } {
  if (allRowsAsArrays.length === 0) return { dataStartIndex: 0, headers: [] };

  let actualDataStartIndex = 0;
  let foundHeaders: string[] = [];

  // Find first row that is not completely empty
  let firstPotentiallyContentfulRowIndex = -1;
  for (let i = 0; i < allRowsAsArrays.length; i++) {
    if (allRowsAsArrays[i].some(cell => cell.trim() !== '')) {
      firstPotentiallyContentfulRowIndex = i;
      break;
    }
  }

  if (firstPotentiallyContentfulRowIndex === -1) { // All rows are blank or effectively empty
    return { dataStartIndex: allRowsAsArrays.length, headers: [] };
  }

  // If only one contentful row, assume it's headers
  if (firstPotentiallyContentfulRowIndex === allRowsAsArrays.length - 1) {
    return { dataStartIndex: firstPotentiallyContentfulRowIndex, headers: allRowsAsArrays[firstPotentiallyContentfulRowIndex] };
  }
  
  const searchEndIndex = Math.min(firstPotentiallyContentfulRowIndex + maxSearchDepth, allRowsAsArrays.length -1);

  for (let i = firstPotentiallyContentfulRowIndex; i <= searchEndIndex; i++) {
    const potentialHeaderCells = allRowsAsArrays[i];
    if (potentialHeaderCells.length === 0 || potentialHeaderCells.every(cell => cell.trim() === '')) {
      continue; // Skip fully empty or effectively empty rows within search depth
    }

    // Look at the next row to gauge consistency, if it exists
    const nextRowCells = (i + 1 < allRowsAsArrays.length) ? allRowsAsArrays[i + 1] : null;

    // Heuristic 1: Column count consistency.
    // A header should have a reasonable number of columns (>1 usually).
    // And it should be somewhat consistent with the next row if data follows.
    let colCountScore = 0;
    if (potentialHeaderCells.length > 1) colCountScore += 1;
    if (nextRowCells && nextRowCells.length > 0) {
      // Allow some flexibility: next row can have slightly fewer or more columns
      if (Math.abs(potentialHeaderCells.length - nextRowCells.length) <= Math.max(2, potentialHeaderCells.length * 0.3)) {
        colCountScore += 2;
      } else if (nextRowCells.length >= potentialHeaderCells.length * 0.5) { // next row is not drastically shorter
        colCountScore +=1;
      }
    } else if (potentialHeaderCells.length > 1) { // No next row, but header has multiple columns
       colCountScore +=1; // Weaker signal
    }


    // Heuristic 2: Header-like content (mostly non-numeric strings)
    let nonNumericStringCells = 0;
    let nonEmptyCells = 0;
    potentialHeaderCells.forEach(cell => {
      const trimmedCell = String(cell).trim();
      if (trimmedCell !== '') nonEmptyCells++;
      if (trimmedCell !== '' && isNaN(Number(trimmedCell))) {
        nonNumericStringCells++;
      }
    });
    
    let contentScore = 0;
    if (nonEmptyCells > 0 && (nonNumericStringCells / nonEmptyCells) >= 0.6) { // At least 60% non-numeric
      contentScore += 2;
    } else if (nonEmptyCells > 0) {
      contentScore +=1;
    }
    
    // If both scores are decent, consider this the header
    if (colCountScore >= 2 && contentScore >= 2) {
      actualDataStartIndex = i;
      foundHeaders = potentialHeaderCells;
      return { dataStartIndex: actualDataStartIndex, headers: foundHeaders };
    }
  }

  // Fallback: If no "intelligent" header found after search, use the first potentially contentful row.
  actualDataStartIndex = firstPotentiallyContentfulRowIndex;
  foundHeaders = allRowsAsArrays[actualDataStartIndex];
  return { dataStartIndex: actualDataStartIndex, headers: foundHeaders };
}