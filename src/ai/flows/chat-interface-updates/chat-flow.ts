import { ai } from "@/ai/genkit";
import {
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
import { handleDuplicateDetection } from "./duplicate-handler";
import { handleRowDeletion } from "./row-deletion-handler";
import { generateAbortKey } from "@/utils/redis-helpers";
import { getDataWithMetadata, updateSessionData } from "@/utils/mongodb-helpers";

export const chatInterfaceUpdatesFlow = ai.defineFlow(
  {
    name: "chatInterfaceUpdatesFlow",
    inputSchema: ChatInterfaceUpdatesClientInputSchema,
    outputSchema: z.string().describe("The final response from the AI."),
    streamSchema: z
      .string()
      .describe("The stream of the response from the AI."),
  },
  async (clientInput, { sendChunk, abortSignal }) => {
    const {
      carrierId,
      page,
      limit,
      aiProvider,
      aiModelName,
      userQuery,
      chatHistory: chatHistoryFromClient,
      apiToken,
      enableLookupValidation = true,
      appContextLookupData,
      entityName,
      sessionId,
      entity_session_id,
      datatableEditedCells: editedCellsFromClient,
    } = clientInput;

    const abortKey = generateAbortKey(sessionId, entity_session_id);

    const abortReason: string =
      abortSignal.reason || "Chat flow aborted by client.";

    const checkIfAborted = async () => {
      const aborted = await redis.get(abortKey);
      if (aborted === "true") {
        sendChunk(abortReason);
        return true;
      }
      return false;
    };

    const chatHistory = (chatHistoryFromClient || []).map((m) => {
      return {
        role: m.role,
        content: m.content,
      };
    });

    // Resolve model
    const modelToUse = resolveAIModel(aiProvider, aiModelName);
    console.log("🤖 Model to use: ", modelToUse);

    // Get data from database
    const mongoData = await getDataWithMetadata(carrierId, page, limit);

    if (await checkIfAborted()) return abortReason;

    if (!mongoData) {
      return `No data found for session ${sessionId} and entity ${entityName}. Please upload data first.`;
    }

    // Parse dataContext
    let parsedDataContext: any;
    try {
      parsedDataContext = mongoData ?? [];
    } catch (error) {
      console.error(`Error during dataContext parsing from Redis: ${error}`);
      return "Invalid JSON in stored data: " + (error as Error).message;
    }

    // Check if we have error data to process
    const hasErrorData = parsedDataContext.errorRows && Array.isArray(parsedDataContext.errorRows) && parsedDataContext.errorRows.length > 0;
    
    if (!parsedDataContext.data || !Array.isArray(parsedDataContext.data)) {
      return "Stored data is empty or has no valid data.";
    }

    // Get columns from dataContext or data
    const columns =
      parsedDataContext.columns || Object.keys(parsedDataContext.data[0] || {});
    if (!columns.length) {
      return "Stored data is empty or has no valid columns.";
    }

    // If we have error data, use only the error rows for processing
    if (hasErrorData) {
      sendChunk(`🎯 Processing ${parsedDataContext.errorRows.length} rows with errors.\n`);
      // Filter data to only include error rows
      const errorData = parsedDataContext.errorRows.map((rowIndex: number) => parsedDataContext.data[rowIndex]).filter(Boolean);
      parsedDataContext.data = errorData;
    } else {
      sendChunk(`🎯 Processing all available data.\n`);
    }

    if (await checkIfAborted()) return abortReason;

    const entitySchema = EntitySchema[entityName as keyof typeof EntitySchema];
    if (!entitySchema) {
      return `Could not find schema for entity: ${entityName}`;
    }

    sendChunk(`🤖 Detecting user intent for entity: ${entityName}\n`);

    let intentOutput;
    console.log('🔍 Columns: ', columns);
    try {
      if (await checkIfAborted()) return abortReason;
      const result = await userIntentDetectionPrompt(
        {
          userQuery,
          chatHistory,
          hasDataContext: true,
          entityName,
          dataColumns: columns,
        },
        { model: modelToUse, abortSignal: abortSignal }
      );
      intentOutput = result.output;

      if (!intentOutput) {
        return "AI did not return output for user intent detection.";
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("User intent detection was aborted.");
        return "Flow aborted by client.";
      }
      console.error(`Error during user intent detection: ${error}`);
      sendChunk(
        `❌ Error detecting user intent. Please check your AI provider configuration and quota.\n`
      );
      return "Intent detection failed: " + error;
    }

    if (await checkIfAborted()) return abortReason;

    console.log(`🤖 User Intent Detected:`, {
      intent: intentOutput.primaryIntent,
      validation: intentOutput.shouldPerformValidation,
      modification: intentOutput.shouldModifyData,
      targetRowIndices: intentOutput.targetRowIndices,
      targetAllRows: intentOutput.targetAllRows,
      targetColumns: intentOutput.targetColumns,
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
    if (intentOutput.primaryIntent === "duplicate_detection") {
      return handleDuplicateDetection({
        intentOutput,
        parsedDataContext,
        columns,
        aiProvider,
        aiModelName,
        sendChunk,
      });
    }

    if (await checkIfAborted()) return abortReason;

    // Handle row deletion intent
    if (intentOutput.primaryIntent === "row_deletion") {
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

    if (await checkIfAborted()) return abortReason;

    // Get required lookup IDs from entitySchema
    const requiredLookupIds =
      EntitySchemaLookupIds[entityName as keyof typeof EntitySchemaLookupIds] ||
      [];

    console.log("🤖 AI-detected requiredLookupIds: ", requiredLookupIds);

    if (await checkIfAborted()) return abortReason;

    // Initialize lookup system
    const { lookupManager, lookupInfo } = await initializeLookupSystem(
      enableLookupValidation,
      apiToken,
      appContextLookupData,
      requiredLookupIds
    );

    if (await checkIfAborted()) return abortReason;

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
      const targetColumns = intentOutput.targetColumns || [];
      sendChunk(
        `🎯 Targeting rows: ${intentOutput.targetRowIndices.join(", ")} and columns: ${targetColumns.length > 0 ? targetColumns.join(", ") : 'All'}\n`
      );
      dataToProcess = intentOutput.targetRowIndices
        .map((rowIndex: number) => {
          const zeroBasedIndex = rowIndex - 1;
          if (
            zeroBasedIndex >= 0 &&
            zeroBasedIndex < parsedDataContext.data?.length
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
      "gemini-1.5-flash",
      intentOutput.targetColumns || []
    );
    console.log("🤖 Total chunks: ", totalChunks);

    if (await checkIfAborted()) return abortReason;

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
        if (await checkIfAborted()) return abortReason;
        let validationErrors: string[][] = [];
        // // Only perform validation and correction based on AI intent detection
        if (intentOutput.shouldPerformValidation) {
          sendChunk("Validating data...\n");
          for (const chunk of chunkedData) {
            const { validationErrors: currentValidationErrors } = validateData(
              chunk,
              entitySchema,
              lookupManager,
              intentOutput.targetColumns || []
            );
            validationErrors.push(currentValidationErrors);
          }
        }

        if (await checkIfAborted()) {
          sendChunk("Flow aborted by client during validation.");
          break;
        }

        const systemPrompt = getSystemPrompt(
          JSON.stringify(currentChunk),
          promptData.entityFields,
          promptData.lookupInfo || "",
          intentOutput.primaryIntent,
          validationErrors,
          intentOutput.targetRowIndices
        );

        const chunkMessage = hasOneChunk
          ? `🧠 Running AI data processing for ${currentChunk.length} records...\n`
          : `🧠 Running AI data processing for chunk ${++chunkIndex} with ${
              currentChunk.length
            } records...\n`;

        sendChunk(chunkMessage);

        if (await checkIfAborted()) {
          sendChunk("Flow aborted by client during system prompt generation.");
          break;
        }

        const { response, stream } = ai.generateStream({
          prompt: promptData.userQuery,
          system: systemPrompt,
          model: resolveAIModel(aiProvider, 'gemini-2.5-pro'), // hardcode gemini-2.5-pro model for validation and correction tasks
          messages: messages,
          abortSignal: abortSignal,
        });

        // During that process, send chunk of data processing to the user
        let responseFinalized = false;
        let responseContent = ""; // Keep track of the response content for final parsing

        for await (const partial of stream) {
          if (await checkIfAborted()) {
            sendChunk("Flow aborted by client during streaming.");
            break;
          }
          if (responseFinalized) continue;

          const accumulatedText = partial.accumulatedText;
          const dataStartIndex = accumulatedText.indexOf("__DATA_START__");

          if (dataStartIndex !== -1) {
            // __DATA_START__ found. The response part of the stream is now finished.
            // Calculate the final part of the response that we haven't sent yet.
            const finalResponse = accumulatedText.substring(0, dataStartIndex);
            if (finalResponse.length > responseContent.length) {
              const lastChunk = finalResponse.substring(responseContent.length);
              sendChunk(lastChunk);
            }

            // Send the processing message and stop streaming.
            sendChunk(
              finalResponse +
                "\n\n\n--------------------------------\n\n\n⏳ Processing or Updating data."
            );
            responseFinalized = true;
          } else {
            responseContent = accumulatedText;
            sendChunk(responseContent);
          }
        }

        if (await checkIfAborted()) {
          sendChunk("Flow aborted by client during response generation.");
          break;
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
            if (await checkIfAborted()) {
              sendChunk(
                "Flow aborted by client during updatedDataContext parsing."
              );
              break;
            }
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

      if (await checkIfAborted()) {
        sendChunk("Flow aborted by client during final output generation.");
        return abortReason;
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
      if (error.name === "AbortError") {
        console.log("Flow execution was aborted during AI generation.");
        return abortReason;
      }
      console.error("Error during main AI prompt execution");
      console.error(error.stack);
      sendChunk(
        `❌ An error occurred while processing your request with the AI. Please try again.\n`
      );
      return "AI prompt execution failed: " + error;
    }

    if (await checkIfAborted()) {
      sendChunk("Flow aborted by client during final output generation.");
      return abortReason;
    }

    let finalUpdatedData = parsedDataContext.data || [];
    const newEditedCells = new Set<string>(editedCellsFromClient || []);

    if (
      intentOutput.shouldModifyData &&
      finalOutput.updatedDataContext.length > 0
    ) {
      const updatedData = [...finalUpdatedData];
      const corrections = finalOutput.updatedDataContext as {
        targetRow: number;
        values: Record<string, any>;
      }[];

      corrections.forEach((correction) => {
        const zeroBasedIndex = correction.targetRow - 1;
        if (zeroBasedIndex >= 0 && zeroBasedIndex < updatedData.length) {
          const oldRow = updatedData[zeroBasedIndex] || {};
          const newRow = { ...oldRow, ...correction.values };
          updatedData[zeroBasedIndex] = newRow;

          Object.keys(correction.values).forEach((col) => {
            if (oldRow[col] !== correction.values[col]) {
              newEditedCells.add(`${zeroBasedIndex}:${col}`);
            }
          });
        }
      });
      finalUpdatedData = updatedData;
    }

    if (await checkIfAborted()) return abortReason;

    // If data was modified, update it in Redis
    if (intentOutput.shouldModifyData && !(await checkIfAborted())) {
      const updatedDataContext = {
        columns: columns,
        data: finalUpdatedData,
        entityName: entityName,
        datatableEditedCells: Array.from(newEditedCells),
      };

      await updateSessionData(carrierId, page, limit, updatedDataContext);
      console.log(`💾 Data updated in Redis for key: ${carrierId}`);
    }

    let response = finalOutput.response;

    return response;
  }
);