import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// POST /api/entities/[entity_id]/fields/bulk - Add multiple fields to entity
export async function POST(
  request: Request,
  { params }: { params: { entity_id: string } }
) {
  try {
    const { entity_id } = params;
    const body = await request.json();
    const { fields } = body;

    // Validate input
    if (!Array.isArray(fields) || fields.length === 0) {
      return NextResponse.json(
        {
          error: {
            message: 'Fields array is required and must not be empty',
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

    // Validate all fields before inserting
    const validFieldTypes = ['string', 'number', 'date', 'boolean', 'email', 'time', 'array'];

    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];

      if (!field.field_name || !field.display_name || !field.field_type) {
        return NextResponse.json(
          {
            error: {
              message: `Field at index ${i} is missing required fields: field_name, display_name, field_type`,
              status: 400
            }
          },
          { status: 400 }
        );
      }

      if (!validFieldTypes.includes(field.field_type)) {
        return NextResponse.json(
          {
            error: {
              message: `Field at index ${i} has invalid field_type. Must be one of: ${validFieldTypes.join(', ')}`,
              status: 400
            }
          },
          { status: 400 }
        );
      }
    }

    // Get current max sort_order
    const maxSortResult = await query(
      'SELECT COALESCE(MAX(sort_order), -1) as max_sort_order FROM entity_fields WHERE entity_id = $1',
      [entity_id]
    );
    let currentSortOrder = maxSortResult.rows[0].max_sort_order + 1;

    // Begin transaction for bulk insert
    await query('BEGIN');

    const insertedFields = [];

    try {
      for (const field of fields) {
        const {
          field_name,
          display_name,
          field_type,
          is_required = false,
          min_length,
          max_length,
          sort_order
        } = field;

        const finalSortOrder = sort_order !== undefined ? sort_order : currentSortOrder++;

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

        insertedFields.push(result.rows[0]);
      }

      await query('COMMIT');

      return NextResponse.json({
        success: true,
        data: insertedFields,
        message: `Successfully created ${insertedFields.length} entity fields`
      }, { status: 201 });

    } catch (error: any) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error: any) {
    console.error('Error bulk creating entity fields:', error);

    // Handle unique constraint violation
    if (error.code === '23505' && error.constraint === 'entity_fields_entity_id_field_name_key') {
      return NextResponse.json(
        {
          error: {
            message: 'One or more fields have names that already exist for this entity',
            status: 409
          }
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: {
          message: 'Failed to create entity fields',
          status: 500
        }
      },
      { status: 500 }
    );
  }
}