import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';

const UpdateEntityValidationSchema = z.object({
  validation_type: z.enum(['regex', 'enum', 'lookup']).optional(),
  pattern: z.string().optional(),
  enum_values: z.array(z.string()).optional(),
  lookup_id: z.string().optional(),
  lookup_field: z.string().optional(),
  error_message: z.string().max(500).optional(),
  is_active: z.boolean().optional()
});

// GET /api/entity-validations/[id] - Get single validation
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sql = `
      SELECT
        ev.*,
        ef.field_name,
        ef.display_name,
        ef.field_type,
        e.name as entity_name,
        e.entity_key
      FROM entity_validations ev
      JOIN entity_fields ef ON ev.entity_field_id = ef.id
      JOIN entities e ON ef.entity_id = e.id
      WHERE ev.id = $1
    `;

    const validation = await query(sql, [params.id]);

    if (!validation) {
      return NextResponse.json({
        error: {
          message: 'Entity validation not found',
          status: 404
        }
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: validation
    });

  } catch (error: any) {
    console.error('Error fetching entity validation:', error);
    return NextResponse.json({
      error: {
        message: 'Failed to fetch entity validation',
        status: 500
      }
    }, { status: 500 });
  }
}

// PUT /api/entity-validations/[id] - Update validation
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const validatedData = UpdateEntityValidationSchema.parse(body);

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'enum_values') {
          updateFields.push(`${key} = $${paramIndex}`);
          updateValues.push(JSON.stringify(value));
        } else {
          updateFields.push(`${key} = $${paramIndex}`);
          updateValues.push(value);
        }
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      return NextResponse.json({
        error: {
          message: 'No fields to update',
          status: 400
        }
      }, { status: 400 });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(params.id);

    const sql = `
      UPDATE entity_validations
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const updatedValidation = await query(sql, updateValues);

    if (!updatedValidation) {
      return NextResponse.json({
        error: {
          message: 'Entity validation not found',
          status: 404
        }
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: updatedValidation,
      message: 'Entity validation updated successfully'
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: {
          message: 'Validation failed',
          details: error.errors,
          status: 400
        }
      }, { status: 400 });
    }

    console.error('Error updating entity validation:', error);
    return NextResponse.json({
      error: {
        message: 'Failed to update entity validation',
        status: 500
      }
    }, { status: 500 });
  }
}

// DELETE /api/entity-validations/[id] - Delete validation
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deletedValidation = await query(
      'DELETE FROM entity_validations WHERE id = $1 RETURNING *',
      [params.id]
    );

    if (!deletedValidation) {
      return NextResponse.json({
        error: {
          message: 'Entity validation not found',
          status: 404
        }
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Entity validation deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting entity validation:', error);
    return NextResponse.json({
      error: {
        message: 'Failed to delete entity validation',
        status: 500
      }
    }, { status: 500 });
  }
}