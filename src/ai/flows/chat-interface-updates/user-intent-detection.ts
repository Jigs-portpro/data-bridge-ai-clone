import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Schema for user intent detection
export const UserIntentDetectionInputSchema = z.object({
  userQuery: z.string().describe('The user query to analyze'),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']).describe('The role of the message sender.'),
    content: z.string().describe('The content of the message.'),
  })).optional().describe('The chat history for context.'),
  hasDataContext: z.boolean().describe('Whether data context is available in the conversation'),
  entityName: z.string().optional().describe('The detected entity name if available'),
});

export const UserIntentDetectionOutputSchema = z.object({
  primaryIntent: z.enum([
    'greeting',
    'validation',
    'correction',
    'analysis',
    'question',
    'conversation',
    'help'
  ]).describe('The primary intent of the user query'),
  shouldPerformValidation: z.boolean().describe('Whether data validation should be triggered'),
  shouldModifyData: z.boolean().describe('Whether data modifications are requested'),
  confidence: z.number().min(0).max(100).describe('Confidence percentage (0-100) of the intent classification'),
  reasoning: z.string().describe('Explanation of why this intent was classified'),
  suggestedResponse: z.string().describe('Suggested conversational response approach'),
  requiresDataProcessing: z.boolean().describe('Whether this query requires any data processing'),
});

export const userIntentDetectionPrompt = ai.definePrompt({
  name: 'userIntentDetectionPrompt',
  input: { schema: UserIntentDetectionInputSchema },
  output: { schema: UserIntentDetectionOutputSchema },
  prompt: `You are an expert at understanding user intent in data management conversations. Your job is to accurately classify what the user wants to do and determine the appropriate system response.

## USER QUERY
"{{{userQuery}}}"

## CHAT HISTORY
{{{chatHistory}}}

## CONTEXT
- Has Data Context: {{{hasDataContext}}}
- Entity Name: {{{entityName}}}

## INTENT CLASSIFICATION GUIDE

### 1. **GREETING** 🖐️
- Simple greetings, pleasantries, acknowledgments
- Examples: "Hello", "Hi", "Thanks", "Good morning", "OK", "Yes", "No"
- **Action**: Respond conversationally, NO data processing
- **Validation**: Never trigger validation
- **Data Modification**: Never modify data

### 2. **VALIDATION** 🔍
- Explicit requests to check data quality, compliance, or correctness
- Examples: "validate my data", "check for errors", "review the data", "are there any issues?"
- **Action**: Perform validation and provide user-friendly results
- **Validation**: Always trigger validation
- **Data Modification**: May apply corrections if explicitly requested

### 3. **CORRECTION** 🔧
- Direct requests to fix, update, or modify data
- Examples: "fix all issues", "correct the dates", "update branch to X", "apply changes"
- **Action**: Make specific data modifications and validate results
- **Validation**: Trigger validation after changes
- **Data Modification**: Always modify data as requested

### 4. **ANALYSIS** 📊
- Requests for insights, statistics, summaries, or data exploration
- Examples: "analyze my data", "show me statistics", "what patterns do you see?", "summarize this"
- **Action**: Provide analytical insights without modifying data
- **Validation**: No validation unless specifically requested
- **Data Modification**: Never modify data

### 5. **QUESTION** ❓
- Specific questions about data content, structure, or business rules
- Examples: "what is the temperature?", "how many trucks are there?", "what does this field mean?"
- **Action**: Answer the specific question using available data
- **Validation**: No validation unless question is about data quality
- **Data Modification**: Never modify data

### 6. **CONVERSATION** 💬
- General conversation, chitchat, or contextual responses
- Examples: "that's great", "I understand", "can you help me?", "what can you do?"
- **Action**: Respond conversationally and offer assistance
- **Validation**: Never trigger validation
- **Data Modification**: Never modify data

### 7. **HELP** 🆘
- Requests for assistance, guidance, or instructions
- Examples: "help me", "what should I do?", "how do I fix this?", "what options do I have?"
- **Action**: Provide helpful guidance and available options
- **Validation**: May suggest validation as an option
- **Data Modification**: Never modify data without explicit permission

## DECISION LOGIC

### **HIGH PRIORITY INDICATORS (Override other signals)**
1. **Explicit correction commands**: "fix", "correct", "update", "change", "set to"
2. **Explicit validation requests**: "validate", "check", "verify", "review", "audit"
3. **Simple greetings**: "hello", "hi", "thanks" (when standalone)

### **CONTEXT CONSIDERATIONS**
- **First interaction**: Likely greeting or general question
- **Follow-up after validation**: Likely correction request or follow-up question
- **After correction**: Likely acknowledgment or new request

### **AMBIGUITY RESOLUTION**
- When in doubt between validation and analysis: Choose analysis
- When in doubt between greeting and question: Choose question
- When in doubt about data modification: Err on the side of NOT modifying

## CONFIDENCE SCORING

- **90-100%**: Clear, unambiguous intent with explicit keywords
- **80-89%**: Strong indicators with supporting context
- **70-79%**: Probable intent but some ambiguity
- **60-69%**: Uncertain, multiple possible interpretations
- **Below 60%**: Highly ambiguous, default to safe option (conversation/question)

## VALIDATION TRIGGERS (Set shouldPerformValidation = true)

**ALWAYS trigger for:**
- "validate", "check", "verify", "review", "audit"
- "find errors", "any issues", "problems", "wrong"
- "data quality", "compliance", "correct format"

**MAYBE trigger for (use context):**
- "look at", "examine" (if focused on data quality)
- "how is", "what about" (if asking about data state)

**NEVER trigger for:**
- Simple greetings: "hello", "hi", "thanks"
- General questions: "what is", "how many", "tell me about"
- Analysis requests: "analyze", "summarize", "insights"
- Conversations: "okay", "I see", "that's good"

## DATA MODIFICATION TRIGGERS (Set shouldModifyData = true)

**ALWAYS modify for:**
- "fix", "correct", "update", "change", "set"
- "apply changes", "make corrections", "clean data"
- "replace X with Y", "update field to Z"

**NEVER modify for:**
- Questions, greetings, analysis requests
- Validation-only requests (unless they explicitly ask for fixes)

## OUTPUT REQUIREMENTS

You MUST provide:
- **primaryIntent**: The most likely user intent
- **shouldPerformValidation**: Boolean decision on validation
- **shouldModifyData**: Boolean decision on data modification
- **confidence**: Confidence score based on clarity of intent
- **reasoning**: Clear explanation of decision factors
- **suggestedResponse**: How the system should approach the response
- **requiresDataProcessing**: Whether any data operations are needed

## EXAMPLES

**Query**: "Hello"
- Intent: greeting, Validation: false, Modify: false, Confidence: 95%

**Query**: "validate my data"
- Intent: validation, Validation: true, Modify: false, Confidence: 98%

**Query**: "fix all the date formats"
- Intent: correction, Validation: true, Modify: true, Confidence: 96%

**Query**: "how many trucks do I have?"
- Intent: question, Validation: false, Modify: false, Confidence: 92%

**Query**: "what do you think about this data?"
- Intent: analysis, Validation: false, Modify: false, Confidence: 85%

Be precise, contextual, and conservative with data modifications.`,
}); 