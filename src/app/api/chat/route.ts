import { NextRequest, NextResponse } from "next/server";
import { chatInterfaceUpdatesFlow } from "@/ai/flows/chat-interface-updates/chat-flow";
import { getCallableJSON } from "genkit/context";
import { ChatInterfaceUpdatesClientInput } from "@/ai/flows/chat-interface-updates/schemas";
import { generateAbortKey } from "@/utils/redis-helpers";
import redis from "@/lib/redis";

const delimiter = "\n\n";

export const POST = async (req: NextRequest) => {
  const { data: input } = (await req.json()) as {
    data: ChatInterfaceUpdatesClientInput;
  };
  const abortController = new AbortController();
  const { signal } = abortController;
  req.signal.onabort = async () => {
    console.log("Abort signal triggered.");
    abortController.abort();
    const abortKey = generateAbortKey(input.sessionId, input.entity_session_id);
    await redis.setex(abortKey, 300, "true");
    console.log(`Abort key set in Redis: ${abortKey}`);
  };

  const { output, stream } = chatInterfaceUpdatesFlow.stream(input, {
    abortSignal: signal,
  });

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();

  (async (): Promise<void> => {
    const writer = writable.getWriter();
    try {
      for await (const chunk of stream) {
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({ message: chunk })}${delimiter}`
          )
        );
      }
      await writer.write(
        encoder.encode(
          `data: ${JSON.stringify({ result: await output })}${delimiter}`
        )
      );
      await writer.write(encoder.encode("END"));
    } catch (err: any) {
      console.error("Error streaming action:", err);
      try {
        await writer.write(
          encoder.encode(
            `error: ${JSON.stringify(getCallableJSON(err))}` + "\n\n"
          )
        );
        await writer.write(encoder.encode("END"));
      } catch (e) {
        // Ignore further errors if the writer is already closed
      }
    } finally {
      if (!writer.closed) {
        await writer.close();
      }
    }
  })();

  return new NextResponse(readable, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};
