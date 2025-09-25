import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/entity-fields/[id] - Get single entity field
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const result = await query(`
      SELECT
        ef.*,
        e.name as entity_name,
        e.entity_key
      FROM entity_fields ef
      LEFT JOIN entities e ON ef.entity_id = e.id
      WHERE ef.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          error: {
            message: 'Entity field not found',
            status: 404
          }
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching entity field:', error);
    return NextResponse.json(
      {
        error: {
          message: 'Failed to fetch entity field',
          status: 500
        }
      },
      { status: 500 }
    );
  }
}

// PUT /api/entity-fields/[id] - Update entity field
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const {
      field_name,
      display_name,
      field_type,
      is_required = false,
      min_length,
      max_length,
      sort_order = 0
    } = body;

    // Check if field exists
    const existingField = await query(
      'SELECT id FROM entity_fields WHERE id = $1',
      [id]
    );

    if (existingField.rows.length === 0) {
      return NextResponse.json(
        {
          error: {
            message: 'Entity field not found',
            status: 404
          }
        },
        { status: 404 }
      );
    }

    // Validate field_type if provided
    if (field_type) {
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
    }

    // Update the field
    const result = await query(`
      UPDATE entity_fields
      SET
        field_name = COALESCE($2, field_name),
        display_name = COALESCE($3, display_name),
        field_type = COALESCE($4, field_type),
        is_required = COALESCE($5, is_required),
        min_length = $6,
        max_length = $7,
        sort_order = COALESCE($8, sort_order),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [
      id,
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
      message: 'Entity field updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating entity field:', error);

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
          message: 'Failed to update entity field',
          status: 500
        }
      },
      { status: 500 }
    );
  }
}

// DELETE /api/entity-fields/[id] - Delete entity field
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check if field exists
    const existingField = await query(
      'SELECT id, field_name FROM entity_fields WHERE id = $1',
      [id]
    );

    if (existingField.rows.length === 0) {
      return NextResponse.json(
        {
          error: {
            message: 'Entity field not found',
            status: 404
          }
        },
        { status: 404 }
      );
    }

    // Delete the field
    await query('DELETE FROM entity_fields WHERE id = $1', [id]);

    return NextResponse.json({
      success: true,
      message: 'Entity field deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting entity field:', error);
    return NextResponse.json(
      {
        error: {
          message: 'Failed to delete entity field',
          status: 500
        }
      },
      { status: 500 }
    );
  }
}