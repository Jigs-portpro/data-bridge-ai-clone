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
import { EntitySchemaLookupIds } from "@/schema";

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

## INSTRUCTIONS

### 1. UNDERSTAND THE REQUEST
First, determine the user's intent:
-   **Information/Analysis**: User wants to understand or analyze the data
-   **Validation**: User wants to check data quality or compliance
-   **Updates**: User wants to modify, add, or delete data
-   **Cleaning**: User wants to fix data quality issues
-   **Transformation**: User wants to restructure or process the data

### 2. VALIDATION RESPONSE INSTRUCTIONS
When the user asks for validation, you MUST follow these rules exactly:

-   **Rule 1: Only report on INVALID fields.** DO NOT list, mention, or summarize fields that are valid. Your response must only contain information about fields that fail validation.
-   **Rule 2: For each invalid field, provide a detailed explanation.** You MUST state the field name, explain *why* it is invalid, show the problematic value, and provide a clear example of a correct value or a list of valid options from lookup data.
-   **Rule 3: If all fields are valid, you MUST return only a brief confirmation.** Your entire response should be a simple message like "I've validated your data, and everything looks great! All fields meet the required format and lookup constraints."

#### **Example Response for Data with Errors:**
"I've validated your data and found 4 issues. Here are the details:
-   **Email**: The value 'test' is not a valid email format. Please provide a valid email address like 'user@example.com'.
-   **Phone**: The value '12345' is not in the correct format. It should follow the format '(XXX) XXX-XXXX'.
-   **Truck Number**: The value 'T-999' was not found in the list of available trucks. Please select a valid truck from these options: T-101, T-102, T-201.
-   **License Expiration Date**: The date '2023-06-02' is in the wrong format. It should be in the format DD-Mon-YY, e.g., 02-Jun-23."

#### **Example Response for Perfectly Valid Data:**
"I've validated your data, and everything looks great! All fields meet the required format and lookup constraints."

### 3. GENERAL RESPONSE GUIDELINES
-   For **questions and analysis**: Provide clear, accurate answers and insights.
-   For **updates**: Explain what changes will be made before making them.
-   Always be clear, conversational, and helpful.

## OUTPUT REQUIREMENTS
-   **response**: A helpful, user-friendly response that STRICTLY follows the \`VALIDATION RESPONSE INSTRUCTIONS\` if the request is for validation.
-   **updatedDataContext**: The data in valid JSON format, with updates applied if any were made.
-   **CRITICAL**: Do not include any valid data values in your \`response\`. Only show invalid values as part of the correction suggestion.

## CRITICAL RESPONSE RULES
- **NEVER display valid/correct data values in your response text**
- **FOR INVALID DATA ONLY**: Show the problematic field values along with suggested corrections
- **FOR VALIDATION ISSUES**: Display invalid values and provide specific valid alternatives from lookup data
- When data is valid, provide summaries like "your records show good compliance" without showing actual values
- For invalid data, be specific: "Field 'Branch' has value 'XP' but valid options are: New Terminal, Terminal Two, 45"
- Focus on actionable validation results - what's wrong and how to fix it
- Keep responses conversational while protecting valid data from exposure

Remember: 
- Only make changes when explicitly requested or when fixing clear data quality issues. 
- When in doubt, inform rather than modify. 
- Always validate against both schema constraints and lookup data sources when available.
- Your goal is to be helpful, not just technically correct. 
- Make data validation feel like getting help from a knowledgeable friend, not failing a test.
- **Only show data values when they are invalid and need correction - hide valid data values.**`,
});

export const chatInterfaceUpdatesFlow = ai.defineFlow(
  {
    name: "chatInterfaceUpdatesFlow",
    inputSchema: ChatInterfaceUpdatesClientInputSchema,
    outputSchema: ChatInterfaceUpdatesOutputSchema,
  },
  async (clientInput) => {
    const {
      aiProvider,
      aiModelName,
      dataContext,
      userQuery,
      chatHistory,
      apiToken,
      enableLookupValidation = true,
      appContextLookupData,
    } = clientInput;

    // Resolve model
    const modelToUse = resolveAIModel(aiProvider, aiModelName);

    // Parse dataContext
    let parsedDataContext: any;
    try {
      parsedDataContext = JSON.parse(dataContext);
    } catch (error) {
      throw new Error(
        "Invalid JSON in dataContext: " + (error as Error).message
      );
    }

    if (!parsedDataContext.data || !Array.isArray(parsedDataContext.data)) {
      throw new Error("dataContext.data is not a valid array.");
    }

    // Get columns from dataContext or data
    const columns =
      parsedDataContext.columns || Object.keys(parsedDataContext.data[0] || {});
    if (!columns.length) {
      throw new Error("dataContext.data is empty or has no valid columns.");
    }

    // Process entity detection and get schema
    const {
      entityName,
      entitySchema,
      parsedDataContext: updatedParsedDataContext,
    } = await processEntityDetection(
      parsedDataContext,
      columns,
      chatHistory || [],
      modelToUse
    );

    // Detect user intent using AI
    const { output: intentOutput } = await userIntentDetectionPrompt(
      {
        userQuery,
        chatHistory: chatHistory || [],
        hasDataContext: true,
        entityName,
      },
      { model: modelToUse }
    );

    if (!intentOutput) {
      throw new Error("AI did not return output for user intent detection.");
    }

    console.log(`🤖 User Intent Detection:`, {
      intent: intentOutput.primaryIntent,
      validation: intentOutput.shouldPerformValidation,
      modification: intentOutput.shouldModifyData,
      confidence: intentOutput.confidence,
      reasoning: intentOutput.reasoning,
    });

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
      updatedParsedDataContext,
      lookupManager
    );

    // Prepare prompt data
    const promptData = {
      dataContext: JSON.stringify(updatedParsedDataContext),
      userQuery,
      entityFields,
      lookupInfo,
      chatHistory: chatHistory,
    };

    // Execute prompt
    const { output } = await prompt(promptData, { model: modelToUse });
    if (!output) {
      throw new Error(
        "AI did not return an output for chat interface updates."
      );
    }

    // Validate updatedDataContext
    let updatedDataContext;
    try {
      updatedDataContext = JSON.parse(output.updatedDataContext);
    } catch (error) {
      throw new Error(
        "Invalid JSON in updatedDataContext: " + (error as Error).message
      );
    }

    if (!updatedDataContext.data || !Array.isArray(updatedDataContext.data)) {
      throw new Error("updatedDataContext.data is not a valid array.");
    }

    let response = output.response;
    let finalDataContext = JSON.stringify(updatedDataContext);

    // Only perform validation and correction based on AI intent detection
    if (intentOutput.shouldPerformValidation || intentOutput.shouldModifyData) {
      // Validate and correct all field values (this gets raw validation data)
      const { updatedData, validationErrors } = validateData(
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