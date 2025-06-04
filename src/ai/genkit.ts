
import { genkit, type GenkitPlugin } from 'genkit';
import { config } from 'dotenv';

config(); // Ensure .env variables are loaded

const plugins: GenkitPlugin[] = [];

// Attempt to load Google AI plugin if GOOGLEAI_API_KEY is set
const googleAIKey = process.env.GOOGLEAI_API_KEY;
if (googleAIKey) {
  console.log("GOOGLEAI_API_KEY found in environment. Attempting to load Google AI plugin...");
  try {
    const { googleAI } = await import('@genkit-ai/googleai');
    plugins.push(googleAI());
    console.log("Google AI plugin loaded successfully (using GOOGLEAI_API_KEY).");
  } catch (e) {
    console.warn("Failed to import or initialize Google AI plugin. GOOGLEAI_API_KEY was found, but the plugin couldn't load. Error:", e);
  }
} else {
  console.log("GOOGLEAI_API_KEY not set or not found in environment. Google AI plugin will not be loaded.");
}

// Attempt to load OpenAI plugin if OPENAI_API_KEY is set
const openAIKey = process.env.OPENAI_API_KEY;
if (openAIKey) {
  console.log("OPENAI_API_KEY found in environment. Attempting to load OpenAI plugin (genkitx-openai)...");
  try {
    const { openAI } = await import('genkitx-openai'); 
    plugins.push(openAI({apiKey: openAIKey})); // Pass API key explicitly
    console.log("OpenAI plugin (genkitx-openai) loaded successfully.");
  } catch (e) {
    console.warn("Failed to import or initialize OpenAI plugin (genkitx-openai). OPENAI_API_KEY was found, but the plugin couldn't load. Error:", e);
  }
} else {
  console.log("OPENAI_API_KEY not set or not found in environment. OpenAI plugin (genkitx-openai) will not be loaded.");
}

// Attempt to load Anthropic plugin if ANTHROPIC_API_KEY is set
const anthropicKey = process.env.ANTHROPIC_API_KEY;
if (anthropicKey) {
  console.log("ANTHROPIC_API_KEY found in environment. Attempting to load Anthropic plugin (genkitx-anthropic)...");
  try {
    const { anthropic } = await import('genkitx-anthropic');
    plugins.push(anthropic({apiKey: anthropicKey})); // Pass API key explicitly
    console.log("Anthropic plugin (genkitx-anthropic) loaded successfully.");
  } catch (e) {
    console.warn("Failed to import or initialize Anthropic plugin (genkitx-anthropic). ANTHROPIC_API_KEY was found, but the plugin couldn't load. Error:", e);
  }
} else {
  console.log("ANTHROPIC_API_KEY not set or not found in environment. Anthropic plugin (genkitx-anthropic) will not be loaded.");
}

if (plugins.length === 0) {
  console.error(
    "CRITICAL: No Genkit AI plugins were loaded because no API keys (GOOGLEAI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY) were found in .env. " +
    "AI features will likely fail. Please set at least one API key."
  );
}

export const ai = genkit({
  plugins: plugins,
  // No default model is set here; it will be specified in each call
  // based on user selection from the UI (stored in localStorage).
  enableTracingAndMetrics: true, // Optional: good for development
});

// This file no longer exports currentAiProvider or currentAiModelIdentifier,
// as that will be managed by AppContext and localStorage.
// Individual AI flow calls will specify the model dynamically.

