import { NextRequest, NextResponse } from 'next/server';
import { processEntityDetection } from '@/ai/flows/chat-interface-updates/entity-processor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { parsedDataContext, columns, chatHistory, selectedAiProvider, selectedAiModelName } = body;

    // Validate required fields
    if (!columns || !Array.isArray(columns) || columns.length === 0) {
      return NextResponse.json(
        { error: 'Columns are required for entity detection' },
        { status: 400 }
      );
    }

    if (!selectedAiProvider || !selectedAiModelName) {
      return NextResponse.json(
        { error: 'AI provider and model must be configured' },
        { status: 400 }
      );
    }

    // Create model identifier
    const modelToUse = `${selectedAiProvider}/${selectedAiModelName}`;

    // Call the entity detection function
    const result = await processEntityDetection(
      parsedDataContext,
      columns,
      chatHistory || [],
      modelToUse
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Entity detection API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Entity detection failed' },
      { status: 500 }
    );
  }
} 