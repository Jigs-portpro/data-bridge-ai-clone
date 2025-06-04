
import { promises as fs } from 'fs';
import path from 'path';
import { type NextRequest, NextResponse } from 'next/server';
import type { ExportConfig } from '@/config/exportEntities';

const JSON_FILE_PATH = path.join(process.cwd(), 'exportEntities.json');
const DEFAULT_CONFIG: ExportConfig = {
  baseUrl: 'https://api.example.com/data',
  entities: [],
};

async function ensureConfigFileExists() {
  try {
    await fs.access(JSON_FILE_PATH);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      try {
        await fs.writeFile(JSON_FILE_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8');
        console.log('Created exportEntities.json with default configuration.');
      } catch (writeError) {
        console.error('Error creating default exportEntities.json:', writeError);
        throw new Error('Failed to initialize configuration file.');
      }
    } else {
      throw error;
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureConfigFileExists();
    const fileContents = await fs.readFile(JSON_FILE_PATH, 'utf8');
    const data: unknown = JSON.parse(fileContents);

    // Validate the structure of the loaded data.
    // It should be an object with 'baseUrl' (string) and 'entities' (array).
    if (
        typeof data === 'object' &&
        data !== null &&
        // baseUrl can be an empty string, so we check if it's a string
        (typeof (data as ExportConfig).baseUrl === 'string') &&
        'entities' in data &&
        Array.isArray((data as ExportConfig).entities)
      ) {
      // Further check if all entities have required fields like id, name, url, fields (array)
      const isValidEntities = (data as ExportConfig).entities.every(
        (entity: any) =>
          typeof entity === 'object' &&
          entity !== null &&
          typeof entity.id === 'string' &&
          typeof entity.name === 'string' &&
          typeof entity.url === 'string' &&
          Array.isArray(entity.fields)
      );
      if (isValidEntities) {
        return NextResponse.json(data as ExportConfig, { status: 200 });
      }
    }
    
    // If structure is invalid or malformed, log a warning and return/reset to default.
    console.warn('exportEntities.json has invalid structure or content, attempting to reset to default config.');
    await fs.writeFile(JSON_FILE_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8');
    return NextResponse.json(DEFAULT_CONFIG, { status: 200 });

  } catch (error: any) {
    console.error('Error reading or parsing exportEntities.json:', error);
    try {
      console.warn('Attempting to reset exportEntities.json due to read/parse error.');
      await fs.writeFile(JSON_FILE_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8');
      return NextResponse.json(DEFAULT_CONFIG, { status: 200 });
    } catch (resetError) {
      console.error('Failed to reset exportEntities.json:', resetError);
      return NextResponse.json({ message: 'Error loading configuration and failed to reset.' }, { status: 500 });
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureConfigFileExists();
    const updatedConfig: ExportConfig = await req.json();
    
    if (
      typeof updatedConfig !== 'object' || updatedConfig === null ||
      (typeof updatedConfig.baseUrl !== 'string') || // baseUrl can be empty, but must be string
      !Array.isArray(updatedConfig.entities)
    ) {
      return NextResponse.json({ message: 'Invalid configuration format provided.' }, { status: 400 });
    }
    // Basic validation for entities structure can be added here if needed
    const isValidEntities = updatedConfig.entities.every(
        (entity: any) =>
          typeof entity === 'object' &&
          entity !== null &&
          typeof entity.id === 'string' &&
          typeof entity.name === 'string' &&
          typeof entity.url === 'string' &&
          Array.isArray(entity.fields)
      );
    if (!isValidEntities && updatedConfig.entities.length > 0) { // Allow empty entities array
        return NextResponse.json({ message: 'Invalid entity structure in configuration.' }, { status: 400 });
    }

    await fs.writeFile(JSON_FILE_PATH, JSON.stringify(updatedConfig, null, 2), 'utf8');
    return NextResponse.json({ message: 'Configuration updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error writing exportEntities.json:', error);
    return NextResponse.json({ message: 'Error saving configuration' }, { status: 500 });
  }
}
