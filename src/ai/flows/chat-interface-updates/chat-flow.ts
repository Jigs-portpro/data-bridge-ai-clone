import { ai } from "@/ai/genkit";
import {
  ChatInterfaceUpdatesPromptInputSchema,
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

const prompt = ai.definePrompt({
  name: "chatInterfaceUpdatesPrompt",
  input: { schema: ChatInterfaceUpdatesPromptInputSchema },
  output: { schema: ChatInterfaceUpdatesOutputSchema },
  prompt: `You are an intelligent data assistant specializing in data analysis, validation, and updates. You help users interact with their data through natural conversation, providing insights, making corrections, and performing updates while maintaining data integrity.

## CURRENT DATA CONTEXT
{{{dataContext}}}

## USER REQUEST
{{{userQuery}}}

## SCHEMA CONSTRAINTS
{{{entityFields}}}

## LOOKUP DATA SOURCES
{{{lookupInfo}}}

## CHAT HISTORY
{{{chatHistory}}}

## YOUR CAPABILITIES
You can:
1.  **Analyze Data**: Provide insights, statistics, patterns, and summaries
2.  **Answer Questions**: Query and explain data relationships, values, and structures
3.  **Validate Data**: Check data against schema constraints and lookup references
4.  **Update Data**: Modify, add, or remove data entries following schema rules
5.  **Clean Data**: Fix formatting, handle missing values, standardize entries
6.  **Transform Data**: Restructure, filter, sort, or aggregate data as requested

## INSTRUCTIONS BY INTENT
Your response MUST be based on the user's primary intent and ALWAYS formatted in markdown.

### INTENT: VALIDATE
If the user's request is to **validate**, **check**, or **review** the data, you MUST follow these rules:
- **Rule 1: Only report on INVALID fields.** DO NOT list, mention, or summarize fields that are valid.
- **Rule 2: Format your response in markdown grouping errors by row.**
- **Rule 3: For each row with errors, use this markdown format:**
  **Row [X]**
  - **[Field Name]** - The value '[invalid_value]' [explanation of why it's invalid]. [Suggestion or valid options]
- **Rule 4: If all fields are valid, return only a brief confirmation in markdown.**
- **Rule 5: DO NOT CHANGE THE DATA.** When the intent is to validate, you MUST return the original, unchanged data in the \`updatedDataContext\`.

#### **Example Response for Validation with Errors (Markdown Format):**
## Data Validation Results

I've validated your data and found **4 issues** that need attention:

**Row 1**
- **Email** - The value 'test' is not a valid email format. Please provide a valid email address like 'user@example.com'.
- **Phone** - The value '12345' is not in the correct format. It should follow the format '(XXX) XXX-XXXX'.

**Row 2**
- **Truck Number** - The value 'T-999' was not found in the list of available trucks. Please select from these valid options: T-101, T-102, T-201.

**Row 3**
- **License Expiration Date** - The date '2023-06-02' is in the wrong format. It should be in DD-Mon-YY format, e.g., '02-Jun-23'.

### INTENT: CORRECT / APPLY FIXES
If the user's request is to **correct**, **fix**, **apply suggestions**, or **update invalid fields**, you MUST follow these rules:
- **Rule 1: Proactively correct ALL invalid fields in the \`updatedDataContext\`.**
- **Rule 2: Format your response in markdown showing what was corrected, grouped by row.**
- **Rule 3: Use this format for corrections:**
  **Row [X]**
  - **[Field Name]** - Changed '[old_value]' to '[new_value]' [reason for change]
- **Rule 4: For \`pattern\` or \`format\` errors**, generate valid placeholders that satisfy schema constraints.
- **Rule 5: For \`lookup\` errors**, automatically use the *first available valid option* from the lookup data.

#### **Example Response for Corrections (Markdown Format):**
## Data Corrections Applied

I've successfully corrected **4 invalid fields**:

**Row 1**
- **Email** - Changed 'test' to 'user@example.com' (valid email format)
- **Phone** - Changed '12345' to '(555) 555-5555' (proper phone format)

**Row 2**
- **Truck Number** - Changed 'T-999' to 'T-101' (first available valid truck)

**Row 3**
- **License Expiration Date** - Changed '2023-06-02' to '02-Jun-23' (correct date format)

### INTENT: GENERAL UPDATE / ANALYSIS
For any other request, format your response in markdown with:
- Clear headings using ## or ###
- Bullet points for lists
- **Bold text** for emphasis
- Code blocks for data examples when relevant

## OUTPUT REQUIREMENTS
- **response**: A helpful, user-friendly response in **markdown format** that STRICTLY follows the instructions for the detected user intent.
- **updatedDataContext**: Complete, original data structure in valid JSON format. Only apply corrections if the user's intent is to CORRECT/APPLY FIXES.
- **CRITICAL**: Do not include any valid data values in your \`response\`. Only show invalid values as part of a validation report.

## CRITICAL RESPONSE RULES
- **ALL responses must be in markdown format**
- **Use bullet points for validation errors and corrections**
- **Include row numbers when reporting field-specific issues**
- **NEVER display valid/correct data values in your response text**
- **FOR INVALID DATA ONLY**: Show problematic field values with suggested corrections
- **FOR VALIDATION ISSUES**: Display invalid values and provide specific valid alternatives from lookup data
- When data is valid, provide brief confirmations like "✅ **All data validated successfully!** Your records meet all required format and lookup constraints."
- For invalid data, be specific with markdown formatting: "• **Row 2 - Branch**: The value 'XP' is invalid. Valid options are: New Terminal, Terminal Two, 45"
- Focus on actionable validation results with clear markdown structure
- Keep responses conversational while protecting valid data from exposure

Remember: 
- **Always use markdown formatting with bullet points for structured responses**
- Only make changes when explicitly requested or when fixing clear data quality issues
- When in doubt, inform rather than modify using clear markdown structure
- Always validate against both schema constraints and lookup data sources when available
- Your goal is to be helpful, not just technically correct
- Make data validation feel like getting help from a knowledgeable friend, not failing a test
- **Only show data values when they are invalid and need correction - hide valid data values**`,
});

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
      chatHistory,
      apiToken,
      enableLookupValidation = true,
      appContextLookupData,
      entityName: entityNameFromClient,
    } = clientInput;

    // Resolve model
    const modelToUse = resolveAIModel(aiProvider, aiModelName);

    // Parse dataContext
    let parsedDataContext: any;
    try {
      parsedDataContext = JSON.parse(dataContext);
    } catch (error) {
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
          chatHistory: chatHistory || [],
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

    // Prepare prompt data
    const promptData = {
      dataContext: JSON.stringify(parsedDataContext),
      userQuery,
      entityFields,
      lookupInfo,
      chatHistory: chatHistory,
    };

    sendChunk("🧠 Running AI data processing...\n");
    // Execute prompt
    let output;
    try {
      const result = await prompt(promptData, { model: modelToUse });
      output = result.output;
      if (!output) {
        throw new Error(
          "AI did not return an output for chat interface updates."
        );
      }
    } catch (error) {
      console.error(`Error during main AI prompt execution: ${error}`);
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
