import { ai } from "@/ai/genkit";
import {
  ChatInterfaceUpdatesOutputSchema,
  ChatInterfaceUpdatesClientInputSchema,
  ChatInterfaceUpdatesOutput,
} from "./schemas";
import { resolveAIModel } from "./model-resolver";
import { initializeLookupSystem } from "./lookup-manager";
import { generateEntityFields } from "./entity-processor";
import { validateData } from "./data-validator";
import { userIntentDetectionPrompt } from "./user-intent-detection";
import { EntitySchemaLookupIds, EntitySchema } from "@/schema";
import { z } from "zod";
import { getSystemPrompt } from "./prompt";
import { getChunkedDataContext, truncateLookupInfo } from "./utils";
import redis from "@/lib/redis";
import { generateRedisKey } from "@/utils/redis-helpers";
import { handleDuplicateDetection } from "./duplicate-handler";
import { handleRowDeletion } from "./row-deletion-handler";

export const chatInterfaceUpdatesFlow = ai.defineFlow(
  {
    name: "chatInterfaceUpdatesFlow",
    inputSchema: ChatInterfaceUpdatesClientInputSchema,
    outputSchema: z.string().describe("The final response from the AI."),
    streamSchema: z
      .string()
      .describe("The stream of the response from the AI."),
  },
  async (clientInput, { sendChunk }) => {
    const {
      aiProvider,
      aiModelName,
      userQuery,
      chatHistory: chatHistoryFromClient,
      apiToken,
      enableLookupValidation = true,
      appContextLookupData,
      entityName,
      sessionId,
      datatableEditedCells: editedCellsFromClient,
    } = clientInput;

    const chatHistory = (chatHistoryFromClient || []).map((m) => {
      return {
        role: m.role,
        content: m.content,
      };
    });

    // Resolve model
    const modelToUse = resolveAIModel(aiProvider, aiModelName);
    console.log("🤖 Model to use: ", modelToUse);

    // Get data from Redis
    const redisKey = generateRedisKey(sessionId, entityName);
    const redisData = await redis.get(redisKey);

    if (!redisData) {
      return `No data found for session ${sessionId} and entity ${entityName}. Please upload data first.`;
    }

    // Parse dataContext
    let parsedDataContext: any;
    try {
      parsedDataContext = JSON.parse(redisData);
    } catch (error) {
      console.error(`Error during dataContext parsing from Redis: ${error}`);
      return "Invalid JSON in stored data: " + (error as Error).message;
    }

    if (!parsedDataContext.data || !Array.isArray(parsedDataContext.data)) {
      return "Stored data is empty or has no valid data.";
    }

    // Get columns from dataContext or data
    const columns =
      parsedDataContext.columns || Object.keys(parsedDataContext.data[0] || {});
    if (!columns.length) {
      return "Stored data is empty or has no valid columns.";
    }

    const entitySchema = EntitySchema[entityName as keyof typeof EntitySchema];
    if (!entitySchema) {
      return `Could not find schema for entity: ${entityName}`;
    }

    sendChunk(`🤖 Detecting user intent for entity: ${entityName}\n`);

    let intentOutput;
    try {
      const result = await userIntentDetectionPrompt(
        {
          userQuery,
          chatHistory,
          hasDataContext: true,
          entityName,
        },
        { model: modelToUse }
      );
      intentOutput = result.output;

      if (!intentOutput) {
        return "AI did not return output for user intent detection.";
      }
    } catch (error) {
      console.error(`Error during user intent detection: ${error}`);
      sendChunk(
        `❌ Error detecting user intent. Please check your AI provider configuration and quota.\n`
      );
      return "Intent detection failed: " + error;
    }

    console.log(`🤖 User Intent Detected:`, {
      intent: intentOutput.primaryIntent,
      validation: intentOutput.shouldPerformValidation,
      modification: intentOutput.shouldModifyData,
      targetRowIndices: intentOutput.targetRowIndices,
      targetAllRows: intentOutput.targetAllRows,
      columnsForDuplicateCheck: intentOutput.columnsForDuplicateCheck,
      deleteConfirmation: intentOutput.deleteConfirmation,
    });

    sendChunk(`🤖 User Intent Detected: ${intentOutput.primaryIntent}\n`);

    const convesationalIntents = [
      "greeting",
      "question",
      "conversation",
      "help",
    ];
    if (convesationalIntents.includes(intentOutput.primaryIntent)) {
      return intentOutput.suggestedResponse;
    }

    // Handle duplicate detection intent
    if (intentOutput.primaryIntent === 'duplicate_detection') {
      return handleDuplicateDetection({
        intentOutput,
        parsedDataContext,
        columns,
        aiProvider,
        aiModelName,
        sendChunk,
      });
    }

    // Handle row deletion intent
    if (intentOutput.primaryIntent === 'row_deletion') {
      return handleRowDeletion({
        intentOutput,
        parsedDataContext,
        columns,
        aiProvider,
        aiModelName,
        userQuery,
        sessionId,
        entityName,
        sendChunk,
      });
    }

    // Get required lookup IDs from entitySchema
    const requiredLookupIds =
      EntitySchemaLookupIds[entityName as keyof typeof EntitySchemaLookupIds] ||
      [];

    console.log("🤖 AI-detected requiredLookupIds: ", requiredLookupIds);

    // Initialize lookup system
    const { lookupManager, lookupInfo } = await initializeLookupSystem(
      enableLookupValidation,
      apiToken,
      appContextLookupData,
      requiredLookupIds
    );

    // Generate entity fields with lookup manager
    const entityFields = generateEntityFields(
      columns,
      entitySchema,
      parsedDataContext,
      lookupManager
    );

    const truncatedLookupInfo = truncateLookupInfo(lookupInfo);

    // Prepare prompt data
    const promptData = {
      userQuery,
      entityFields,
      lookupInfo: truncatedLookupInfo,
      chatHistory: chatHistory,
    };

    let dataToProcess = parsedDataContext.data;
    const originalIndices: number[] = [];

    if (
      intentOutput.targetRowIndices &&
      intentOutput.targetRowIndices.length > 0
    ) {
      sendChunk(
        `🎯 Targeting rows: ${intentOutput.targetRowIndices.join(", ")}\n`
      );
      dataToProcess = intentOutput.targetRowIndices
        .map((rowIndex: number) => {
          const zeroBasedIndex = rowIndex - 1;
          if (
            zeroBasedIndex >= 0 &&
            zeroBasedIndex < parsedDataContext.data.length
          ) {
            originalIndices.push(zeroBasedIndex);
            return parsedDataContext.data[zeroBasedIndex];
          }
        })
        .filter(Boolean);
    } else {
      sendChunk(`🎯 Targeting all rows.\n`);
    }

    if (
      dataToProcess.length === 0 &&
      intentOutput.targetRowIndices &&
      intentOutput.targetRowIndices.length > 0
    ) {
      return "The specified rows to target are not valid. Please provide valid row numbers.";
    }

    const { totalChunks, chunkedData } = await getChunkedDataContext(
      dataToProcess as unknown as Record<string, any>[],
      "gemini-1.5-flash"
    );
    console.log("🤖 Total chunks: ", totalChunks);

    // Execute prompt
    let finalOutput;
    try {
      const messages = (chatHistory || []).map((m) => {
        // @ts-ignore - TODO: fix this
        const role = m.role == "assistant" ? "model" : m.role;
        return {
          role,
          content: [{ text: m.content }],
        };
      });

      let output: (Omit<ChatInterfaceUpdatesOutput, "updatedDataContext"> & {
        updatedDataContext?: any;
      })[] = [];
      const hasOneChunk = chunkedData.length === 1;
      let chunkIndex = 0;
      for (const currentChunk of chunkedData) {
        let validationErrors: string[][] = [];
        // // Only perform validation and correction based on AI intent detection
        if (intentOutput.shouldPerformValidation) {
          sendChunk("Validating data...\n");
          for (const chunk of chunkedData) {
            const { validationErrors: currentValidationErrors } = validateData(
              chunk,
              entitySchema,
              lookupManager
            );
            validationErrors.push(currentValidationErrors);
          }
        }

        const systemPrompt = getSystemPrompt(
          JSON.stringify(currentChunk),
          promptData.entityFields,
          promptData.lookupInfo || "",
          intentOutput.primaryIntent,
          validationErrors
        );

        const chunkMessage = hasOneChunk
          ? `🧠 Running AI data processing for ${currentChunk.length} records...\n`
          : `🧠 Running AI data processing for chunk ${++chunkIndex} with ${
              currentChunk.length
            } records...\n`;

        sendChunk(chunkMessage);

        const { response, stream } = ai.generateStream({
          prompt: promptData.userQuery,
          system: systemPrompt,
          model: modelToUse,
          messages: messages,
        });

        // During that process, send chunk of data processing to the user
        let responseSent = false;
        let dataProcessingMessageSent = false;
        let responseContent = ""; // Holds the full content of the response streamed so far

        for await (const partial of stream) {
          if (responseSent && dataProcessingMessageSent) continue;

          const accumulatedText = partial.accumulatedText;

          if (!responseSent) {
            let content = accumulatedText;
            const hasResponseStartTag =
              accumulatedText.includes("__RESPONSE_START__");

            if (hasResponseStartTag) {
              const startIndex =
                accumulatedText.indexOf("__RESPONSE_START__") +
                "__RESPONSE_START__".length;
              content = accumulatedText.substring(startIndex);
              const endIndex = content.indexOf("__RESPONSE_END__");
              if (endIndex !== -1) {
                content = content.substring(0, endIndex);
                responseSent = true;
              }
            } else {
              const dataStartIndex = accumulatedText.indexOf("__DATA_START__");
              if (dataStartIndex !== -1) {
                content = accumulatedText.substring(0, dataStartIndex);
                responseSent = true;
              }
            }

            if (content.length > responseContent.length) {
              const newChunk = content.substring(responseContent.length);
              sendChunk(newChunk);
              responseContent = content;
            }
          }

          if (responseSent && !dataProcessingMessageSent) {
            if (accumulatedText.includes("__DATA_START__")) {
              sendChunk("\n\n⏳ Processing or Updating data.");
              dataProcessingMessageSent = true;
            }
          }
        }

        const result = await response;
        console.log("Response received:");

        const llmOutput = result.text;

        console.log("LLM Output:", llmOutput);

        if (!llmOutput) {
          sendChunk(
            `❌ AI did not return an output for chat interface updates for chunk ${chunkIndex} with ${currentChunk.length} records.`
          );
          continue;
        }

        const responseRegex = /__RESPONSE_START__([\s\S]*)__RESPONSE_END__/;
        const dataRegex = /__DATA_START__([\s\S]*)__DATA_END__/;

        const responseMatch = llmOutput.match(responseRegex);
        const dataMatch = llmOutput.match(dataRegex);

        let modelResponse = "";
        if (responseMatch) {
          modelResponse = responseMatch[1].trim();
        } else {
          const dataStartIndex = llmOutput.indexOf("__DATA_START__");
          if (dataStartIndex !== -1) {
            modelResponse = llmOutput.substring(0, dataStartIndex).trim();
          } else {
            modelResponse = llmOutput.trim();
          }
        }
        const updatedDataContext = dataMatch ? dataMatch[1].trim() : "[]";

        console.log("🤖 Model Response: ", modelResponse);
        console.log("🤖 Updated Data Context: ", updatedDataContext);

        if (modelResponse) {
          sendChunk(modelResponse);
        }

        const currentOutput = {
          response: modelResponse,
          updatedDataContext: updatedDataContext,
        };

        if (currentOutput.updatedDataContext) {
          try {
            const parsedDataContext = JSON.parse(
              currentOutput.updatedDataContext
            );
            output.push({
              ...currentOutput,
              updatedDataContext: parsedDataContext,
            });
          } catch (error) {
            console.log("Error during updatedDataContext parsing: ");
            console.error(error);
            sendChunk(
              `❌ Error during processing chunk ${chunkIndex} with ${currentChunk.length} records. Skipping chunk and continuing.`
            );
            continue;
          }
        } else {
          output.push({
            ...currentOutput,
            updatedDataContext: currentChunk,
          });
        }
      }

      finalOutput = output.reduce(
        (acc, curr) => {
          const accData = acc.updatedDataContext || [];
          const currData = curr?.updatedDataContext || [];
          const combinedData = [...accData, ...currData] as Record<
            string,
            any
          >[];
          acc = {
            response:
              (acc.response || "") +
              (curr?.response ? "\n" + curr.response : ""),
            updatedDataContext: combinedData,
            isError: Boolean(acc.isError || curr?.isError),
          };
          return acc;
        },
        {
          response: "",
          updatedDataContext: [] as Record<string, any>[],
          isError: false,
        }
      );

      if (!finalOutput.response) {
        finalOutput.response = "Processed the data successfully.";
      }
    } catch (error: any) {
      console.error("Error during main AI prompt execution");
      console.error(error);
      console.error(error.stack);
      sendChunk(
        `❌ An error occurred while processing your request with the AI. Please try again.\n`
      );
      return "AI prompt execution failed: " + error;
    }

    let finalUpdatedData = parsedDataContext.data || [];
    const newEditedCells = new Set<string>(editedCellsFromClient || []);

    if (
      intentOutput.shouldModifyData &&
      finalOutput.updatedDataContext.length > 0
    ) {
      const originalData = dataToProcess;
      const modifiedData = finalOutput.updatedDataContext;

      if (
        Array.isArray(intentOutput.targetRowIndices) &&
        intentOutput.targetRowIndices.length > 0 &&
        originalIndices.length > 0
      ) {
        // Create a copy to avoid modifying the original data in this scope
        const updatedData = [...finalUpdatedData];
        modifiedData.forEach((updatedRow: any, i: number) => {
          const originalIndex = originalIndices[i];
          if (originalIndex !== undefined) {
            updatedData[originalIndex] = updatedRow;
            // Compare old and new row to find changed cells
            const oldRow = originalData[i] || {};
            Object.keys(updatedRow).forEach((col) => {
              if (oldRow[col] !== updatedRow[col]) {
                newEditedCells.add(`${originalIndex}:${col}`);
              }
            });
          }
        });
        finalUpdatedData = updatedData;
      } else {
        // This is a full data update, compare everything
        modifiedData.forEach((newRow: any, rowIndex: number) => {
          const oldRow = originalData[rowIndex] || {};
          Object.keys(newRow).forEach((col) => {
            if (oldRow[col] !== newRow[col]) {
              newEditedCells.add(`${rowIndex}:${col}`);
            }
          });
        });
        finalUpdatedData = modifiedData;
      }
    }

    // If data was modified, update it in Redis
    if (intentOutput.shouldModifyData) {
      const updatedDataContext = {
        columns: columns,
        data: finalUpdatedData,
        entityName: entityName,
        datatableEditedCells: Array.from(newEditedCells),
      };
      await redis.set(redisKey, JSON.stringify(updatedDataContext));
      console.log(`💾 Data updated in Redis for key: ${redisKey}`);
    }

    let response = finalOutput.response;

    return response;
  }
);
