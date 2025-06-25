import {
  GEMINI_2_5_FLASH_OUTPUT_MAX_TOKENS,
  genAI,
} from "@/ai/genkit";

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
  modelName: string
): Promise<{ totalChunks: number; chunkedData: Record<string, any>[][] }> {
  const tokenCount = await calculateTokenCount(modelName, dataContext);

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
