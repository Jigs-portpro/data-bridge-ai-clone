
export type ParsedCSV = {
  headers: string[];
  rows: Record<string, any>[];
};

// Helper function to parse a single CSV row (handles basic quoting)
function parseCsvRow(rowString: string): string[] {
  const values: string[] = [];
  let inQuotes = false;
  let currentValue = '';
  let charIndex = 0;

  while (charIndex < rowString.length) {
    const char = rowString[charIndex];

    if (inQuotes) {
      if (char === '"') {
        if (charIndex + 1 < rowString.length && rowString[charIndex + 1] === '"') {
          // Escaped quote
          currentValue += '"';
          charIndex++;
        } else {
          // End of quoted field
          inQuotes = false;
        }
      } else {
        currentValue += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    charIndex++;
  }
  values.push(currentValue.trim()); // Add the last value
  return values;
}

// Helper to find the actual start of data (header row index and header content)
// rows: array of string arrays (each string array is a row with cells)
// maxSearchDepth: how many initial non-blank rows to check for a header
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


export function parseCSV(csvString: string): ParsedCSV {
  const allLinesRaw = csvString.trim().split(/\r\n|\n/);
  if (allLinesRaw.length === 0) return { headers: [], rows: [] };

  const allRowsAsArrays = allLinesRaw.map(line => parseCsvRow(line));
  
  const { dataStartIndex, headers: finalHeaders } = findActualDataStart(allRowsAsArrays);

  if (finalHeaders.length === 0) {
    return { headers: [], rows: [] };
  }

  const dataContentLines = allRowsAsArrays.slice(dataStartIndex + 1);

  const rows = dataContentLines
    .map(values => {
      // Skip rows that are completely empty after parsing
      if (values.every(val => val.trim() === '')) return null;

      const row: Record<string, string> = {};
      finalHeaders.forEach((header, index) => {
        row[header] = values[index]?.trim() || '';
      });
      
      // Basic check: if a row has drastically fewer values than headers, it might be a footer or irrelevant.
      // Only apply this if headers are more than a couple.
      const nonEmptyValuesInRow = values.filter(v => v.trim() !== '').length;
      if (finalHeaders.length > 2 && nonEmptyValuesInRow < finalHeaders.length * 0.5 && nonEmptyValuesInRow < 2) {
        return null;
      }
      return row;
    })
    .filter(row => row !== null) as Record<string, any>[];

  return { headers: finalHeaders, rows };
}

const escapeCsvCell = (value: any): string => {
  const strValue = (value === null || typeof value === 'undefined') ? '' : String(value);
  if (strValue.includes(',') || strValue.includes('\n') || strValue.includes('"')) {
    return `"${strValue.replace(/"/g, '""')}"`;
  }
  return strValue;
};

export function objectsToCsv(headers: string[], data: Record<string, any>[]): string {
  if (!headers || headers.length === 0) {
     if (!data || data.length === 0) {
       return ''; // No headers, no data, return empty string
     }
     headers = Object.keys(data[0]);
  }
  
  const headerRow = headers.map(escapeCsvCell).join(',');

  if (!data || data.length === 0) {
    return headerRow; // Only headers if no data
  }
  
  const dataRows = data.map(row => 
    headers.map(header => escapeCsvCell(row[header])).join(',')
  );
  return [headerRow, ...dataRows].join('\n');
}
