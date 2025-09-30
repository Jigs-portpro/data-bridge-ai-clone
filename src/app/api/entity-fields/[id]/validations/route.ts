import { NextRequest, NextResponse } from 'next/server';
import { query, queryRows } from '@/lib/db';

// GET /api/entity-fields/[id]/validations - Get all validations for a field
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sql = `
      SELECT * FROM entity_validations
      WHERE entity_field_id = $1
      ORDER BY validation_type, created_at
    `;

    const validations = await queryRows(sql, [params.id]);

    return NextResponse.json({
      success: true,
      data: validations
    });

  } catch (error: any) {
    console.error('Error fetching field validations:', error);
    return NextResponse.json({
      error: {
        message: 'Failed to fetch field validations',
        status: 500
      }
    }, { status: 500 });
  }
}