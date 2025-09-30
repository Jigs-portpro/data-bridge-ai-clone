import { NextRequest, NextResponse } from 'next/server';
import { query, queryRows } from '@/lib/db';
import { z } from 'zod';

// Auto-invalidate entity caches when validations are modified
async function invalidateEntityCaches(reason: string) {
  console.log(`🗑️ Auto-invalidating entity caches: ${reason}`);

  try {
    // Clear validation service caches
    const { validationService } = await import('@/lib/validation/ValidationService');
    validationService.clearCache();

    console.log('✅ Entity caches invalidated successfully');
  } catch (error) {
    console.error('❌ Failed to invalidate entity caches:', error);
    throw error;
  }
}

// Validation schema for entity validation creation
const CreateEntityValidationSchema = z.object({
  entity_field_id: z.string().uuid(),
  validation_type: z.enum(['regex', 'enum', 'lookup']),
  pattern: z.string().optional(),
  enum_values: z.array(z.string()).optional(),
  lookup_id: z.string().optional(),
  lookup_field: z.string().optional(),
  error_message: z.string().max(500).optional(),
  is_active: z.boolean().default(true)
});

// GET /api/entity-validations - List all validations with field details
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entityFieldId = searchParams.get('entity_field_id');
    const validationType = searchParams.get('validation_type');
    const isActive = searchParams.get('is_active');

    let sql = `
      SELECT
        ev.*,
        ef.field_name,
        ef.display_name,
        e.name as entity_name,
        e.entity_key
      FROM entity_validations ev
      JOIN entity_fields ef ON ev.entity_field_id = ef.id
      JOIN entities e ON ef.entity_id = e.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (entityFieldId) {
      sql += ` AND ev.entity_field_id = $${paramIndex}`;
      params.push(entityFieldId);
      paramIndex++;
    }

    if (validationType) {
      sql += ` AND ev.validation_type = $${paramIndex}`;
      params.push(validationType);
      paramIndex++;
    }

    if (isActive !== null) {
      sql += ` AND ev.is_active = $${paramIndex}`;
      params.push(isActive === 'true');
      paramIndex++;
    }

    sql += ` ORDER BY e.name, ef.field_name, ev.validation_type`;

    const validations = await queryRows(sql, params);

    return NextResponse.json({
      success: true,
      data: validations
    });

  } catch (error: any) {
    console.error('Error fetching entity validations:', error);
    return NextResponse.json({
      error: {
        message: 'Failed to fetch entity validations',
        status: 500
      }
    }, { status: 500 });
  }
}

// POST /api/entity-validations - Create new validation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = CreateEntityValidationSchema.parse(body);

    // Check if entity field exists
    const fieldExists = await query(
      'SELECT id FROM entity_fields WHERE id = $1',
      [validatedData.entity_field_id]
    );

    if (!fieldExists) {
      return NextResponse.json({
        error: {
          message: 'Entity field not found',
          status: 404
        }
      }, { status: 404 });
    }

    const sql = `
      INSERT INTO entity_validations (
        entity_field_id, validation_type, pattern, enum_values,
        lookup_id, lookup_field, error_message, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const params = [
      validatedData.entity_field_id,
      validatedData.validation_type,
      validatedData.pattern || null,
      validatedData.enum_values ? JSON.stringify(validatedData.enum_values) : null,
      validatedData.lookup_id || null,
      validatedData.lookup_field || null,
      validatedData.error_message || null,
      validatedData.is_active
    ];

    const newValidation = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: newValidation,
      message: 'Entity validation created successfully'
    }, { status: 201 });

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

    console.error('Error creating entity validation:', error);
    return NextResponse.json({
      error: {
        message: 'Failed to create entity validation',
        status: 500
      }
    }, { status: 500 });
  }
}