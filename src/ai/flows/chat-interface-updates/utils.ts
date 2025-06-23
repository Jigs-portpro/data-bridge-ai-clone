import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  GEMINI_2_5_FLASH_OUTPUT_MAX_TOKENS,
  GEMINI_2_5_INPUT_MAX_TOKENS,
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

// Since, output tokens is 65536, we need to chunk the data context if it's too large
export async function getChunkedDataContext(
  dataContext: Record<string, any>[],
  modelName: string
): Promise<{ totalChunks: number; chunkedData: Record<string, any>[][] }> {
  const tokenCount = await calculateTokenCount(modelName, dataContext);
  let totalChunks = 0;

  let chunkedData: Record<string, any>[][] = [];
  if (tokenCount > GEMINI_2_5_INPUT_MAX_TOKENS) {
    totalChunks = Math.ceil(tokenCount / GEMINI_2_5_INPUT_MAX_TOKENS);
  } 

  const chunkRowSize = Math.ceil(
    dataContext.length / totalChunks // Assuming average 10 tokens per row
  );

  console.log(`Chunk row size: ${chunkRowSize}`);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkRowSize;
    const end = start + chunkRowSize;
    chunkedData.push(dataContext.slice(start, end));
  }

  return {
    totalChunks,
    chunkedData,
  };
}
