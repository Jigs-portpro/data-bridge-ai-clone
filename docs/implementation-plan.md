# Database-Driven Entity System Implementation Plan

## Overview
This document outlines the step-by-step implementation plan for building a PostgreSQL-based entity management system with 4 separate admin pages. Each feature will be implemented and tested completely before moving to the next.

## Implementation Strategy: Feature-by-Feature Approach

### **Separation of Concerns**
1. **Entity Management** - Core entity CRUD operations
2. **Entity Field Management** - Field definitions with basic validation (required, min/max length)
3. **Entity Validation Management** - Regex patterns for field validation
4. **Lookup Management** - Lookup data and validation rules

### **Admin Pages Structure**
All pages will be created under `/admin` section:
- `/admin/base-urls` (already exists)
- `/admin/entities` (to be created)
- `/admin/entity-fields` (to be created)
- `/admin/entity-validations` (to be created)
- `/admin/lookups` (to be created)

### **Database Architecture**
- **Separate Tables**: Each concern gets its own table structure
- **Clean Separation**: No mixing of validation and lookup logic in core tables
- **Step-by-Step Schema**: Build schema incrementally as features are added

## Implementation Phases

## FEATURE 1: ENTITY MANAGEMENT (Start Here)

### Phase 1.1: Simple Database Foundation
**Goal**: Create minimal PostgreSQL schema for entities only (per original requirements document)

