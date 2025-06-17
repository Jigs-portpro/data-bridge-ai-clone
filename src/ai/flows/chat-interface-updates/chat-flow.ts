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
import { validateAndCorrectData } from "./data-validator";

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
- For **validation**: Report compliance status and highlight any issues including lookup validation
- For **updates**: Explain what changes will be made before making them

### 3. DATA UPDATE GUIDELINES
When making updates:
- **Validate** all changes against schema constraints AND lookup references
- **Preserve** existing valid data unless explicitly asked to change it
- **Apply defaults** for required fields that are empty or invalid
- **Maintain consistency** across related data points and lookup references
- **Document** all changes made in your response

### 4. SCHEMA COMPLIANCE
- Enforce **type constraints** (string, number, date, etc.)
- Respect **length limits** (min/max character limits)
- Follow **pattern requirements** (regex patterns, formats)
- Handle **required fields** (provide appropriate defaults)
- Validate **allowed values** (enums, restricted lists)

### 5. LOOKUP VALIDATION
- **Check lookup references**: Ensure values exist in the referenced lookup data sources
- **Handle missing lookups**: If lookup data is not available, note this in your response
- **Suggest valid values**: When validation fails, suggest valid options from the lookup data
- **Multi-value fields**: For comma-separated values, validate each value individually

### 6. ERROR HANDLING
- If data is malformed, attempt to fix it intelligently
- If schema constraints conflict, prioritize data integrity
- If lookup validation fails, suggest corrections using available lookup data
- If updates cannot be safely made, explain why and suggest alternatives
- Always maintain the original data structure format

### 7. RESPONSE FORMAT
Structure your response to be:
- **Clear and conversational** - explain what you found or did
- **Actionable** - provide specific next steps if relevant  
- **Educational** - help users understand their data better
- **Transparent** - explain any changes or assumptions made
- **Comprehensive** - include both schema and lookup validation results

## OUTPUT REQUIREMENTS
- **response**: Provide a helpful, conversational response addressing the user's request
- **updatedDataContext**: Return the data in valid JSON format, with updates applied if any were made

Remember: Only make changes when explicitly requested or when fixing clear data quality issues. When in doubt, inform rather than modify. Always validate against both schema constraints and lookup data sources when available.`,
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

    // Initialize lookup system
    const { lookupManager, lookupInfo } = await initializeLookupSystem(
      enableLookupValidation,
      apiToken,
      appContextLookupData
    );

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

    // Validate and correct all field values
    const { updatedData, validationErrors } = validateAndCorrectData(
      updatedDataContext.data,
      entitySchema,
      lookupManager
    );

    // Update the dataContext with validated data
    updatedDataContext.data = updatedData;
    updatedDataContext.entityName = entityName;
    const finalDataContext = JSON.stringify(updatedDataContext);

    // Update response if fallbacks were applied
    let response = output.response;
    if (validationErrors.length > 0) {
      response += `\n\nValidation Summary:\n- ${validationErrors.length} validation issue(s) found and corrected\n- Entity: ${entityName}\n- Some values were adjusted to comply with schema constraints`;
    }

    return { response, updatedDataContext: finalDataContext };
  }
);
