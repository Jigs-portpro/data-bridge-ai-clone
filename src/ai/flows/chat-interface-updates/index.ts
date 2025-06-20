"use server";

import type { ChatInterfaceUpdatesClientInput, ChatInterfaceUpdatesOutput } from './schemas';
import { chatInterfaceUpdatesFlow } from './chat-flow';

export async function chatInterfaceUpdates(
  input: ChatInterfaceUpdatesClientInput
): Promise<ChatInterfaceUpdatesOutput> {
  return chatInterfaceUpdatesFlow(input);
}