#### Task 1.1.1: Core Entity Table Creation
- **File**: `/sql/001_create_entities_table.sql` (revert to simple structure)
- **Description**: Create entities table matching original requirements exactly
- **Implementation Details**:
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

  CREATE INDEX idx_entities_entity_key ON entities(entity_key);
  ```
- **Success Criteria**: Entities table created, matches requirements document exactly

#### Task 1.1.2: PostgreSQL Connection Setup
- **File**: `/src/lib/db.ts` (already exists - REUSE EXISTING)
- **Description**: Use existing PostgreSQL connection utilities
- **Implementation Details**:
  - PostgreSQL connection already established for base-urls feature
  - Uses existing `pg` package with connection pooling
  - Environment variable: `DATABASE_URL` (already configured)
  - Helper functions: `query()`, `queryRows()`, `queryRow()` (already available)
  - **NOTE**: No new database utilities needed - use existing patterns
- **Success Criteria**: Reuse existing proven database layer from base-urls admin page

### Phase 1.2: Entity API Routes
**Goal**: Implement all entity endpoints from requirements document

#### Task 1.2.1: Basic Entity CRUD API Routes
- **Files**:
  - `/src/app/api/entities/route.ts` (GET all, POST create)
  - `/src/app/api/entities/[id]/route.ts` (GET/PUT/DELETE single entity)
  - `/src/app/api/entities/key/[entity_key]/route.ts` (GET entity by key)
- **Description**: Implement entity endpoints exactly as specified in requirements
- **API Endpoints**:
  ```typescript
  GET /api/entities                    // Get all entities
  GET /api/entities/:id               // Get entity by ID
  GET /api/entities/key/:entity_key   // Get entity by entity_key
  POST /api/entities                  // Create new entity
  PUT /api/entities/:id              // Update entity
  DELETE /api/entities/:id           // Delete entity
  ```
- **Success Criteria**: All entity endpoints working, proper HTTP status codes, error handling

### Phase 1.3: Entity Management Admin Page
**Goal**: Create `/admin/entities` page for entity CRUD operations

#### Task 1.3.1: Entity Management UI
- **File**: `/src/app/admin/entities/page.tsx` (to be created)
- **Description**: Admin page for managing entities
- **Implementation Details**:
  - List all entities in a table/grid
  - Add new entity form
  - Edit existing entity (inline or modal)
  - Delete entity with confirmation
  - Search/filter entities
  - Use existing UI components (ShadCN)
  - Follow existing admin page patterns (like base-urls page)
- **Success Criteria**: Complete entity CRUD operations working in UI

#### Task 1.3.2: Seed Data Migration
- **File**: `/sql/002_seed_entities.sql` (simple version)
- **Description**: Migrate just the 14 entity records (without fields for now)
- **Implementation Details**:
  - Insert only entity records: name, entity_key, api_endpoint
  - Based on existing `exportEntities.json` data
  - Simple INSERT statements
- **Success Criteria**: All 14 entities loaded and manageable via admin page

**🎯 MILESTONE 1 COMPLETE ✅**: Entity Management fully working before moving to fields

### ✅ **PHASE 1 IMPLEMENTATION STATUS - COMPLETED**

**What was actually implemented:**
- ✅ **Database Schema**: `entities` table created with proper indexes and triggers
- ✅ **Database Connection**: Reused existing `/src/lib/db.ts` (no new file needed)
- ✅ **API Routes**: All 6 entity endpoints implemented with full CRUD
  - `GET /api/entities` - List all entities
  - `POST /api/entities` - Create new entity
  - `GET /api/entities/[id]` - Get entity by ID
  - `PUT /api/entities/[id]` - Update entity
  - `DELETE /api/entities/[id]` - Delete entity
  - `GET /api/entities/key/[entity_key]` - Get entity by key
- ✅ **Modern Admin UI**: `/admin/entities` page with sleek ShadCN design
- ✅ **Navigation**: Added "Entities" link to Admin section in sidebar
- ✅ **Seed Data**: 14 entities migrated from `exportEntities.json`
- ✅ **Scrolling Fix**: Fixed vertical scrolling issues across all pages
- ✅ **Migration Script**: Node.js script to run database migrations

**Key corrections made:**
- Used existing `db.ts` instead of creating duplicate `postgres.ts`
- Followed existing patterns from `admin/base-urls` page
- Applied modern gradient design with card-based layout
- Fixed app-wide scrolling issues in `AppLayout.tsx`

---

## FEATURE 2: ENTITY FIELD MANAGEMENT (Next Feature) 🔄

### **IMPORTANT NOTE FOR FUTURE IMPLEMENTATION:**
- **Reuse existing `/src/lib/db.ts`** - Do NOT create new database utilities
- **Follow `/admin/base-urls` patterns** - Use same API response formats
- **Use existing ShadCN components** - Maintain design consistency
- **Add to existing Admin navigation** - Follow same sidebar pattern

### Phase 2.1: Entity Fields Table
**Goal**: Create entity_fields table with basic validation (required, min/max length only)

#### Task 2.1.1: Entity Fields Table Creation
- **File**: `/sql/003_create_entity_fields_table.sql` (to be created)
- **Description**: Create entity_fields table per requirements document
- **Implementation Details**:
  ```sql
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
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(entity_id, field_name)
  );
  ```
- **Success Criteria**: Entity fields table created, no validation or lookup complexity yet

### Phase 2.2: Entity Fields API Routes
**Goal**: Implement all entity field endpoints from requirements document

#### Task 2.2.1: Entity Field CRUD API Routes
- **Files**:
  - `/src/app/api/entity-fields/route.ts`
  - `/src/app/api/entity-fields/[id]/route.ts`
  - `/src/app/api/entities/[entity_id]/fields/route.ts`
  - `/src/app/api/entities/[entity_id]/fields/bulk/route.ts`
  - `/src/app/api/entities/[entity_id]/fields/reorder/route.ts`
- **Success Criteria**: All field endpoints working per requirements document

### Phase 2.3: Entity Fields Admin Page
**Goal**: Create `/admin/entity-fields` page

#### Task 2.3.1: Entity Fields Management UI
- **File**: `/src/app/admin/entity-fields/page.tsx` (to be created)
- **Implementation Details**:
  - List fields by entity
  - Add/edit/delete fields
  - Set required flag, min/max length only
  - Field reordering
- **Success Criteria**: Complete field CRUD with basic validation

**🎯 MILESTONE 2 COMPLETE**: Entity + Field Management working

## FEATURE 3: ENTITY VALIDATION MANAGEMENT (Third Feature)

### Phase 3.1: Entity Validations Table
**Goal**: Create separate table for regex pattern validations

#### Task 3.1.1: Entity Validations Table Creation
- **File**: `/sql/004_create_entity_validations_table.sql` (to be created)
- **Description**: Create entity_validations table for regex patterns only
- **Implementation Details**:
  ```sql
  CREATE TABLE entity_validations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      entity_field_id UUID NOT NULL REFERENCES entity_fields(id) ON DELETE CASCADE,
      validation_type VARCHAR(50) DEFAULT 'regex',
      pattern VARCHAR(500) NOT NULL,
      error_message VARCHAR(500),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
  ```
- **Success Criteria**: Validation table created, linked to entity fields

### Phase 3.2: Entity Validations Admin Page
**Goal**: Create `/admin/entity-validations` page

#### Task 3.2.1: Entity Validations Management UI
- **File**: `/src/app/admin/entity-validations/page.tsx` (to be created)
- **Implementation Details**:
  - List validations by entity/field
  - Add regex patterns to fields
  - Test regex patterns
  - Manage validation error messages
- **Success Criteria**: Complete validation management for regex patterns

**🎯 MILESTONE 3 COMPLETE**: Entity + Field + Validation Management working

## FEATURE 4: LOOKUP MANAGEMENT (Final Feature)

### Phase 4.1: Lookups Table
**Goal**: Create separate table for lookup data and validation

#### Task 4.1.1: Lookups Table Creation
- **File**: `/sql/005_create_lookups_table.sql` (to be created)
- **Description**: Create lookups table for validation data
- **Implementation Details**:
  ```sql
  CREATE TABLE lookups (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      lookup_key VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(200) NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE entity_field_lookups (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      entity_field_id UUID NOT NULL REFERENCES entity_fields(id) ON DELETE CASCADE,
      lookup_id UUID NOT NULL REFERENCES lookups(id) ON DELETE CASCADE,
      lookup_field VARCHAR(200) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
  ```
- **Success Criteria**: Lookup tables created, separate from main entity structure

### Phase 4.2: Lookups Admin Page
**Goal**: Create `/admin/lookups` page

#### Task 4.2.1: Lookups Management UI
- **File**: `/src/app/admin/lookups/page.tsx` (to be created)
- **Implementation Details**:
  - Manage lookup datasets
  - Assign lookups to entity fields
  - Upload/import lookup data
  - Test lookup validations
- **Success Criteria**: Complete lookup management system

**🎯 MILESTONE 4 COMPLETE**: Full Entity Management System Complete

## FEATURE 5: MIGRATION (Final Step)

### Phase 5.1: Replace Current Implementation
**Goal**: Gradually replace JSON/MongoDB system with PostgreSQL

#### Task 5.1.1: Update Setup Page Integration
- **File**: `/src/app/setup/page.tsx` (update existing)
- **Description**: Integrate with new PostgreSQL-backed system
- **Implementation Details**:
  - Load entities from PostgreSQL instead of JSON/MongoDB
  - Use new admin pages for entity management
  - Maintain backward compatibility during transition
- **Success Criteria**: Setup page uses PostgreSQL backend

**🎯 FINAL MILESTONE**: Complete migration to PostgreSQL system

---

## Implementation Order Summary

1. **START HERE**: Feature 1 - Entity Management
2. **THEN**: Feature 2 - Entity Field Management
3. **THEN**: Feature 3 - Entity Validation Management
4. **THEN**: Feature 4 - Lookup Management
5. **FINALLY**: Feature 5 - Migration

## File Structure by Feature

### Feature 1: Entity Management
```
/sql/001_create_entities_table.sql (simple structure)
/sql/002_seed_entities.sql (14 entities only)
/src/lib/postgres.ts (connection utilities)
/src/app/api/entities/route.ts
/src/app/api/entities/[id]/route.ts
/src/app/api/entities/key/[entity_key]/route.ts
/src/app/admin/entities/page.tsx (new admin page)
```

### Feature 2: Entity Field Management
```
/sql/003_create_entity_fields_table.sql
/src/app/api/entity-fields/* (all field API routes)
/src/app/admin/entity-fields/page.tsx (new admin page)
```

### Feature 3: Entity Validation Management
```
/sql/004_create_entity_validations_table.sql
/src/app/admin/entity-validations/page.tsx (new admin page)
```

### Feature 4: Lookup Management
```
/sql/005_create_lookups_table.sql
/src/app/admin/lookups/page.tsx (new admin page)
```

### Feature 5: Migration
```
Updated: /src/app/setup/page.tsx (integration with PostgreSQL)
```
  ```typescript
  GET /api/entities                    // Get all entities
  POST /api/entities                   // Create new entity
  GET /api/entities/:id                // Get entity by ID with fields
  PUT /api/entities/:id               // Update entity
  DELETE /api/entities/:id            // Delete entity (cascades to fields)
  GET /api/entities/key/:entity_key   // Get entity by entity_key with fields
  ```
- **Implementation Details**:
  - Follow existing API route patterns (like `/src/app/api/export-entities/route.ts`)
  - Use PostgreSQL connection from Phase 1
  - Return format matching existing ExportConfig/ExportEntity interfaces
  - Transaction support for data integrity
  - Proper error handling and HTTP status codes
- **Success Criteria**: All entity endpoints working with existing frontend code

#### Task 2.2: Entity Fields Management API Routes
- **Files**:
  - `/src/app/api/entity-fields/route.ts` - GET all fields
  - `/src/app/api/entity-fields/[id]/route.ts` - GET/PUT/DELETE single field
  - `/src/app/api/entities/[entity_id]/fields/route.ts` - GET fields for entity, POST add field
  - `/src/app/api/entities/[entity_id]/fields/bulk/route.ts` - POST bulk add fields
  - `/src/app/api/entities/[entity_id]/fields/reorder/route.ts` - PATCH reorder fields
- **Description**: Implement field CRUD operations following requirements document
- **API Endpoints**:
  ```typescript
  GET /api/entity-fields                           // Get all fields
  GET /api/entity-fields/:id                      // Get single field
  PUT /api/entity-fields/:id                      // Update field
  DELETE /api/entity-fields/:id                   // Delete field
  GET /api/entities/:entity_id/fields             // Get fields for entity
  POST /api/entities/:entity_id/fields            // Add field to entity
  POST /api/entities/:entity_id/fields/bulk       // Add multiple fields
  PATCH /api/entities/:entity_id/fields/reorder   // Update sort_order
  ```
- **Implementation Details**:
  - Field validation based on ExportEntityField interface
  - Support for all field types: string, number, boolean, email, date, array
  - Handle complex validation: patterns, min/max values, enum values, lookups
  - Bulk operations with PostgreSQL transactions
  - Sort order management for field reordering
- **Success Criteria**: All field endpoints working with proper validation

#### Task 2.3: Data Migration API Routes
- **Files**:
  - `/src/app/api/entities/migrate/route.ts` - POST migrate from JSON/MongoDB
- **Description**: Create migration endpoint to transfer existing data
- **Implementation Details**:
  - Load entities from existing `exportEntities.json`
  - Load entities from MongoDB (via existing `getEntity()` helper)
  - Transform data to PostgreSQL schema
  - Bulk insert with transaction support
  - Preserve all field properties and validation rules
  - Handle duplicate detection and updates
- **Success Criteria**: Successfully migrate all 14 entities with complete field definitions

### Phase 3: Frontend Integration (Priority: MEDIUM)
**Goal**: Update existing setup page and components to use new PostgreSQL-backed API endpoints

#### Task 3.1: Update Export Entities API Route
- **File**: `/src/app/api/export-entities/route.ts` (Update existing)
- **Description**: Modify existing API route to load from PostgreSQL instead of JSON file
- **Implementation Details**:
  - Replace file system operations with PostgreSQL queries
  - Maintain existing response format (ExportConfig interface)
  - Add fallback to existing JSON file during transition
  - Preserve existing error handling and validation
  - Support both GET and POST operations as before
- **Success Criteria**: Existing frontend code works without changes

#### Task 3.2: Setup Page API Integration
- **File**: `/src/app/setup/page.tsx` (Update existing)
- **Description**: Update setup page to use new PostgreSQL-backed endpoints
- **Implementation Details**:
  - Modify `fetchConfig()` to use PostgreSQL-backed `/api/export-entities`
  - Update `handleSaveConfig()` to use database instead of MongoDB
  - Add migration trigger to move data from MongoDB to PostgreSQL
  - Maintain all existing UI/UX patterns and field validation
  - Preserve drag-and-drop, field reordering, and all current functionality
  - Add transition logic to handle both old and new systems during migration
- **Success Criteria**: Setup page works identically with enhanced database backend

#### Task 3.3: MongoDB to PostgreSQL Migration Helper
- **File**: `/src/utils/entity-migration-helpers.ts` (to be created)
- **Description**: Create utilities to migrate existing MongoDB entity configs to PostgreSQL
- **Implementation Details**:
  - Read existing entity configs from MongoDB via `getEntity()`
  - Transform data to match PostgreSQL schema
  - Batch insert entities and fields using new API endpoints
  - Handle conflicts and data validation
  - Provide rollback capability
  - Support one-time migration with verification
- **Success Criteria**: Seamless migration from MongoDB to PostgreSQL without data loss

### Phase 4: Application Integration (Priority: MEDIUM)
**Goal**: Ensure all application components work with PostgreSQL-backed entities

#### Task 4.1: Verify AI Flows Compatibility
- **Files**: No changes needed, just verification
  - `/src/ai/flows/auto-column-mapping.ts`
  - `/src/ai/flows/data-correction-suggestions.ts`
  - `/src/ai/flows/chat-interface-updates/`
- **Description**: Verify AI flows work with PostgreSQL-backed entity data
- **Implementation Details**:
  - AI flows already use entity data through existing interfaces
  - Since we maintain ExportConfig/ExportEntity interfaces, no changes needed
  - Test AI flows with entities loaded from PostgreSQL
  - Verify lookup validation and field mapping work correctly
  - Test chat interface with dynamic entity loading
- **Success Criteria**: All AI flows work identically with PostgreSQL-backed data

#### Task 4.2: AppContext Integration Verification
- **File**: `/src/contexts/AppContext.tsx` (Verify, minimal changes)
- **Description**: Ensure AppContext works with new entity loading
- **Implementation Details**:
  - AppContext already uses `entityConfig` from setup page
  - Since setup page will load from PostgreSQL, no direct changes needed
  - Verify entity loading performance is acceptable
  - Test state management with dynamic entities
- **Success Criteria**: AppContext works seamlessly with PostgreSQL entities

#### Task 4.3: Export Data Functionality Verification
- **File**: `/src/app/export-data/page.tsx` (Verify, no changes expected)
- **Description**: Verify export functionality works with PostgreSQL entities
- **Implementation Details**:
  - Export functionality uses entities from AppContext
  - Since AppContext gets entities from setup page, and setup page loads from PostgreSQL
  - No direct changes needed to export functionality
  - Test entity selection, field mapping, and validation
  - Verify all existing export workflows function correctly
- **Success Criteria**: Export functionality works with PostgreSQL-backed entities

### Phase 5: Performance & Optimization (Priority: LOW)
**Goal**: Optimize system for production use

#### Task 5.1: Database Optimization
- **File**: `/sql/002_optimization.sql`
- **Description**: Add additional indexes and constraints for performance
- **Implementation Details**:
  - Query performance analysis
  - Additional indexes for common queries
  - Database connection pooling optimization
- **Success Criteria**: Sub-100ms response times for common queries

#### Task 5.2: Monitoring & Health Checks
- **File**: `/src/api/health.ts`
- **Description**: Add health monitoring and metrics
- **Implementation Details**:
  - API health endpoints
  - Database connection monitoring
  - Performance metrics collection
- **Success Criteria**: Production-ready monitoring in place

### Phase 6: Migration & Cleanup (Priority: LOW)
**Goal**: Complete migration and remove legacy code

#### Task 6.1: Data Validation & Testing
- **Files**: Test scripts and validation utilities
- **Description**: Comprehensive testing of migration
- **Implementation Details**:
  - Data integrity validation
  - End-to-end testing of all features
  - Performance testing with real data
- **Success Criteria**: All tests passing, performance acceptable

#### Task 6.2: Legacy Code Removal
- **Files**: Remove `exportEntities.json` and related static configurations
- **Description**: Clean up legacy systems
- **Implementation Details**:
  - Remove static JSON file
  - Remove MongoDB-based entity storage
  - Update documentation
  - Remove unused code paths
- **Success Criteria**: Codebase cleaned up, no unused legacy code

## Technical Specifications

### Database Schema Details
- **Primary Keys**: UUID for all tables
- **Foreign Keys**: Proper CASCADE DELETE relationships
- **Constraints**: Field type validation, unique constraints
- **Indexes**: Performance indexes on frequently queried fields
- **Timestamps**: Automatic created_at/updated_at tracking

### API Specifications
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with node-postgres (pg)
- **Validation**: Request validation with proper error responses
- **Error Handling**: Consistent error response format
- **Transactions**: Database transactions for multi-record operations
- **HTTP Status Codes**: Proper status codes (200, 201, 400, 404, 500)

### Response Formats
```typescript
// Success Response
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}

// Error Response
{
  "error": {
    "message": "Error description",
    "status": 404
  }
}
```

### Environment Variables Required
```env
DATABASE_URL=postgresql://username:password@localhost:5432/database
API_PORT=3001 (or integrate with Next.js)
```

## Migration Strategy

### Phase-by-Phase Rollout
1. **Development**: Implement API alongside existing system
2. **Testing**: Parallel testing with both systems
3. **Staging**: Switch to database system in staging environment
4. **Production**: Gradual rollout with fallback capability
5. **Cleanup**: Remove legacy code after successful migration

### Risk Mitigation
- **Data Backup**: Full backup before migration
- **Rollback Plan**: Ability to revert to JSON-based system
- **Monitoring**: Comprehensive logging and monitoring during migration
- **Testing**: Extensive testing at each phase

## File Structure - CORRECTED
```
/sql/
  001_create_entities_tables.sql (created)
  002_enhanced_entities_schema.sql (to be created)
  004_seed_entities.sql (existing, to be enhanced)

/src/lib/
  postgres.ts (to be created - PostgreSQL connection utilities)

/src/app/api/
  entities/
    route.ts (GET all, POST create)
    [id]/route.ts (GET/PUT/DELETE single entity)
    key/[entity_key]/route.ts (GET entity by key)
    migrate/route.ts (POST migration from JSON/MongoDB)
  entity-fields/
    route.ts (GET all fields)
    [id]/route.ts (GET/PUT/DELETE single field)
  entities/[entity_id]/fields/
    route.ts (GET entity fields, POST add field)
    bulk/route.ts (POST bulk add fields)
    reorder/route.ts (PATCH reorder fields)

/src/utils/
  entity-migration-helpers.ts (to be created)

Updated files:
  /src/app/api/export-entities/route.ts (update to use PostgreSQL)
  /src/app/setup/page.tsx (update to use new API endpoints)

Verification only (no changes needed):
  /src/contexts/AppContext.tsx
  /src/app/export-data/page.tsx
  /src/ai/flows/ (all AI flows should work without changes)
```

## Success Criteria
- ✅ All existing functionality preserved
- ✅ Setup page works identically to current version
- ✅ All 14 entities migrated successfully
- ✅ API endpoints match requirements specification
- ✅ Performance meets or exceeds current system
- ✅ Complete test coverage for new functionality
- ✅ Production-ready monitoring and error handling

## Next Steps
1. **Get approval** for this implementation plan
2. **Start with Phase 1**: Database foundation setup
3. **Create database migration scripts** as the first concrete step
4. **Set up development environment** with PostgreSQL
5. **Begin API development** following the detailed specifications

This plan ensures a systematic, risk-managed migration from the current static system to a fully dynamic, database-driven entity management system while preserving all existing functionality and user experience.