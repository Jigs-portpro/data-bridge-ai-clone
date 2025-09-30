import { NextResponse } from 'next/server';
import { queryRow, query } from '@/lib/db';
import { BaseUrl, UpdateBaseUrl, BaseUrlResponse } from '@/types/baseUrls';

// GET /api/admin/base-urls/[id] - Get single base URL
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      const response: BaseUrlResponse = {
        success: false,
        error: 'Invalid ID format',
      };
      return NextResponse.json(response, { status: 400 });
    }

    const baseUrl = await queryRow<BaseUrl>(
      'SELECT * FROM base_urls WHERE id = $1',
      [id]
    );

    if (!baseUrl) {
      const response: BaseUrlResponse = {
        success: false,
        error: 'Base URL not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: BaseUrlResponse = {
      success: true,
      data: baseUrl,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching base URL:', error);

    const response: BaseUrlResponse = {
      success: false,
      error: 'Failed to fetch base URL',
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// PUT /api/admin/base-urls/[id] - Update base URL
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      const response: BaseUrlResponse = {
        success: false,
        error: 'Invalid ID format',
      };
      return NextResponse.json(response, { status: 400 });
    }

    const body: Partial<UpdateBaseUrl> = await request.json();

    // Remove id from body if present
    const { id: _, ...updateData } = body as any;

    // Validate URL if provided
    if (updateData.url) {
      try {
        new URL(updateData.url);
      } catch {
        const response: BaseUrlResponse = {
          success: false,
          error: 'Invalid URL format',
        };
        return NextResponse.json(response, { status: 400 });
      }
    }

    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (updateData.name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      values.push(updateData.name);
      paramIndex++;
    }

    if (updateData.url !== undefined) {
      updateFields.push(`url = $${paramIndex}`);
      values.push(updateData.url);
      paramIndex++;
    }

    if (updateData.description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      values.push(updateData.description);
      paramIndex++;
    }

    if (updateData.is_active !== undefined) {
      updateFields.push(`is_active = $${paramIndex}`);
      values.push(updateData.is_active);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      const response: BaseUrlResponse = {
        success: false,
        error: 'No fields to update',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // If setting this URL as active, deactivate all others first
    if (updateData.is_active === true) {
      await query('UPDATE base_urls SET is_active = false WHERE is_active = true AND id != $1', [id]);
    }

    // Add updated_at and id to the query
    updateFields.push(`updated_at = NOW()`);
    values.push(id);

    const updateQuery = `
      UPDATE base_urls
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(updateQuery, values);

    if (result.rows.length === 0) {
      const response: BaseUrlResponse = {
        success: false,
        error: 'Base URL not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    const baseUrl = result.rows[0] as BaseUrl;

    const response: BaseUrlResponse = {
      success: true,
      data: baseUrl,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error updating base URL:', error);

    // Handle unique constraint violation
    if (error.code === '23505' && error.constraint === 'base_urls_name_key') {
      const response: BaseUrlResponse = {
        success: false,
        error: 'A base URL with this name already exists',
      };
      return NextResponse.json(response, { status: 409 });
    }

    const response: BaseUrlResponse = {
      success: false,
      error: 'Failed to update base URL',
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// DELETE /api/admin/base-urls/[id] - Delete base URL
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      const response: BaseUrlResponse = {
        success: false,
        error: 'Invalid ID format',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Check if this is the active URL - prevent deletion of active URL
    const activeCheck = await queryRow(
      'SELECT is_active FROM base_urls WHERE id = $1',
      [id]
    );

    if (activeCheck?.is_active) {
      const response: BaseUrlResponse = {
        success: false,
        error: 'Cannot delete the active base URL. Please set another URL as active first.',
      };
      return NextResponse.json(response, { status: 400 });
    }

    const result = await query(
      'DELETE FROM base_urls WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      const response: BaseUrlResponse = {
        success: false,
        error: 'Base URL not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: BaseUrlResponse = {
      success: true,
      data: result.rows[0] as BaseUrl,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error deleting base URL:', error);

    const response: BaseUrlResponse = {
      success: false,
      error: 'Failed to delete base URL',
    };

    return NextResponse.json(response, { status: 500 });
  }
}