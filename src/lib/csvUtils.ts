
export type ParsedCSV = {
  headers: string[];
  rows: Record<string, any>[];
};

// Helper function to detect delimiter (comma or tab)
function detectDelimiter(csvString: string): string {
  const firstLine = csvString.split(/\r\n|\n/)[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  
  // If tabs are more common than commas, use tab as delimiter
  if (tabCount > commaCount) {
    return '\t';
  } else {
    return ',';
  }
}

// Helper function to parse CSV with proper handling of quoted fields with line breaks
function parseCSVWithQuotes(csvString: string, delimiter: string = ','): string[][] {
  const rows: string[][] = [];
  const lines = csvString.split(/\r\n|\n/);
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let lineIndex = 0;

  while (lineIndex < lines.length) {
    const line = lines[lineIndex];
    let charIndex = 0;

    while (charIndex < line.length) {
      const char = line[charIndex];

      if (inQuotes) {
        if (char === '"') {
          if (charIndex + 1 < line.length && line[charIndex + 1] === '"') {
            // Escaped quote
            currentField += '"';
            charIndex++;
          } else {
            // End of quoted field
            inQuotes = false;
          }
        } else {
          currentField += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === delimiter) {
          currentRow.push(currentField.trim());
          currentField = '';
        } else {
          currentField += char;
        }
      }
      charIndex++;
    }

    // If we're still in quotes, the field continues to the next line
    if (inQuotes) {
      currentField += '\n';
      lineIndex++;
    } else {
      // End of row
      currentRow.push(currentField.trim());
      if (currentRow.length > 0) {
        rows.push([...currentRow]);
      }
      currentRow = [];
      currentField = '';
      lineIndex++;
    }
  }

  // Handle any remaining field
  if (currentField.trim() !== '') {
    currentRow.push(currentField.trim());
  }
  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  return rows;
}

// Helper function to parse a single CSV row (handles basic quoting)
function parseCsvRow(rowString: string, delimiter: string = ','): string[] {
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
      } else if (char === delimiter) {
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

  // For CSV files, the first row should ALWAYS be the header
  // This is a more reliable approach than trying to guess
  if (allRowsAsArrays.length > 0) {
    const firstRow = allRowsAsArrays[0];
    return { dataStartIndex: 0, headers: firstRow };
  }

  return { dataStartIndex: 0, headers: [] };
}


export function parseCSV(csvString: string): ParsedCSV {
  const delimiter = detectDelimiter(csvString);
  
  // Parse the entire CSV string properly handling quoted fields with line breaks
  const allRowsAsArrays = parseCSVWithQuotes(csvString, delimiter);
  
  const { dataStartIndex, headers: finalHeaders } = findActualDataStart(allRowsAsArrays);

  if (finalHeaders.length === 0) {
    return { headers: [], rows: [] };
  }

  const dataContentLines = allRowsAsArrays.slice(dataStartIndex + 1);

  const rows = dataContentLines
    .map((values: string[]) => {
      // Skip rows that are completely empty after parsing
      if (values.every((val: string) => val.trim() === '')) return null;

      const row: Record<string, string> = {};
      finalHeaders.forEach((header, index) => {
        row[header] = values[index]?.trim() || '';
      });
      
      // Only include rows that have at least some meaningful data
      const nonEmptyValuesInRow = Object.values(row).filter((v: string) => v.trim() !== '').length;
      if (nonEmptyValuesInRow === 0) {
        return null;
      }
      
      return row;
    })
    .filter((row: Record<string, string> | null) => row !== null) as Record<string, any>[];

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
     if (!data || data?.length === 0) {
       return ''; // No headers, no data, return empty string
     }
     headers = Object.keys(data[0]);
  }
  
  const headerRow = headers.map(escapeCsvCell).join(',');

  if (!data || data?.length === 0) {
    return headerRow; // Only headers if no data
  }
  
  const dataRows = data.map(row => 
    headers.map(header => escapeCsvCell(row[header])).join(',')
  );
  return [headerRow, ...dataRows].join('\n');
}
