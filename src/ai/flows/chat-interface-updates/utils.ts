import {
  GEMINI_2_5_FLASH_OUTPUT_MAX_TOKENS,
  genAI,
} from "@/ai/genkit";
import Fuse from 'fuse.js';

export function truncateLookupInfo(lookupInfo: string): string {
  try {
    const parsed = JSON.parse(lookupInfo);
    if (typeof parsed !== "object" || parsed === null) return lookupInfo;

    const newInfo: Record<string, any> = {};
    for (const key in parsed) {
      if (Array.isArray(parsed[key])) {
        const originalLength = parsed[key].length;
        if (originalLength > 5) {
          newInfo[key] = `Top 5 values: ${parsed[key]
            .slice(0, 5)
            .join(
              ", "
            )}. (${originalLength} total values available, please refer to the lookup source for a complete list.)`;
        } else {
          newInfo[key] = parsed[key];
        }
      } else {
        newInfo[key] = parsed[key];
      }
    }
    return JSON.stringify(newInfo, null, 2);
  } catch (e) {
    return lookupInfo; // Return original string if parsing fails
  }
}

export async function calculateTokenCount(
  modelName: string,
  dataContext: Record<string, any>[]
): Promise<number> {
  const model = genAI?.getGenerativeModel({ model: modelName });
  const tokenCount = await model?.countTokens(JSON.stringify(dataContext));
  return tokenCount?.totalTokens || 0;
}

// Since the model returns the full data context, we chunk it based on the output token limit
// to avoid exceeding the maximum output size.
export async function getChunkedDataContext(
  dataContext: Record<string, any>[],
  modelName: string,
  targetColumns: string[] = []
): Promise<{ totalChunks: number; chunkedData: Record<string, any>[][] }> {
  const filteredDataContext = targetColumns.length > 0 ? dataContext.map((row) => { 
    const filteredRow: Record<string, any> = {};
    targetColumns.forEach((column) => {
      filteredRow[column] = row[column];
    });
    return filteredRow;
  }) : dataContext;
  const tokenCount = await calculateTokenCount(modelName, filteredDataContext);
  // Define a safety margin to ensure output doesn't exceed the model's limit.
  // This leaves room for the model's text response, JSON structure overhead, etc.
  const CHUNK_SAFETY_MARGIN = 0.8; // Use 80% of the max output tokens for the data chunk.
  const safeChunkTokenLimit =
    GEMINI_2_5_FLASH_OUTPUT_MAX_TOKENS * CHUNK_SAFETY_MARGIN;

  let totalChunks;

  if (tokenCount > safeChunkTokenLimit) {
    totalChunks = Math.ceil(tokenCount / safeChunkTokenLimit);
  } else {
    totalChunks = 1;
  }

  let chunkedData: Record<string, any>[][] = [];
  if (totalChunks > 1) {
    const chunkRowSize = Math.ceil(dataContext.length / totalChunks);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkRowSize;
      const end = start + chunkRowSize;
      chunkedData.push(dataContext.slice(start, end));
    }
  } else {
    chunkedData.push(dataContext);
  }

  return {
    totalChunks,
    chunkedData,
  };
}

export function extractSchemaDetails(
  fieldSchema: any,
  fieldName: string,
  isRequired: boolean
): any {
  const details = {
    name: fieldName,
    type: "unknown",
    minLength: null,
    maxLength: null,
    pattern: null,
    required: isRequired || !fieldSchema.isOptional(),
    allowedValues: null,
  };

  if (fieldSchema._def) {
    const def = fieldSchema._def;
    details.type = def.typeName || "unknown";

    if (def.typeName === "ZodString" && def.checks) {
      for (const check of def.checks) {
        if (check.kind === "min") details.minLength = check.value;
        if (check.kind === "max") details.maxLength = check.value;
        if (check.kind === "regex") details.pattern = check.regex.source;
      }
    }

    if (def.typeName === "ZodEnum" && def.values) {
      details.allowedValues = def.values;
    }

    if (def.typeName === "ZodOptional" && def.innerType) {
      const innerDetails = extractSchemaDetails(def.innerType, fieldName, false);
      details.type = innerDetails.type;
      details.minLength = innerDetails.minLength;
      details.maxLength = innerDetails.maxLength;
      details.pattern = innerDetails.pattern;
      details.allowedValues = innerDetails.allowedValues;
      details.required = false;
    }
  }

  return details;
}

export function extractLookupValidation(fieldSchema: any): any {
  if (fieldSchema?.lookupValidation) {
    return fieldSchema.lookupValidation;
  }
  if (fieldSchema?._def?.typeName === "ZodOptional") {
    return extractLookupValidation(fieldSchema._def.innerType);
  }
  if (fieldSchema?._def?.typeName === "ZodIntersection") {
    const left = extractLookupValidation(fieldSchema._def.left);
    if (left) return left;
    return extractLookupValidation(fieldSchema._def.right);
  }
  return null;
}

/**
 * Calculates a syntactic confidence score based on fuzzy matching.
 * @param inputColumns - Array of column names from the CSV.
 * @param targetSchemaColumns - The schema columns to match against.
 * @returns A normalized score from 0.0 (no match) to 1.0 (perfect match).
 */
export function calculateSyntacticScore(inputColumns: string[], targetSchemaColumns: string[]): number {
  if (!inputColumns.length || !targetSchemaColumns.length) {
    return 0;
  }

  const fuse = new Fuse(targetSchemaColumns, {
    includeScore: true,
    threshold: 0.4, // Stricter threshold to avoid false positives
    distance: 100,
  });

  let totalScore = 0;
  let matchesFound = 0;

  for (const inputCol of inputColumns) {
    const result = fuse.search(inputCol);
    if (result.length > 0 && result[0].score !== undefined) {
      // fuse.js score is 0 for perfect match, 1 for mismatch.
      // We invert it to get a confidence score (1 is perfect).
      const bestMatchScore = 1 - result[0].score;
      totalScore += bestMatchScore;
      matchesFound++;
    }
  }

  // Return the average confidence of the columns that found a match.
  return matchesFound > 0 ? totalScore / matchesFound : 0;
}