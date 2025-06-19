import { appRoute } from '@genkit-ai/next';
import { chatInterfaceUpdatesFlow } from '@/ai/flows/chat-interface-updates/chat-flow';

export const POST = appRoute(chatInterfaceUpdatesFlow);