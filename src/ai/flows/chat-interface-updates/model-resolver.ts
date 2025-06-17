import { gpt4o, gpt4oMini, gpt4Turbo, gpt4, gpt35Turbo } from 'genkitx-openai';

export function resolveAIModel(aiProvider: string, aiModelName: string): any {
  let modelToUse: any;
  
  if (aiProvider === 'openai') {
    switch (aiModelName) {
      case 'gpt4o': modelToUse = gpt4o; break;
      case 'gpt4oMini': modelToUse = gpt4oMini; break;
      case 'gpt4Turbo': modelToUse = gpt4Turbo; break;
      case 'gpt4': modelToUse = gpt4; break;
      case 'gpt35Turbo': modelToUse = gpt35Turbo; break;
      default: 
        console.log(`Unknown OpenAI model ID: ${aiModelName}`);
        modelToUse = gpt4oMini; // Default fallback
    }
  } else if (aiProvider === 'anthropic') {
    modelToUse = aiModelName;
  } else if (aiProvider === 'googleai') {
    modelToUse = `googleai/${aiModelName}`;
  } else {
    console.log(`Unsupported AI provider: ${aiProvider}`);
    modelToUse = gpt4oMini; // Default fallback
  }
  
  return modelToUse;
} 