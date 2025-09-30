# Admin Database Migration Game Plan

## Project Overview
Migrate the current `exportEntities.json` configuration system to a PostgreSQL database-backed admin system with separate management interface.

## Current State Analysis

### Current Architecture
- **Configuration**: Single `exportEntities.json` file (2,649 lines)
- **Base URL**: Single baseUrl for all entities
- **Entities**: 24+ entity types (Load, Carrier, Tariff, Trailers, etc.)
- **Database**: MongoDB (via mongoose) for existing data
- **Tech Stack**: Next.js 15, TypeScript, ShadCN UI, Redis for caching

### Key Components in exportEntities.json
1. **Base URL**: `https://new-api.dev.portpro.io`
2. **Entities**: Each with:
   - `id`, `name`, `url`, `uploadType`
   - Complex `fields` array with validation rules
   - Lookup validations against various data sources
3. **Field Types**: string, number, date, boolean, array
4. **Validation**: patterns, required fields, min/max length, lookup validations

## Migration Strategy: Phase-by-Phase Approach

### Phase 1: Base URLs Table (STARTING POINT)
**Objective**: Create and implement Base URLs management as proof of concept

#### 1.1 Database Setup
**Tasks:**
- [ ] Install PostgreSQL dependencies: `pg`, `@types/pg`
- [ ] Create database connection utility: `src/lib/db.ts`
- [ ] Test connection with existing PostgreSQL instance

#### 1.2 Create Base URLs Table
**Simple SQL File Approach:**
- [ ] Create SQL file: `sql/001_create_base_urls.sql`
- [ ] Run SQL manually in database
- [ ] Create TypeScript types: `src/types/baseUrls.ts`

**SQL Schema:**
```sql
CREATE TABLE base_urls (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  url VARCHAR(500) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 1.3 Seed Base URLs Data
**Simple Seeding:**
- [ ] Extract current baseUrl from `exportEntities.json`
- [ ] Create seed SQL: `sql/002_seed_base_urls.sql`
- [ ] Run seed SQL manually in database

**Seed Data:**
```sql
INSERT INTO base_urls (name, url, description) VALUES
  ('Development API', 'https://new-api.dev.portpro.io', 'Current development endpoint'),
  ('Production API', 'https://new-api.portpro.io', 'Production endpoint');
```

#### 1.4 API Development
**Simple CRUD API Routes:**
- [ ] Create `src/app/api/admin/base-urls/route.ts` (GET, POST)
- [ ] Create `src/app/api/admin/base-urls/[id]/route.ts` (PUT, DELETE)
- [ ] Add basic error handling

#### 1.5 Admin UI Development
**Simple Admin Pages:**
- [ ] Create `src/app/admin/base-urls/page.tsx` - List page with table
- [ ] Create `src/app/admin/base-urls/new/page.tsx` - Add new form
- [ ] Create `src/app/admin/base-urls/[id]/edit/page.tsx` - Edit form
- [ ] Use existing ShadCN UI components

#### 1.6 Integration & Testing
**Simple Integration:**
- [ ] Update application to read base URLs from database instead of JSON
- [ ] Test all CRUD operations manually
- [ ] Verify changes work in application

### Phase 2: Entities Table (FUTURE)
**Objective**: Migrate entity definitions to database

#### Components to Migrate:
- Entity basic information (id, name, url, uploadType)
- Entity-specific configurations (isBulkUpload, customPayloadType)
- Relationship with base URLs

### Phase 3: Fields & Validation (FUTURE)
**Objective**: Migrate field definitions and validation rules

#### Components to Migrate:
- Field definitions (name, sourceColumn, type)
- Validation rules (required, patterns, min/max length)
- Lookup validations and relationships

### Phase 4: Lookup Management (FUTURE)
**Objective**: Create admin interface for lookup data management

### Phase 5: Complete Migration (FUTURE)
**Objective**: Remove dependency on exportEntities.json

## Simple Implementation Approach

### Dependencies
```bash
npm install pg @types/pg
```

### Environment Variables
```env
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
```

### File Structure (Simplified)
```
sql/
├── 001_create_base_urls.sql  # CREATE TABLE
└── 002_seed_base_urls.sql    # INSERT data

