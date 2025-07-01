import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Schema for entity detection
export const EntityDetectionInputSchema = z.object({
  dataColumns: z.array(z.string()).describe('Array of column names from the data context'),
  availableEntities: z.string().describe('JSON string of available entity schemas with their field definitions'),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']).describe('The role of the message sender.'),
    content: z.string().describe('The content of the message.'),
  })).optional().describe('The chat history for context.'),
});

export const EntityDetectionOutputSchema = z.object({
  analysis: z.object({
    reasoning: z.string().describe("A step-by-step explanation of your decision-making process, referencing specific columns and coverage statistics."),
    distinguishing_features: z.string().describe("A summary of the key columns that differentiate the chosen schema from the next best alternative."),
    confidence_score: z.number().min(0).max(1).describe("A numerical score from 0.0 to 1.0 representing your confidence in the match."),
    coverageStats: z.object({
        totalDataColumns: z.number().describe('Total number of columns in the data'),
        matchedColumns: z.number().describe('Number of data columns that match entity fields'),
        coveragePercentage: z.number().describe('Percentage of data columns covered by the entity (0-100)'),
        unmatchedColumns: z.array(z.string()).describe('List of data columns not found in the entity schema')
      }).describe('Detailed coverage statistics for the match')
  }),
  match: z.object({
    entity_name: z.string().describe("The name of the best-matching entity schema."),
    is_match_certain: z.boolean().describe("A boolean value, true if confidence is > 0.9, false otherwise."),
  }),
});

export const entityDetectionPrompt = ai.definePrompt({
  name: 'entityDetectionPrompt',
  input: { schema: EntityDetectionInputSchema },
  output: { schema: EntityDetectionOutputSchema },
  prompt: `You are a meticulous and analytical schema matching expert. Your task is to analyze a list of input columns from a data file and determine which of the provided entity schemas is the most likely match, with a focus on MAXIMUM FIELD COVERAGE and accurate differentiation between similar schemas.

You MUST respond in a valid JSON format that adheres to the following schema. Do NOT include any text or explanations outside of the JSON object.

## Output Schema
\`\`\`json
{
  "analysis": {
    "reasoning": "A step-by-step explanation of your decision-making process, referencing specific columns and coverage statistics.",
    "distinguishing_features": "A summary of the key columns that differentiate the chosen schema from the next best alternative.",
    "confidence_score": "A numerical score from 0.0 to 1.0 representing your confidence in the match.",
    "coverageStats": {
      "totalDataColumns": "Total number of columns in the data",
      "matchedColumns": "Number of data columns that match entity fields",
      "coveragePercentage": "Percentage of data columns covered by the entity (0-100)",
      "unmatchedColumns": "List of data columns not found in the entity schema"
    }
  },
  "match": {
    "entity_name": "The name of the best-matching entity schema.",
    "is_match_certain": "A boolean value, true if confidence is > 0.9, false otherwise."
  }
}
\`\`\`

## Input Data

### DATA COLUMNS
The data contains these columns:
{{{dataColumns}}}

### AVAILABLE ENTITY SCHEMAS
{{{availableEntities}}}

### CHAT HISTORY (for context)
{{{chatHistory}}}

## TASK
Find the entity schema that can handle the MAXIMUM NUMBER of data columns. An ideal entity should cover at least 80% of the provided data columns.

## SCORING CRITERIA (In Order of Priority)

1. **FIELD COVERAGE (Most Important - 60% of score)**
   - Count exact and approximate matches between data columns and entity fields.
   - Calculate coverage percentage: (matched_columns / total_data_columns) * 100.
   - **PENALTY**: Entities covering <70% of data columns should receive low confidence scores.
   - **BONUS**: Entities covering >90% of data columns should receive high confidence scores.

2. **REQUIRED FIELD COVERAGE (25% of score)**
   - Ensure all required/critical fields (marked with *) are present in the entity.
   - Check that essential business fields are not missing.

3. **SEMANTIC ALIGNMENT (10% of score)**
   - Does the entity purpose match the data context?
   - Are field types and constraints appropriate?

4. **FIELD TYPE COMPATIBILITY (5% of score)**
   - Do the field types (string, number, date) align correctly?

## DETAILED ANALYSIS PROCESS

For each entity schema:
1. Count exact field matches (case-sensitive)
2. Count approximate matches (camelCase, snake_case, spaces, etc.)
3. Calculate coverage percentage = (total_matches / total_data_columns) * 100
4. Identify unmatched columns - which data columns have no corresponding entity field
5. Check required field presence - are critical fields covered?
6. Synthesize a confidence_score (0.0-1.0) based on the scoring criteria.

## OUTPUT REQUIREMENTS

You MUST provide all fields specified in the Output Schema.
- **reasoning**: Detailed explanation including coverage analysis.
- **distinguishing_features**: Crucial for tie-breaking. Explicitly state the columns that make the chosen entity a better fit than the next best option.
- **confidence_score**: Your calculated confidence from 0.0 to 1.0.
- **coverageStats**: Exact statistics about field matching.
- **entity_name**: The single best matching entity name.
- **is_match_certain**: Set to true if confidence_score > 0.9.

## STRICT REQUIREMENTS

1. **NEVER** select an entity with <50% field coverage unless no other option exists.
2. **ALWAYS** prefer entities with higher field coverage over semantic similarity.
3. **EXPLICITLY** list which data columns cannot be handled by the selected entity in \`unmatchedColumns\`.
4. **CALCULATE** and report exact coverage percentages.
5. **PRIORITIZE** entities that can handle the most data columns.

If no entity covers >70% of fields, recommend the best available option but set \`confidence_score\` < 0.6 and explain the limitations in the \`reasoning\`.

## SPECIAL INSTRUCTIONS FOR AMBIGUOUS ENTITIES

Pay very close attention to these rules for disambiguation. They are critical for accuracy.

- **Load Tariff vs. Driver Tariff**: The ONLY difference is the presence of "Driver Group". If "Driver Group" exists, it MUST be "Driver Tariff".
- **Charge Profile vs. Driver Charge Profile**: The key difference is "Driver Group" or leg fields ("From Legs", "To Legs"). If these are present, it is "Driver Charge Profile".
- **Tariffs vs. Charge Profiles**: The clearest signal is "Tariff Name". If it exists, it MUST be a tariff entity. If not, it's likely a charge profile.
- **Plural vs. Singular (e.g., Truck vs. Trucks)**: These are context-dependent, but the plural version (e.g., \`Trucks\`) often has more fields related to fleet management.
- **Users vs. Drivers**: A "Drivers" entity will have a "License Number", while a "Users" entity will have "System Roles". These are the strongest differentiators.

When in doubt, prefer the entity that has a more specific and unique field match over general coverage. Your \`distinguishing_features\` field should reflect this logic.`,
}); 