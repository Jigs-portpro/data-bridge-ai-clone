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
  detectedEntity: z.string().describe('The name of the best matching entity schema'),
  confidence: z.number().min(0).max(100).describe('Confidence percentage (0-100) of the match'),
  reasoning: z.string().describe('Explanation of why this entity was chosen'),
});

export const entityDetectionPrompt = ai.definePrompt({
  name: 'entityDetectionPrompt',
  input: { schema: EntityDetectionInputSchema },
  output: { schema: EntityDetectionOutputSchema },
  prompt: `You are an expert at analyzing data structures and matching them to appropriate entity schemas.

## DATA COLUMNS
The data contains these columns:
{{{dataColumns}}}

## AVAILABLE ENTITY SCHEMAS
{{{availableEntities}}}

## CHAT HISTORY
{{{chatHistory}}}

## TASK
Analyze the data columns and determine which entity schema is the best match based on:

1. **Field Name Matching**: How many data columns have corresponding fields in the entity schema
2. **Required Field Coverage**: Whether critical/required fields are present
3. **Semantic Meaning**: The logical purpose and context of the data (e.g., customer data, user profiles, orders, etc.)
4. **Field Types and Constraints**: Whether the data structure aligns with the schema's field definitions

## INSTRUCTIONS
- Compare each data column against all available entity schemas
- Consider field name variations (e.g., "Profile Name" might match "name" or "profileName")
- Pay special attention to required fields (marked with * in data columns)
- Consider the overall business context and data purpose
- Provide a confidence score (0-100) based on how well the data matches
- If no schema is a particularly good match, choose the closest one but indicate lower confidence

## OUTPUT REQUIREMENTS
- **detectedEntity**: The name of the best matching entity schema
- **confidence**: A percentage indicating how confident you are in this match (0-100)
- **reasoning**: Clear explanation of your decision including key matching fields and why this entity makes sense`,
}); 