src/
├── lib/
│   └── db.ts                 # Simple database connection
├── types/
│   └── baseUrls.ts           # TypeScript types
├── app/
│   ├── admin/
│   │   └── base-urls/
│   │       ├── page.tsx      # List page
│   │       ├── new/page.tsx  # Add page
│   │       └── [id]/edit/page.tsx # Edit page
│   └── api/
│       └── admin/
│           └── base-urls/
│               ├── route.ts  # GET, POST
│               └── [id]/route.ts # PUT, DELETE
```

## Simple Development Workflow

### Step 1: Database Setup (1 hour)
1. Install `pg` and `@types/pg`
2. Create simple database connection in `src/lib/db.ts`
3. Test connection

### Step 2: Create Table (30 minutes)
1. Write SQL file: `sql/001_create_base_urls.sql`
2. Run SQL in database manually
3. Create TypeScript types

### Step 3: Seed Data (30 minutes)
1. Write SQL file: `sql/002_seed_base_urls.sql`
2. Run SQL in database manually

### Step 4: API Routes (2-3 hours)
1. Create simple CRUD endpoints
2. Basic error handling

### Step 5: Admin UI (3-4 hours)
1. Create list page
2. Create add/edit forms
3. Connect to API

### Step 6: Integration (1 hour)
1. Update app to use database
2. Test manually

**Total Estimated Time: 8-10 hours**

## Success Criteria for Phase 1

### Technical Criteria
- [ ] PostgreSQL connection established and working
- [ ] Base URLs table created with proper schema
- [ ] All CRUD operations working through API
- [ ] Admin UI fully functional with proper validation
- [ ] Application reads base URLs from database
- [ ] Caching implemented for performance
- [ ] Proper error handling throughout

### User Experience Criteria
- [ ] Admin can manage base URLs without technical knowledge
- [ ] Changes reflect in application immediately
- [ ] UI is responsive and intuitive
- [ ] Proper feedback for all user actions
- [ ] Data validation prevents invalid entries

### Performance Criteria
- [ ] Database queries are optimized
- [ ] Page load times are acceptable (<2 seconds)
- [ ] Caching reduces database load
- [ ] No impact on existing application performance

## Risk Mitigation

### Technical Risks
1. **Database Connection Issues**: Implement connection pooling and retry logic
2. **Data Migration Failures**: Create backup and rollback procedures
3. **Performance Impact**: Implement caching and optimize queries
4. **Integration Bugs**: Maintain JSON fallback during transition

### Business Risks
1. **Downtime**: Use feature flags and gradual rollout
2. **Data Loss**: Implement comprehensive backup strategy
3. **User Confusion**: Create clear documentation and training materials

## Next Steps After Phase 1 Completion

1. **Evaluate Success**: Review metrics and gather feedback
2. **Plan Phase 2**: Design entities table structure
3. **Stakeholder Review**: Present progress and get approval for next phase
4. **Documentation**: Update technical documentation
5. **Knowledge Transfer**: Train team on new admin system

## CLI Commands for Implementation

### Simple Setup
```bash
# Install dependencies
npm install pg @types/pg

# Create table manually
psql $DATABASE_URL -f sql/001_create_base_urls.sql

# Seed data manually
psql $DATABASE_URL -f sql/002_seed_base_urls.sql
```

### Development Commands
```bash
# Start development server
npm run dev

# Run type checking
npm run typecheck

# Run linting
npm run lint
```

This game plan provides a clear, step-by-step approach to migrating the current JSON-based configuration to a database-backed admin system, starting with Base URLs as a proof of concept before tackling the more complex entity and field structures.