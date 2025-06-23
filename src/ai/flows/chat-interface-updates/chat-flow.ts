import { ai } from "@/ai/genkit";
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

function truncateLookupInfo(lookupInfo: string): string {
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
        response: "dataContext.data is not a valid array.",
        updatedDataContext: dataContext,
      };
    }

    // Get columns from dataContext or data
    const columns =
      parsedDataContext.columns || Object.keys(parsedDataContext.data[0] || {});
    if (!columns.length) {
      return {
        isError: true,
        response: "dataContext.data is empty or has no valid columns.",
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

    if (intentOutput.primaryIntent === "greeting") {
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

    sendChunk("🧠 Running AI data processing...\n");
    // Execute prompt
    let output, data, responseText;
    try {
      const messages = (chatHistory || []).map((m) => {
        // @ts-ignore - TODO: fix this
        const role = m.role == "assistant" ? "model" : m.role;
        return {
          role,
          content: [{ text: m.content }],
        };
      });

      const systemPrompt = getSystemPrompt(
        promptData.dataContext,
        promptData.entityFields,
        promptData.lookupInfo || ""
      );

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
        sendChunk(chunk.text);
      }

      const result = await response;
      console.log("Response received:");
      output = result.output;
      data = result.data;
      responseText = result.text;
      if (!output) {
        throw new Error(
          "AI did not return an output for chat interface updates."
        );
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

    // Validate updatedDataContext
    let updatedDataContext;
    try {
      updatedDataContext = JSON.parse(output.updatedDataContext);
    } catch (error) {
      console.error(`Error during updatedDataContext parsing: ${error}`);
      return {
        isError: true,
        response: "Invalid JSON in updatedDataContext.",
        updatedDataContext: dataContext,
      };
    }

    if (!updatedDataContext.data || !Array.isArray(updatedDataContext.data)) {
      return {
        isError: true,
        response: "Invalid data in updatedDataContext.",
        updatedDataContext: dataContext,
      };
    }

    let response = output.response;
    let finalDataContext = JSON.stringify(updatedDataContext);

    // Only perform validation and correction based on AI intent detection
    if (intentOutput.shouldPerformValidation || intentOutput.shouldModifyData) {
      if (intentOutput.shouldPerformValidation) {
        sendChunk("Validating data...\n");
      }

      if (intentOutput.shouldModifyData) {
        sendChunk("Correcting data...\n");
      }

      // Validate and correct all field values (this gets raw validation data)
      const { updatedData } = validateData(
        updatedDataContext.data,
        entitySchema,
        lookupManager
      );

      // Update the dataContext with validated data
      updatedDataContext.data = updatedData;
      updatedDataContext.entityName = entityName;
      finalDataContext = JSON.stringify(updatedDataContext);
    } else {
      // For non-validation requests, just ensure entityName is set
      updatedDataContext.entityName = entityName;
      finalDataContext = JSON.stringify(updatedDataContext);
    }

    return { response, updatedDataContext: finalDataContext };
  }
);
