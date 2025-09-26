import { NextRequest, NextResponse } from 'next/server';
import { queryRows, query } from '@/lib/db';
import { z } from 'zod';

// Validation schema for entity updates
const EntityUpdateSchema = z.object({
  entity_key: z.string().min(1).max(100).optional(),
  name: z.string().min(1).max(200).optional(),
  api_endpoint: z.string().min(1).max(500).optional(),
  upload_type: z.enum(['BULK_UPLOAD', 'SINGLE_ROW_UPLOAD']).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided for update"
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/entities/[id] - Get entity by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({
        error: {
          message: 'Invalid entity ID format',
          status: 400
        }
      }, { status: 400 });
    }

    const entities = await queryRows(
      `SELECT id, entity_key, name, api_endpoint, upload_type, is_active, created_at, updated_at
       FROM entities
       WHERE id = $1`,
      [id]
    );

    if (entities.length === 0) {
      return NextResponse.json({
        error: {
          message: 'Entity not found',
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
    console.error('Error fetching entity:', error);
    return NextResponse.json({
      error: {
        message: 'Failed to fetch entity',
        status: 500
      }
    }, { status: 500 });
  }
}

// PUT /api/entities/[id] - Update entity
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({
        error: {
          message: 'Invalid entity ID format',
          status: 400
        }
      }, { status: 400 });
    }

    // Validate request body
    const validatedData = EntityUpdateSchema.parse(body);

    // Check if entity exists
    const existingEntities = await queryRows(
      'SELECT id FROM entities WHERE id = $1',
      [id]
    );

    if (existingEntities.length === 0) {
      return NextResponse.json({
        error: {
          message: 'Entity not found',
          status: 404
        }
      }, { status: 404 });
    }

    // Check if entity_key already exists (if being updated)
    if (validatedData.entity_key) {
      const duplicateEntities = await queryRows(
        'SELECT id FROM entities WHERE entity_key = $1 AND id != $2',
        [validatedData.entity_key, id]
      );

      if (duplicateEntities.length > 0) {
        return NextResponse.json({
          error: {
            message: `Entity with key '${validatedData.entity_key}' already exists`,
            status: 400
          }
        }, { status: 400 });
      }
    }

    // Build dynamic update query
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramIndex}`);
        updateValues.push(value);
        paramIndex++;
      }
    });

    updateValues.push(id); // Add ID for WHERE clause

    const result = await query(
      `UPDATE entities
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, entity_key, name, api_endpoint, upload_type, is_active, created_at, updated_at`,
      updateValues
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Entity updated successfully'
    });

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

    console.error('Error updating entity:', error);
    return NextResponse.json({
      error: {
        message: 'Failed to update entity',
        status: 500
      }
    }, { status: 500 });
  }
}

// DELETE /api/entities/[id] - Delete entity
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({
        error: {
          message: 'Invalid entity ID format',
          status: 400
        }
      }, { status: 400 });
    }

    // Check if entity exists
    const existingEntities = await queryRows(
      'SELECT id, name FROM entities WHERE id = $1',
      [id]
    );

    if (existingEntities.length === 0) {
      return NextResponse.json({
        error: {
          message: 'Entity not found',
          status: 404
        }
      }, { status: 404 });
    }

    // Delete entity
    await query('DELETE FROM entities WHERE id = $1', [id]);

    return NextResponse.json({
      success: true,
      message: `Entity '${existingEntities[0].name}' deleted successfully`
    });

  } catch (error) {
    console.error('Error deleting entity:', error);
    return NextResponse.json({
      error: {
        message: 'Failed to delete entity',
        status: 500
      }
    }, { status: 500 });
  }
}