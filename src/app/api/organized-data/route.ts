import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

export async function PUT(request: NextRequest) {
  try {
    const { sessionId, entityName, organizedData, errorRows, errorCells, errorMessages } = await request.json();

    if (!sessionId || !entityName) {
      return NextResponse.json({ error: 'Session ID and entity name are required' }, { status: 400 });
    }

    const key = `organized_data:${sessionId}:${entityName}`;
    
    const dataToStore = {
      organizedData,
      errorRows,
      errorCells,
      errorMessages,
      timestamp: Date.now()
    };

    await redis.set(key, JSON.stringify(dataToStore));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error storing organized data:', error);
    return NextResponse.json({ error: 'Failed to store organized data' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const entityName = searchParams.get('entityName');

    if (!sessionId || !entityName) {
      return NextResponse.json({ error: 'Session ID and entity name are required' }, { status: 400 });
    }

    const key = `organized_data:${sessionId}:${entityName}`;
    const storedData = await redis.get(key);

    if (!storedData) {
      return NextResponse.json({ error: 'No organized data found' }, { status: 404 });
    }

    const parsedData = JSON.parse(storedData);
    
    // Check if data is recent (within 24 hours)
    const isRecent = Date.now() - parsedData.timestamp < 24 * 60 * 60 * 1000;
    
    if (!isRecent) {
      // Clear old data
      await redis.del(key);
      return NextResponse.json({ error: 'Organized data has expired' }, { status: 404 });
    }

    return NextResponse.json(parsedData);
  } catch (error) {
    console.error('Error retrieving organized data:', error);
    return NextResponse.json({ error: 'Failed to retrieve organized data' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const entityName = searchParams.get('entityName');

    if (!sessionId || !entityName) {
      return NextResponse.json({ error: 'Session ID and entity name are required' }, { status: 400 });
    }

    const key = `organized_data:${sessionId}:${entityName}`;
    await redis.del(key);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting organized data:', error);
    return NextResponse.json({ error: 'Failed to delete organized data' }, { status: 500 });
  }
} 