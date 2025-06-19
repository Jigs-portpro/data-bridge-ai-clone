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

## INSTRUCTIONS BY INTENT
Your response MUST be based on the user's primary intent.

### INTENT: VALIDATE
If the user's request is to **validate**, **check**, or **review** the data, you MUST follow these rules:
- **Rule 1: Only report on INVALID fields.** DO NOT list, mention, or summarize fields that are valid.
- **Rule 2: For each invalid field, provide a detailed explanation.** You MUST state the field name, explain *why* it is invalid, show the problematic value, and provide a clear example of a correct value or a list of valid options from lookup data.
- **Rule 3: If all fields are valid, return only a brief confirmation.** Your entire response should be a simple message like "I've validated your data, and everything looks great! All fields meet the required format and lookup constraints."
- **Rule 4: DO NOT CHANGE THE DATA.** When the intent is to validate, you MUST return the original, unchanged data in the \`updatedDataContext\`.

#### **Example Response for Validation with Errors:**
"I've validated your data and found 4 issues. Here are the details:
- **Email**: The value 'test' is not a valid email format. Please provide a valid email address like 'user@example.com'.
- **Phone**: The value '12345' is not in the correct format. It should follow the format '(XXX) XXX-XXXX'.
- **Truck Number**: The value 'T-999' was not found in the list of available trucks. Please select a valid truck from these options: T-101, T-102, T-201.
- **License Expiration Date**: The date '2023-06-02' is in the wrong format. It should be in the format DD-Mon-YY, e.g., 02-Jun-23."

### INTENT: CORRECT / APPLY FIXES
If the user's request is to **correct**, **fix**, **apply suggestions**, or **update invalid fields**, you MUST follow these rules:
- **Rule 1: Proactively correct ALL invalid fields in the \`updatedDataContext\`.** You MUST NOT ask for permission to fix each field. You must do it automatically.
- **Rule 2: For \`pattern\` or \`format\` errors**, generate a valid placeholder that satisfies the schema constraints (e.g., generate 'StrongP@ss1' for a password or '(555) 555-5555' for a phone number).
- **Rule 3: For \`lookup\` errors**, automatically use the *first available valid option* from the lookup data.
- **Rule 4: Your response text must be a simple confirmation.** After making the changes, confirm what you did.

#### **Example Response for a Correction Request:**
"I have corrected the 4 invalid fields as requested. The Email, Phone, Truck Number, and License Expiration Date fields have been updated with valid data."

### INTENT: GENERAL UPDATE / ANALYSIS
For any other request (e.g., "change the city to 'New York'", "summarize the data", "how many are overweight?"), follow these general guidelines:
- Be clear, conversational, and helpful.
- For updates, explain what changes will be made before making them.
- For questions and analysis, provide clear, accurate answers and insights.

## OUTPUT REQUIREMENTS
-   **response**: A helpful, user-friendly response that STRICTLY follows the instructions for the detected user intent.
-   **updatedDataContext**: You MUST return the complete, original data structure in valid JSON format. **You should only apply corrections to this data if the user's intent is to CORRECT/APPLY FIXES.** If the intent is VALIDATE, return the original, unchanged data. **DO NOT remove any columns or rows.**
-   **CRITICAL**: Do not include any valid data values in your \`response\`. Only show invalid values as part of a validation report.

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
