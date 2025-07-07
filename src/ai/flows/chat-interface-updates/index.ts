"use server";

import type { ChatInterfaceUpdatesClientInput } from "./schemas";
import { chatInterfaceUpdatesFlow } from "./chat-flow";

export async function chatInterfaceUpdates(
  input: ChatInterfaceUpdatesClientInput
) {
  return chatInterfaceUpdatesFlow(input);
}