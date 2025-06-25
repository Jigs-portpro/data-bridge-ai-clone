import { ai, genAI } from "@/ai/genkit";
import {
  ChatInterfaceUpdatesOutputSchema,
  ChatInterfaceUpdatesClientInputSchema,
} from "./schemas";
import { resolveAIModel } from "./model-resolver";
import { initializeLookupSystem } from "./lookup-manager";
import {
  processEntityDetection,
  generateEntityFields,
} from "./entity-processor";
import { validateData } from "./data-validator";
import { userIntentDetectionPrompt } from "./user-intent-detection";
import { EntitySchemaLookupIds, EntitySchema } from "@/schema";
import { z } from "zod";
import { getSystemPrompt } from "./prompt";
import { getChunkedDataContext, truncateLookupInfo } from "./utils";

export const chatInterfaceUpdatesFlow = ai.defineFlow(
  {
    name: "chatInterfaceUpdatesFlow",
    inputSchema: ChatInterfaceUpdatesClientInputSchema,
    outputSchema: ChatInterfaceUpdatesOutputSchema,
    streamSchema: z
      .string()
      .describe("The stream of the response from the AI."),
  },
  async (clientInput, { sendChunk }) => {
    const {
      aiProvider,
      aiModelName,
      dataContext,
      userQuery,
      chatHistory: chatHistoryFromClient,
      apiToken,
      enableLookupValidation = true,
      appContextLookupData,
      entityName: entityNameFromClient,
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

    // Parse dataContext
    let parsedDataContext: any;
    try {
      parsedDataContext = JSON.parse(dataContext);
    } catch (error) {
      console.error(`Error during dataContext parsing: ${error}`);
      return {
        isError: true,
        response: "Invalid JSON in dataContext: " + (error as Error).message,
        updatedDataContext: dataContext,
      };
    }

    if (!parsedDataContext.data || !Array.isArray(parsedDataContext.data)) {
      return {
        isError: true,
        response: "Data context is empty or has no valid data.",
        updatedDataContext: dataContext,
      };
    }

    // Get columns from dataContext or data
    const columns =
      parsedDataContext.columns || Object.keys(parsedDataContext.data[0] || {});
    if (!columns.length) {
      return {
        isError: true,
        response: "Data context is empty or has no valid columns.",
        updatedDataContext: dataContext,
      };
    }

    console.log("🤖 Parsed Data Context EntityName: ", entityNameFromClient);

    let entityName = entityNameFromClient;
    let entitySchema;

    if (!entityName) {
      try {
        // Process entity detection and get schema
        const result = await processEntityDetection(
          parsedDataContext,
          columns,
          chatHistory || [],
          modelToUse
        );
        entityName = result.entityName;
        entitySchema = result.entitySchema;
      } catch (error) {
        console.error(`Error during entity detection: ${error}`);
        sendChunk(
          `❌ Error detecting entity. Please check your AI provider configuration and quota.\n`
        );
        return {
          isError: true,
          response: `Error during entity detection.`,
          updatedDataContext: dataContext,
        };
      }
    }

    if (!entitySchema) {
      entitySchema = EntitySchema[entityName as keyof typeof EntitySchema];
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
        return {
          isError: true,
          response: "AI did not return output for user intent detection.",
          updatedDataContext: dataContext,
        };
      }
    } catch (error) {
      console.error(`Error during user intent detection: ${error}`);
      sendChunk(
        `❌ Error detecting user intent. Please check your AI provider configuration and quota.\n`
      );
      return {
        isError: true,
        response: `Intent detection failed: ${error}`,
        updatedDataContext: dataContext,
      };
    }

    console.log(`🤖 User Intent Detected:`, {
      intent: intentOutput.primaryIntent,
      validation: intentOutput.shouldPerformValidation,
      modification: intentOutput.shouldModifyData,
    });

    sendChunk(`🤖 User Intent Detected: ${intentOutput.primaryIntent}\n`);

    const convesationalIntents = [
      "greeting",
      "question",
      "conversation",
      "help",
    ];
    if (convesationalIntents.includes(intentOutput.primaryIntent)) {
      return {
        response: intentOutput.suggestedResponse,
        updatedDataContext: dataContext,
      };
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
      dataContext: JSON.stringify(parsedDataContext),
      userQuery,
      entityFields,
      lookupInfo: truncatedLookupInfo,
      chatHistory: chatHistory,
    };

    const { totalChunks, chunkedData } = await getChunkedDataContext(
      parsedDataContext.data as unknown as Record<string, any>[],
      "gemini-2.5-flash"
    );
    console.log("🤖 Total chunks: ", totalChunks);

    const validationErrors: string[][] = [];
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

      let output = [];
      const hasOneChunk = chunkedData.length === 1;
      let chunkIndex = 0;
      for (const currentChunk of chunkedData) {
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
          output: {
            schema: ChatInterfaceUpdatesOutputSchema,
          },
          messages: messages,
        });

        for await (const chunk of stream) {
          sendChunk(`${chunkMessage}\n${chunk.text}`);
        }

        const result = await response;
        console.log("Response received:");

        const currentOutput = result.output;
        if (!currentOutput) {
          sendChunk(
            `❌ AI did not return an output for chat interface updates for chunk ${chunkIndex} with ${currentChunk.length} records.`
          );
          continue;
        }

        if (currentOutput.updatedDataContext) {
          try {
            currentOutput.updatedDataContext = JSON.parse(
              currentOutput.updatedDataContext
            );
            output.push(currentOutput);
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
            updatedDataContext: parsedDataContext.data,
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
      return {
        isError: true,
        response: `AI prompt execution failed: ${error}`,
        updatedDataContext: dataContext,
      };
    }

    let updatedDataContext = {
      columns: columns,
      data:
        finalOutput.updatedDataContext.length > 0
          ? finalOutput.updatedDataContext
          : parsedDataContext.data || [],
      entityName: entityName,
    };

    let response = finalOutput.response;
    let finalDataContext = JSON.stringify(updatedDataContext);

    return { response, updatedDataContext: finalDataContext };
  }
);
