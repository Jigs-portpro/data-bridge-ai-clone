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
import { userFriendlyResponsePrompt } from "./user-friendly-response";
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
1. **Analyze Data**: Provide insights, statistics, patterns, and summaries
2. **Answer Questions**: Query and explain data relationships, values, and structures  
3. **Validate Data**: Check data against schema constraints and lookup references
4. **Update Data**: Modify, add, or remove data entries following schema rules
5. **Clean Data**: Fix formatting, handle missing values, standardize entries
6. **Transform Data**: Restructure, filter, sort, or aggregate data as requested

## INSTRUCTIONS

### 1. UNDERSTAND THE REQUEST
First, determine the user's intent:
- **Information/Analysis**: User wants to understand or analyze the data
- **Validation**: User wants to check data quality or compliance
- **Updates**: User wants to modify, add, or delete data
- **Cleaning**: User wants to fix data quality issues
- **Transformation**: User wants to restructure or process the data

### 2. PROVIDE CONTEXTUAL RESPONSES
- For **questions**: Analyze the data and provide clear, accurate answers
- For **insights**: Offer relevant patterns, trends, or notable observations
- For **validation**: Use the user-friendly format described above
- For **updates**: Explain what changes will be made before making them

### 3. DATA UPDATE GUIDELINES
When making updates:
- **Validate** all changes against schema constraints AND lookup references
- **Preserve** existing valid data unless explicitly asked to change it
- **Apply defaults** for required fields that are empty or invalid
- **Maintain consistency** across related data points and lookup references
- **Document** all changes made in your response using friendly language

### 4. SCHEMA COMPLIANCE
- Enforce **type constraints** but explain them simply
- Respect **length limits** but mention why they exist
- Follow **pattern requirements** but show examples of correct format
- Handle **required fields** and explain their importance
- Validate **allowed values** and show available options

### 5. LOOKUP VALIDATION
- **Check lookup references**: Ensure values exist in the referenced lookup data sources
- **Handle missing lookups**: If lookup data is not available, note this clearly
- **Suggest valid values**: When validation fails, show all available options
- **Multi-value fields**: For comma-separated values, validate each value individually

### 6. ERROR HANDLING
- If data is malformed, explain what's wrong and how to fix it
- If schema constraints conflict, explain the business rules behind them
- If lookup validation fails, show valid alternatives
- If updates cannot be safely made, explain why and suggest alternatives
- Always maintain the original data structure format

### 7. RESPONSE FORMAT
Structure your response to be:
- **Clear and conversational** - use everyday language
- **Actionable** - provide specific next steps
- **Educational** - help users understand WHY rules exist
- **Transparent** - explain any changes or assumptions made
- **Comprehensive** - address both technical and business aspects

## OUTPUT REQUIREMENTS
- **response**: Provide a helpful, user-friendly response addressing the user's request using the guidelines above
- **updatedDataContext**: Return the data in valid JSON format, with updates applied if any were made

Remember: Your goal is to be helpful, not just technically correct. Make data validation feel like getting help from a knowledgeable friend, not failing a test.`,
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
    const { output: intentOutput } = await userIntentDetectionPrompt({
      userQuery,
      chatHistory: chatHistory || [],
      hasDataContext: true,
      entityName,
    }, { model: modelToUse });

    if (!intentOutput) {
      throw new Error("AI did not return output for user intent detection.");
    }

    console.log(`🤖 User Intent Detection:`, {
      intent: intentOutput.primaryIntent,
      validation: intentOutput.shouldPerformValidation,
      modification: intentOutput.shouldModifyData,
      confidence: intentOutput.confidence,
      reasoning: intentOutput.reasoning
    });

    // Get required lookup IDs from entitySchema
    const requiredLookupIds = EntitySchemaLookupIds[entityName as keyof typeof EntitySchemaLookupIds] || [];

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

      // Generate user-friendly response using AI if there are validation issues
    //   let userFriendlyResponse: string | undefined;
    //   if (validationErrors.length > 0 && intentOutput.primaryIntent === 'validation') {
    //     try {
    //       // Extract validation error details for the AI prompt
    //       const validationErrorDetails = extractValidationErrorDetails(
    //         validationErrors,
    //         updatedParsedDataContext.data,
    //         updatedData
    //       );

    //       // Generate AI-powered user-friendly response
    //       const { output: friendlyOutput } = await userFriendlyResponsePrompt({
    //         validationErrors: validationErrorDetails,
    //         entityName,
    //         totalRecords: updatedData.length,
    //         validRecords: updatedData.length - validationErrorDetails.length,
    //         correctedRecords: validationErrorDetails.length,
    //         availableLookups: lookupManager?.getLookupInfoForAI() || {},
    //       }, { model: modelToUse });

    //       if (friendlyOutput) {
    //         userFriendlyResponse = friendlyOutput.response;
    //         console.log(`🤖 AI-Generated Friendly Response:`, {
    //           totalIssues: friendlyOutput.summary.totalIssues,
    //           successRate: friendlyOutput.summary.successRate,
    //           recommendations: friendlyOutput.recommendations
    //         });
    //       }
    //     } catch (error) {
    //       console.warn('Failed to generate AI-powered user-friendly response:', error);
    //     }
    //   }

    //   // Use AI-generated friendly response or fallback to summary
    //   if (userFriendlyResponse) {
    //     response = userFriendlyResponse;
    //   } else if (validationErrors.length > 0 && intentOutput.shouldPerformValidation) {
    //     response += `\n\nValidation Summary:\n- ${validationErrors.length} validation issue(s) found and corrected\n- Entity: ${entityName}\n- Some values were adjusted to comply with schema constraints`;
    //   }
    } else {
      // For non-validation requests, just ensure entityName is set
      updatedDataContext.entityName = entityName;
      finalDataContext = JSON.stringify(updatedDataContext);
    }

    return { response, updatedDataContext: finalDataContext };
  }
);

/**
 * Extract detailed validation error information for the AI prompt
 */
function extractValidationErrorDetails(
  validationErrors: string[],
  originalData: any[],
  correctedData: any[]
): Array<{
  field: string;
  originalValue: any;
  correctedValue: any;
  errorType: string;
  errorMessage: string;
}> {
  const errorDetails = [];
  
  for (const error of validationErrors) {
    // Parse error format: "Row X, fieldName: errorMessage"
    const match = error.match(/Row (\d+), ([^:]+): (.+)/);
    if (match) {
      const rowIndex = parseInt(match[1]) - 1; // Convert to 0-based index
      const fieldName = match[2].trim();
      const errorMessage = match[3].trim();
      
      // Determine error type based on message content
      let errorType = 'pattern';
      if (errorMessage.includes('required')) errorType = 'required';
      if (errorMessage.includes('lookup') || errorMessage.includes('Lookup')) errorType = 'lookup';
      if (errorMessage.includes('type')) errorType = 'type';
      
      // Get original and corrected values
      const originalValue = originalData[rowIndex]?.[fieldName] || originalData[rowIndex]?.[fieldName + '*'];
      const correctedValue = correctedData[rowIndex]?.[fieldName] || correctedData[rowIndex]?.[fieldName + '*'];
      
      errorDetails.push({
        field: fieldName,
        originalValue,
        correctedValue,
        errorType,
        errorMessage,
      });
    }
  }
  
  return errorDetails;
}
