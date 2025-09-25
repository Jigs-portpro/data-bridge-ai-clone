import { NextResponse } from 'next/server';
import { queryRows, query } from '@/lib/db';
import { BaseUrl, CreateBaseUrl, BaseUrlListResponse, BaseUrlResponse } from '@/types/baseUrls';

// GET /api/admin/base-urls - Get all base URLs
export async function GET() {
  try {
    const baseUrls = await queryRows<BaseUrl>(
      'SELECT * FROM base_urls ORDER BY id ASC'
    );

    const response: BaseUrlListResponse = {
      success: true,
      data: baseUrls,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching base URLs:', error);

    const response: BaseUrlListResponse = {
      success: false,
      error: 'Failed to fetch base URLs',
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// POST /api/admin/base-urls - Create new base URL
export async function POST(request: Request) {
  try {
    const body: CreateBaseUrl = await request.json();

    // Basic validation
    if (!body.name || !body.url) {
      const response: BaseUrlResponse = {
        success: false,
        error: 'Name and URL are required',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(body.url);
    } catch {
      const response: BaseUrlResponse = {
        success: false,
        error: 'Invalid URL format',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // If setting this URL as active, deactivate all others first
    if (body.is_active) {
      await query('UPDATE base_urls SET is_active = false WHERE is_active = true');
    }

    const result = await query(
      `INSERT INTO base_urls (name, url, description, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [body.name, body.url, body.description || null, body.is_active ?? true]
    );

    const baseUrl = result.rows[0] as BaseUrl;

    const response: BaseUrlResponse = {
      success: true,
      data: baseUrl,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error: any) {
    console.error('Error creating base URL:', error);

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
      error: 'Failed to create base URL',
    };

    return NextResponse.json(response, { status: 500 });
  }
}