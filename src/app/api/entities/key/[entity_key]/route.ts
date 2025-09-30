import { NextRequest, NextResponse } from 'next/server';
import { queryRows, query } from '@/lib/db';

interface RouteParams {
  params: Promise<{ entity_key: string }>;
}

// GET /api/entities/key/[entity_key] - Get entity by entity_key
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { entity_key } = await params;

    // Validate entity_key
    if (!entity_key || entity_key.trim().length === 0) {
      return NextResponse.json({
        error: {
          message: 'Entity key is required',
          status: 400
        }
      }, { status: 400 });
    }

    const entities = await queryRows(
      `SELECT id, entity_key, name, api_endpoint, created_at, updated_at
       FROM entities
       WHERE entity_key = $1`,
      [entity_key]
    );

    if (entities.length === 0) {
      return NextResponse.json({
        error: {
          message: `Entity with key '${entity_key}' not found`,
          status: 404
        }
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: entities[0],
      message: 'Entity retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching entity by key:', error);
    return NextResponse.json({
      error: {
        message: 'Failed to fetch entity',
        status: 500
      }
    }, { status: 500 });
  }
}