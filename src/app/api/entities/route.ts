import { NextRequest, NextResponse } from 'next/server';
import { queryRows, query } from '@/lib/db';
import { z } from 'zod';

// Auto-invalidate entity caches
async function invalidateEntityCaches(reason: string) {
  console.log(`🗑️ Auto-invalidating entity caches: ${reason}`);

  try {
    // Clear validation service caches
    const { validationService } = await import('@/lib/validation/ValidationService');
    validationService.clearCache();

    // Clear entities cache in useValidation.ts
    const { clearEntitiesCache } = await import('@/hooks/useValidation');
    clearEntitiesCache();

    console.log('✅ Entity caches invalidated successfully');
  } catch (error) {
    console.error('❌ Failed to invalidate entity caches:', error);
    throw error;
  }
}

// Validation schema for entity creation/updates
const EntitySchema = z.object({
  entity_key: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  api_endpoint: z.string().min(1).max(500),
  upload_type: z.enum(['BULK_UPLOAD', 'SINGLE_ROW_UPLOAD']).optional().default('SINGLE_ROW_UPLOAD'),
});

// GET /api/entities - Get all entities
export async function GET() {
  try {
    const entities = await queryRows(
      `SELECT id, entity_key, name, api_endpoint, upload_type, is_active, created_at, updated_at
       FROM entities
       ORDER BY name ASC`
    );

    return NextResponse.json({
      success: true,
      data: entities,
      message: 'Entities retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching entities:', error);
    return NextResponse.json({
      error: {
        message: 'Failed to fetch entities',
        status: 500
      }
    }, { status: 500 });
  }
}

// POST /api/entities - Create new entity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validatedData = EntitySchema.parse(body);

    // Check if entity_key already exists
    const existingEntities = await queryRows(
      'SELECT id FROM entities WHERE entity_key = $1',
      [validatedData.entity_key]
    );

    if (existingEntities.length > 0) {
      return NextResponse.json({
        error: {
          message: `Entity with key '${validatedData.entity_key}' already exists`,
          status: 400
        }
      }, { status: 400 });
    }

    // Insert new entity
    const result = await query(
      `INSERT INTO entities (entity_key, name, api_endpoint, upload_type)
       VALUES ($1, $2, $3, $4)
       RETURNING id, entity_key, name, api_endpoint, upload_type, is_active, created_at, updated_at`,
      [validatedData.entity_key, validatedData.name, validatedData.api_endpoint, validatedData.upload_type]
    );

    // Auto-invalidate caches when entity is created
    try {
      await invalidateEntityCaches('Entity created');
    } catch (cacheError) {
      console.warn('⚠️ Cache invalidation failed after entity creation:', cacheError);
      // Don't fail the request if cache invalidation fails
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Entity created successfully'
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: {
          message: 'Validation error',
          details: error.errors,
          status: 400
        }
      }, { status: 400 });
    }

    console.error('Error creating entity:', error);
    return NextResponse.json({
      error: {
        message: 'Failed to create entity',
        status: 500
      }
    }, { status: 500 });
  }
}