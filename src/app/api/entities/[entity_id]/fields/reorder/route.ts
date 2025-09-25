import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// PATCH /api/entities/[entity_id]/fields/reorder - Reorder fields for entity
export async function PATCH(
  request: Request,
  { params }: { params: { entity_id: string } }
) {
  try {
    const { entity_id } = params;
    const body = await request.json();
    const { fieldOrders } = body;

    // Validate input
    if (!Array.isArray(fieldOrders) || fieldOrders.length === 0) {
      return NextResponse.json(
        {
          error: {
            message: 'fieldOrders array is required and must not be empty',
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

    // Validate field orders format
    for (let i = 0; i < fieldOrders.length; i++) {
      const order = fieldOrders[i];
      if (!order.id || typeof order.sort_order !== 'number') {
        return NextResponse.json(
          {
            error: {
              message: `Field order at index ${i} must have 'id' and 'sort_order' properties`,
              status: 400
            }
          },
          { status: 400 }
        );
      }
    }

    // Verify all fields belong to this entity
    const fieldIds = fieldOrders.map(order => order.id);
    const fieldCheck = await query(`
      SELECT id FROM entity_fields
      WHERE id = ANY($1) AND entity_id = $2
    `, [fieldIds, entity_id]);

    if (fieldCheck.rows.length !== fieldIds.length) {
      return NextResponse.json(
        {
          error: {
            message: 'One or more fields do not belong to this entity',
            status: 400
          }
        },
        { status: 400 }
      );
    }

    // Begin transaction for bulk update
    await query('BEGIN');

    const updatedFields = [];

    try {
      for (const order of fieldOrders) {
        const result = await query(`
          UPDATE entity_fields
          SET sort_order = $2, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1 AND entity_id = $3
          RETURNING *
        `, [order.id, order.sort_order, entity_id]);

        if (result.rows.length > 0) {
          updatedFields.push(result.rows[0]);
        }
      }

      await query('COMMIT');

      // Return the updated fields in sort order
      const finalResult = await query(`
        SELECT * FROM entity_fields
        WHERE entity_id = $1
        ORDER BY sort_order, field_name
      `, [entity_id]);

      return NextResponse.json({
        success: true,
        data: finalResult.rows,
        message: `Successfully reordered ${updatedFields.length} fields`
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error reordering entity fields:', error);
    return NextResponse.json(
      {
        error: {
          message: 'Failed to reorder entity fields',
          status: 500
        }
      },
      { status: 500 }
    );
  }
}