import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/entities/[entity_id]/fields - Get fields for specific entity
export async function GET(
  request: Request,
  { params }: { params: { entity_id: string } }
) {
  try {
    const { entity_id } = params;

    // Check if entity exists
    const entityCheck = await query(
      'SELECT id, name, entity_key FROM entities WHERE id = $1',
      [entity_id]
    );

    if (entityCheck.rows.length === 0) {
      return NextResponse.json(
        {
          error: {
            message: 'Entity not found',
            status: 404
          }
        },
        { status: 404 }
      );
    }

    // Get fields for the entity
    const result = await query(`
      SELECT *
      FROM entity_fields
      WHERE entity_id = $1
      ORDER BY sort_order, field_name
    `, [entity_id]);

    return NextResponse.json({
      success: true,
      data: {
        entity: entityCheck.rows[0],
        fields: result.rows
      }
    });
  } catch (error) {
    console.error('Error fetching entity fields:', error);
    return NextResponse.json(
      {
        error: {
          message: 'Failed to fetch entity fields',
          status: 500
        }
      },
      { status: 500 }
    );
  }
}

// POST /api/entities/[entity_id]/fields - Add field to specific entity
export async function POST(
  request: Request,
  { params }: { params: { entity_id: string } }
) {
  try {
    const { entity_id } = params;
    const body = await request.json();
    const {
      field_name,
      display_name,
      field_type,
      is_required = false,
      min_length,
      max_length,
      sort_order
    } = body;

    // Validate required fields
    if (!field_name || !display_name || !field_type) {
      return NextResponse.json(
        {
          error: {
            message: 'Missing required fields: field_name, display_name, field_type',
            status: 400
          }
        },
        { status: 400 }
      );
    }

    // Validate field_type
    const validFieldTypes = ['string', 'number', 'date', 'boolean', 'email', 'time', 'array'];
    if (!validFieldTypes.includes(field_type)) {
      return NextResponse.json(
        {
          error: {
            message: `Invalid field_type. Must be one of: ${validFieldTypes.join(', ')}`,
            status: 400
          }
        },
        { status: 400 }
      );
    }

    // Check if entity exists
    const entityCheck = await query(
      'SELECT id FROM entities WHERE id = $1',
      [entity_id]
    );

    if (entityCheck.rows.length === 0) {
      return NextResponse.json(
        {
          error: {
            message: 'Entity not found',
            status: 404
          }
        },
        { status: 404 }
      );
    }

    // Get current max sort_order if not provided
    let finalSortOrder = sort_order;
    if (finalSortOrder === undefined) {
      const maxSortResult = await query(
        'SELECT COALESCE(MAX(sort_order), -1) + 1 as next_sort_order FROM entity_fields WHERE entity_id = $1',
        [entity_id]
      );
      finalSortOrder = maxSortResult.rows[0].next_sort_order;
    }

    // Insert the new field
    const result = await query(`
      INSERT INTO entity_fields (
        entity_id, field_name, display_name, field_type,
        is_required, min_length, max_length, sort_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      entity_id,
      field_name,
      display_name,
      field_type,
      is_required,
      min_length,
      max_length,
      finalSortOrder
    ]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Entity field created successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating entity field:', error);

    // Handle unique constraint violation
    if (error.code === '23505' && error.constraint === 'entity_fields_entity_id_field_name_key') {
      return NextResponse.json(
        {
          error: {
            message: 'A field with this name already exists for this entity',
            status: 409
          }
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: {
          message: 'Failed to create entity field',
          status: 500
        }
      },
      { status: 500 }
    );
  }
}