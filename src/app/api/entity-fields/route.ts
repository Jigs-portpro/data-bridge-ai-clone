import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/entity-fields - Get all entity fields
export async function GET() {
  try {
    const result = await query(`
      SELECT
        ef.*,
        e.name as entity_name,
        e.entity_key
      FROM entity_fields ef
      LEFT JOIN entities e ON ef.entity_id = e.id
      ORDER BY e.name, ef.sort_order, ef.field_name
    `);

    return NextResponse.json({
      success: true,
      data: result.rows
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

// POST /api/entity-fields - Create new entity field
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      entity_id,
      field_name,
      display_name,
      field_type,
      is_required = false,
      min_length,
      max_length,
      sort_order = 0
    } = body;

    // Validate required fields
    if (!entity_id || !field_name || !display_name || !field_type) {
      return NextResponse.json(
        {
          error: {
            message: 'Missing required fields: entity_id, field_name, display_name, field_type',
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
      sort_order
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