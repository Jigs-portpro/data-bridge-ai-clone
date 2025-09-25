# Node.js RESTful API for Entity Management

## Overview
Create a RESTful API in Node.js to manage entities and their fields. An entity represents a data model (like "Load", "Carrier", "Drivers") and each entity has multiple fields with properties.

## Database Tables (PostgreSQL)

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_key VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    api_endpoint VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE entity_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    field_name VARCHAR(200) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    source_column VARCHAR(200),
    field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('string', 'number', 'date', 'boolean', 'email', 'time', 'array')),
    is_required BOOLEAN DEFAULT false,
    min_length INTEGER,
    max_length INTEGER,
    pattern VARCHAR(500),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(entity_id, field_name)
);

CREATE INDEX idx_entity_fields_entity_id ON entity_fields(entity_id);
CREATE INDEX idx_entities_entity_key ON entities(entity_key);
```

## Required API Endpoints

### Entities
- `GET /api/entities` - Get all entities
- `GET /api/entities/:id` - Get entity by ID with its fields
- `GET /api/entities/key/:entity_key` - Get entity by entity_key with its fields
- `POST /api/entities` - Create new entity
- `PUT /api/entities/:id` - Update entity
- `DELETE /api/entities/:id` - Delete entity (cascades to fields)

### Entity Fields
- `GET /api/entity-fields` - Get all fields
- `GET /api/entities/:entity_id/fields` - Get fields for specific entity
- `GET /api/entity-fields/:id` - Get single field
- `POST /api/entities/:entity_id/fields` - Add field to entity
- `POST /api/entities/:entity_id/fields/bulk` - Add multiple fields
- `PUT /api/entity-fields/:id` - Update field
- `PATCH /api/entities/:entity_id/fields/reorder` - Update sort_order for multiple fields
- `DELETE /api/entity-fields/:id` - Delete field

## Requirements
1. Use Express.js and node-postgres (pg)
2. All deletes are hard deletes (permanent)
3. Use database transactions for operations affecting multiple records
4. Implement automatic timestamp updates for `updated_at`
5. Basic required field validation only
6. Return appropriate HTTP status codes
7. Handle errors properly

## Sample Request/Response

### Create Entity
```json
// POST /api/entities
{
  "entity_key": "load",
  "name": "Load",
  "api_endpoint": "/tms/uploadLoad"
}
```

### Add Field to Entity
```json
// POST /api/entities/:entity_id/fields
{
  "field_name": "customer",
  "display_name": "Customer",
  "source_column": "caller",
  "field_type": "string",
  "is_required": true,
  "min_length": 2,
  "max_length": 100,
  "sort_order": 1
}
```

### Success Response Format
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response Format
```json
{
  "error": {
    "message": "Error description",
    "status": 404
  }
}
```

## Notes
- A seed.sql file is provided with sample data for 14 entities
- Fields should be returned sorted by `sort_order`
- When getting an entity, include its fields in the response
- The `entity_id` foreign key ensures fields are deleted when entity is deleted