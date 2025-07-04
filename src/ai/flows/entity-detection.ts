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
  coverageStats: z.object({
    totalDataColumns: z.number().describe('Total number of columns in the data'),
    matchedColumns: z.number().describe('Number of data columns that match entity fields'),
    coveragePercentage: z.number().describe('Percentage of data columns covered by the entity'),
    unmatchedColumns: z.array(z.string()).describe('List of data columns not found in the entity schema')
  }).describe('Detailed coverage statistics for the match')
});

export const entityDetectionPrompt = ai.definePrompt({
  name: 'entityDetectionPrompt',
  input: { schema: EntityDetectionInputSchema },
  output: { schema: EntityDetectionOutputSchema },
  prompt: `You are an expert at analyzing data structures and matching them to appropriate entity schemas.

## CRITICAL CLASSIFICATION RULES
Your **HIGHEST PRIORITY** is to follow these rules to differentiate between Tariff and Charge Profile entities. These rules override ALL other matching criteria like field coverage or semantic similarity. You MUST follow this logic exactly.

**Step 1: Identify Entity TYPE (Tariff vs. Charge Profile)**
- First, check if the data columns include **"Tariff Name"**.
- **IF "Tariff Name" IS PRESENT**: The entity is a **Tariff**. Proceed to Step 2.
- **IF "Tariff Name" IS ABSENT**: The entity is a **Charge Profile**. Proceed to Step 3.

**Step 2: Classify the TARIFF Entity**
- You have determined it is a Tariff. Now, check for the specific sub-type in this order:
    - **A) Does it also contain "Driver Group"?**
        - If YES, the entity is **100% Driver Tariff**. STOP HERE.
    - **B) Does it also contain "Carrier Pay Group"?**
        - If YES, the entity is **100% Carrier Tariff**. STOP HERE.
    - **C) If neither of the above, does it contain "Charge Profile Name"?**
        - If YES, the entity is **100% Load Tariff**. STOP HERE.

**Step 3: Classify the CHARGE PROFILE Entity**
- You have determined it is a Charge Profile. Now, check for the specific sub-type in this order:
    - **A) Does it contain "Driver Group"?**
        - If YES, the entity is **100% Driver Charge Profile**. STOP HERE.
    - **B) Does it contain "Carrier Pay Group"?**
        - If YES, the entity is **100% Carrier Charge Profile**. STOP HERE.
    - **C) If neither of the above, does it contain "Charge Profile Name"?**
        - If YES, the entity is **100% Charge Profile**. STOP HERE.

**RULE SUMMARY (FOR VERIFICATION):**
- **Driver Tariff**: MUST contain "Tariff Name" + "Driver Group".
- **Carrier Tariff**: MUST contain "Tariff Name" + "Carrier Pay Group".
- **Load Tariff**: MUST contain "Tariff Name" + "Charge Profile Name" (and NOT Driver/Carrier groups).
- **Driver Charge Profile**: MUST contain "Driver Group" (and NOT "Tariff Name").
- **Carrier Charge Profile**: MUST contain "Carrier Pay Group" (and NOT "Tariff Name").
- **Charge Profile**: MUST contain "Charge Profile Name" (and NOT "Tariff Name" or Driver/Carrier groups).

After applying these rules and identifying the entity, you can then proceed with the rest of the analysis (coverage stats, etc.). But the entity name itself MUST be decided by the rules above.

## DATA COLUMNS
The data contains these columns:
{{{dataColumns}}}

## AVAILABLE ENTITY SCHEMAS
{{{availableEntities}}}

## CHAT HISTORY
{{{chatHistory}}}

## TASK
Find the entity schema that can handle the MAXIMUM NUMBER of data columns. An ideal entity should cover at least 80% of the provided data columns.

## SCORING CRITERIA (In Order of Priority)

### 1. **FIELD COVERAGE (Most Important - 60% of score)**
- Count exact matches between data columns and entity fields
- Count approximate matches (e.g., "Profile Name" → "profileName", "name")
- Calculate coverage percentage: (matched_columns / total_data_columns) * 100
- **PENALTY**: Entities covering <70% of data columns should receive low confidence scores
- **BONUS**: Entities covering >90% of data columns should receive high confidence scores

### 2. **REQUIRED FIELD COVERAGE (25% of score)**
- Ensure all required/critical fields (marked with *) are present in the entity
- Check that essential business fields are not missing

### 3. **SEMANTIC ALIGNMENT (10% of score)**
- Does the entity purpose match the data context?
- Are field types and constraints appropriate?

### 4. **FIELD TYPE COMPATIBILITY (5% of score)**
- Do the field types (string, number, date) align correctly?

## DETAILED ANALYSIS PROCESS

For each entity schema:
1. **Count exact field matches** (case-sensitive)
2. **Count approximate matches** (camelCase, snake_case, spaces, etc.)
3. **Calculate coverage percentage** = (total_matches / total_data_columns) * 100
4. **Identify unmatched columns** - which data columns have no corresponding entity field
5. **Check required field presence** - are critical fields covered?

## CONFIDENCE SCORING GUIDELINES

- **90-100%**: Coverage ≥90% AND all required fields present
- **80-89%**: Coverage 80-89% AND most required fields present
- **70-79%**: Coverage 70-79% BUT some important fields missing
- **50-69%**: Coverage 50-69% - partial match, significant gaps
- **Below 50%**: Coverage <50% - poor match, too many missing fields

## MATCHING RULES

Consider these as field matches:
- Exact: "customerName" = "customerName"
- Case variants: "Customer_Name" = "customerName" = "customer_name"
- Space variants: "Customer Name" = "customerName"
- Common abbreviations: "addr" = "address", "qty" = "quantity"
- Semantic equivalents: "email" = "emailAddress", "phone" = "phoneNumber"

## OUTPUT REQUIREMENTS

You MUST provide:
- **detectedEntity**: Best matching entity name
- **confidence**: Score based on coverage percentage and field alignment
- **reasoning**: Detailed explanation including coverage analysis
- **coverageStats**: Exact statistics about field matching

## STRICT REQUIREMENTS

1. **NEVER** select an entity with <50% field coverage unless no other option exists
2. **ALWAYS** prefer entities with higher field coverage over semantic similarity
3. **EXPLICITLY** list which data columns cannot be handled by the selected entity
4. **CALCULATE** and report exact coverage percentages
5. **PRIORITIZE** entities that can handle the most data columns

If no entity covers >70% of fields, recommend the best available option but set confidence <60% and explain the limitations.`,
}); 