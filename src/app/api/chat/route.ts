import { NextRequest, NextResponse } from 'next/server';
import { chatInterfaceUpdates } from '@/ai/flows/chat-interface-updates';
import { ChatInterfaceUpdatesClientInput } from '@/ai/flows/chat-interface-updates/schemas';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      dataContext,
      userQuery,
      aiProvider,
      aiModelName,
      chatHistory,
      apiToken,
      enableLookupValidation = true,
      appContextLookupData,
    } = body as ChatInterfaceUpdatesClientInput;

    // Validate required fields
    if (!dataContext || !userQuery || !aiProvider || !aiModelName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const input: ChatInterfaceUpdatesClientInput = {
      dataContext,
      userQuery,
      aiProvider,
      aiModelName,
      chatHistory: chatHistory || [],
      apiToken,
      enableLookupValidation,
      appContextLookupData,
    };

    // Create a readable stream for the response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Call the chat interface updates function
          const result = await chatInterfaceUpdates(input);
          
          // Stream the response text character by character
          const responseText = result.response;
          for (let i = 0; i < responseText.length; i++) {
            controller.enqueue(new TextEncoder().encode(responseText[i]));
            // Add a small delay to simulate streaming
            await new Promise(resolve => setTimeout(resolve, 20));
          }

          // Send the final data context as a special chunk
          if (result.updatedDataContext) {
            const finalChunk = `\n__FINAL_DATA__${JSON.stringify({
              updatedDataContext: result.updatedDataContext
            })}__END_FINAL_DATA__\n`;
            controller.enqueue(new TextEncoder().encode(finalChunk));
          }

          controller.close();
        } catch (error) {
          console.error('Error in chat stream:', error);
          const errorMessage = `ERROR: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
          controller.enqueue(new TextEncoder().encode(errorMessage));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
