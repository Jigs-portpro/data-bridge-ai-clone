import { type NextRequest, NextResponse } from 'next/server';
import type { ExportConfig, ExportEntity, ExportEntityField } from '@/config/exportEntities';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:mysecretpassword@localhost:5432/portpro_data_bridge',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_BASE_URI || 'https://api.axle.network';

export async function GET(req: NextRequest) {
  try {
    console.log('🔄 Fetching export entities from database...');

    // Get entities with their fields
    const result = await pool.query(`
      SELECT
        e.id,
        e.entity_key,
        e.name,
        e.api_endpoint as url,
        json_agg(
          json_build_object(
            'name', ef.field_name,
            'required', ef.is_required,
            'type', ef.field_type,
            'minLength', ef.min_length,
            'maxLength', ef.max_length
          ) ORDER BY ef.sort_order
        ) as fields
      FROM entities e
      LEFT JOIN entity_fields ef ON e.id = ef.entity_id
      GROUP BY e.id, e.entity_key, e.name, e.api_endpoint
      ORDER BY e.name;
    `);

    const entities: ExportEntity[] = result.rows.map(row => ({
      id: row.entity_key, // Use entity_key as the id
      name: row.name,
      url: row.url,
      uploadType: 'SINGLE_ROW_UPLOAD', // Default for now
      fields: row.fields.filter((field: any) => field.name !== null) // Filter out null fields
    }));

    const config: ExportConfig = {
      baseUrl: DEFAULT_BASE_URL,
      entities: entities
    };

    console.log(`✅ Loaded ${entities.length} entities from database`);
    return NextResponse.json(config, { status: 200 });

  } catch (error: any) {
    console.error('❌ Error fetching export entities from database:', error);

    // Fallback to empty config
    const fallbackConfig: ExportConfig = {
      baseUrl: DEFAULT_BASE_URL,
      entities: []
    };

    return NextResponse.json(fallbackConfig, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('🔄 Updating export entities in database...');
    const updatedConfig: ExportConfig = await req.json();

    if (
      typeof updatedConfig !== 'object' || updatedConfig === null ||
      (typeof updatedConfig.baseUrl !== 'string') ||
      !Array.isArray(updatedConfig.entities)
    ) {
      return NextResponse.json({ message: 'Invalid configuration format provided.' }, { status: 400 });
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update base URL (could be stored in a settings table in the future)
      // For now, we'll just validate it but not store it

      // Process each entity
      for (const entity of updatedConfig.entities) {
        // Validate entity structure
        if (
          typeof entity !== 'object' || entity === null ||
          typeof entity.id !== 'string' ||
          typeof entity.name !== 'string' ||
          typeof entity.url !== 'string' ||
          !Array.isArray(entity.fields)
        ) {
          throw new Error(`Invalid entity structure for entity: ${entity.id}`);
        }

        // Update or insert entity
        const entityResult = await client.query(`
          INSERT INTO entities (entity_key, name, api_endpoint, upload_type, is_active)
          VALUES ($1, $2, $3, $4, true)
          ON CONFLICT (entity_key)
          DO UPDATE SET
            name = EXCLUDED.name,
            api_endpoint = EXCLUDED.api_endpoint,
            upload_type = EXCLUDED.upload_type,
            updated_at = CURRENT_TIMESTAMP
          RETURNING id;
        `, [
          entity.id,
          entity.name,
          entity.url,
          entity.uploadType || 'SINGLE_ROW_UPLOAD'
        ]);

        const entityId = entityResult.rows[0].id;

        // Delete existing fields for this entity
        await client.query('DELETE FROM entity_fields WHERE entity_id = $1', [entityId]);

        // Insert new fields
        for (let i = 0; i < entity.fields.length; i++) {
          const field = entity.fields[i];

          await client.query(`
            INSERT INTO entity_fields (
              entity_id, field_name, display_name, field_type,
              is_required, min_length, max_length, sort_order
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
          `, [
            entityId,
            field.name,
            field.name, // Use name as display_name for now
            field.type || 'string',
            field.required || false,
            field.minLength || null,
            field.maxLength || null,
            i + 1
          ]);
        }
      }

      await client.query('COMMIT');
      console.log('✅ Export entities updated in database successfully');

      return NextResponse.json({ message: 'Configuration updated successfully' }, { status: 200 });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('❌ Error updating export entities in database:', error);
    return NextResponse.json({
      message: 'Error saving configuration',
      error: error.message
    }, { status: 500 });
  }
}