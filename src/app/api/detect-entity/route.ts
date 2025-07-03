import { NextRequest, NextResponse } from 'next/server';
import { processEntityDetection } from '@/ai/flows/chat-interface-updates/entity-processor';
import { resolveAIModel } from '@/ai/flows/chat-interface-updates/model-resolver';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { columns, chatHistory, selectedAiProvider, selectedAiModelName } = body;

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

    // Resolve the AI model
    const modelToUse = resolveAIModel(selectedAiProvider, selectedAiModelName);

    // Call the entity detection function
    const result = await processEntityDetection(
      columns,
      chatHistory || [],
      modelToUse,
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