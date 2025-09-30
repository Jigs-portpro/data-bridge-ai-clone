# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Main Development Commands:**
- `npm run dev` - Start Next.js development server on port 9002 with Turbopack
- `npm run build` - Build the application for production
- `npm run start` - Start production server
- `npm run lint` - Run Next.js linting
- `npm run typecheck` - Run TypeScript type checking

**AI Development Commands:**
- `npm run genkit:dev` - Start Genkit development server for AI flows debugging
- `npm run genkit:watch` - Start Genkit with watch mode using tsx

## Project Overview

PortPro Data Bridge is an intelligent data processing platform that enables users to upload, process, validate, enrich, and export data to target APIs with AI-powered automation. The platform features dynamic entity management, intelligent column mapping, and comprehensive validation workflows.

## High-Level Architecture

### Core Technology Stack
- **Framework:** Next.js 15.2.3 with App Router
- **Language:** TypeScript
- **UI:** ShadCN UI components with Tailwind CSS
- **AI Integration:** Google Genkit with support for Google AI (Gemini), OpenAI (GPT), and Anthropic (Claude) models
- **State Management:** Redux Toolkit with Redux Persist
- **Authentication:** NextAuth.js
- **Databases:**
  - **PostgreSQL** - Primary database for entity configuration, field definitions, and validations
  - **MongoDB** - Lookup data caching and session management
- **File Processing:** `xlsx` library for Excel, custom CSV parser

### Database Architecture

**PostgreSQL (Primary Configuration Store):**
- **Tables:**
  - `base_urls` - API base URL configurations
  - `entities` - Entity definitions with upload types
  - `entity_fields` - Field definitions per entity with data types and constraints
  - `entity_validations` - Complex validation rules (lookup, regex patterns, min/max values)
- **Migration Scripts:** Located in `/sql/` directory
- **Connection:** Managed via `pg` Pool in `src/lib/db.ts`
- **Schema Files:** `sql/001_create_entities_tables.sql`, `sql/003_create_entity_fields_table.sql`, `sql/003_create_entity_validations_table.sql`

**MongoDB (Cache & Sessions):**
- Used for lookup data caching (chassis owners, container types, branches, etc.)
- Session management via NextAuth
- Legacy entity model in `src/lib/models/entity.ts`

### AI-Powered Features

**Core AI Flows (located in `src/ai/flows/`):**
- `entity-detection.ts` - Intelligent entity detection with specialized Tariff/Charge Profile classification
- `auto-column-mapping.ts` - Hybrid AI/direct matching for column mapping
- `data-correction-suggestions.ts` - AI-powered data quality improvements
- `data-enrichment.ts` - Natural language data enhancement
- `duplicate-detection.ts` - Fuzzy matching for duplicate identification
- `anomaly-report.ts` - Statistical anomaly detection
- `intelligent-column-reordering.ts` - Logic-based column organization
- `process-address-flow.ts` - Address cleaning, standardization, and geocoding
- `data-modification.ts` - Natural language data transformations
- `data-validation.ts` - AI-powered validation with error suggestions

**AI Provider Configuration:**
- Multi-provider support: Google AI (Gemini models), OpenAI (GPT models), Anthropic (Claude models)
- Provider selection managed in `src/ai/genkit.ts`
- Runtime model switching via AI Settings page (`src/app/ai-settings/page.tsx`)
- Requires at least one API key: `GOOGLEAI_API_KEY`, `OPENAI_API_KEY`, or `ANTHROPIC_API_KEY`

### Application Pages & Routes

**Main Application Pages:**
- `/` - Main data view with upload, preview, and processing tools
- `/admin/entities` - Entity management (CRUD operations)
- `/admin/entity-fields` - Field configuration per entity
- `/admin/entity-validations` - Validation rule management
- `/admin/base-urls` - API base URL management
- `/admin/cache-management` - Cache invalidation and management
- `/export-data` - Data export with mapping, validation, and API submission
- `/lookups` - Lookup data fetching and caching
- `/ai-settings` - AI provider and model configuration
- `/auth-token` - API authentication token management
- `/login` - User authentication

**Key API Routes:**
- `/api/entities` - Entity CRUD operations
- `/api/entity-fields` - Field management
- `/api/entity-validations` - Validation rule management
- `/api/detect-entity` - AI-powered entity detection
- `/api/chat` - Natural language chat interface
- `/api/upload` - File upload handling
- `/api/data` - Data manipulation operations
- `/api/process-addresses` - Address processing flow
- `/api/admin/base-urls` - Base URL management

### Data Flow Architecture

**Upload & Processing Workflow:**
1. **File Upload** - CSV/Excel with multi-sheet detection via `/api/upload`
2. **Entity Detection** - AI analyzes columns and suggests matching entity via `entity-detection.ts`
3. **Data Preview** - Sortable/filterable table in main view
4. **AI Processing Tools** - Available via sidebar (enrichment, correction, anomaly detection, etc.)
5. **Chat Interface** - Natural language data manipulation

**Entity Configuration System (PostgreSQL-based):**
- Dynamic entity definitions stored in PostgreSQL
- Configurable field definitions with data types (string, number, date, boolean)
- Validation rules: required, minLength, maxLength, pattern, minValue, maxValue
- Lookup validation support (validates against cached lookup data)
- Upload types: `SINGLE_ROW_UPLOAD` (row-by-row POST) or `BULK_UPLOAD` (single POST with array)

**Validation & Export Pipeline:**
1. **Column Mapping** - AI auto-mapping with confidence scoring
2. **Validation** - Field-level and lookup validation
3. **Export Options:**
   - **Export to API** - Row-by-row or bulk POST to configured endpoint
   - **Simulate Export** - Dry run with payload logging
   - **Download CSV** - Export validated data as CSV
4. **Error Handling** - Failed row tracking, error messages, retry functionality

### State Management Architecture

**Context Providers:**
- **`AppContext`** (`src/contexts/AppContext.tsx`) - Main application state (uploaded data, columns, UI state)
- **`EntityContext`** (`src/contexts/EntityContext.tsx`) - Entity detection results, fetched lookups, file hash tracking
- **`UserCacheContext`** (`src/contexts/UserCacheContext.tsx`) - User-specific caching

**Redux Store:**
- Export data persistence with Redux Persist
- Located in `src/store/index.ts`

**Session Storage:**
- Chat history
- Temporary UI state
- Entity detection results

**Lookup Cache (MongoDB):**
- Cached lookup data for validation
- Refresh capabilities via Lookups page
- Supports: chassis owners, container types, branches, TMS customers, etc.

### Key Architectural Components

**Entity Detection System:**
- AI-powered entity matching based on column analysis
- Specialized classification rules for Tariff vs Charge Profile entities
- Coverage statistics and confidence scoring
- Priority rules for disambiguation (Driver/Carrier/Load variants)

**Lookup System:**
- Dynamic lookup validation for any configured lookup
- MongoDB-based caching with refresh capabilities
- Lookup IDs automatically mapped to validation rules
- Field-level lookup validation via `entity_validations` table

**Chat Interface:**
- Intent detection and entity processing
- Natural language data modifications
- Validation and error suggestions
- Context-aware responses

## Important Configuration Files

**Database Configuration:**
- `sql/001_create_entities_tables.sql` - Entity table schema
- `sql/003_create_entity_fields_table.sql` - Field definitions schema
- `sql/003_create_entity_validations_table.sql` - Validation rules schema
- `src/lib/db.ts` - PostgreSQL connection pool

**AI Configuration:**
- `src/ai/genkit.ts` - AI provider initialization and configuration
- `src/ai/flows/` - All AI flow implementations

**State Management:**
- `src/contexts/AppContext.tsx` - Main application context
- `src/contexts/EntityContext.tsx` - Entity-specific state
- `src/store/index.ts` - Redux store configuration

**Legacy Configuration:**
- `exportEntities.json` - Legacy entity configuration (now migrated to PostgreSQL)

## Environment Setup

**Required Environment Variables:**
```env
# AI API Keys (at least one required)
GOOGLEAI_API_KEY=your_google_ai_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/portpro_data_bridge
MONGODB_URI=mongodb://localhost:27017/portpro-data-bridge

# NextAuth Configuration
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:9002

# Optional
REDIS_URL=redis://localhost:6379
AMQP_URL=amqp://localhost:5672
```

**Development Setup:**
1. `npm install` - Install dependencies
2. Create `.env.local` from `.env.example` template
3. Set up PostgreSQL database and run migration scripts
4. Set up MongoDB for lookup caching
5. Add at least one AI API key
6. `npm run dev` - Start development server on `http://localhost:9002`

**Database Setup:**
```bash
# PostgreSQL
psql -U postgres -d portpro_data_bridge -f sql/001_create_entities_tables.sql
psql -U postgres -d portpro_data_bridge -f sql/003_create_entity_fields_table.sql
psql -U postgres -d portpro_data_bridge -f sql/003_create_entity_validations_table.sql

# Or run complete migration
psql -U postgres -d portpro_data_bridge -f sql/COMPLETE_DATABASE_MIGRATION_FULL.sql
```

## Testing & Quality

- **Linting:** `npm run lint` for Next.js ESLint checks
- **Type Checking:** `npm run typecheck` for TypeScript validation
- **Code Quality:** Follow existing patterns in ShadCN UI components and TypeScript conventions
- **No custom test framework** currently implemented

## Key Development Patterns

**Component Structure:**
- UI components in `src/components/ui/` (ShadCN)
- Dialog components in `src/components/dialogs/`
- Custom hooks in `src/hooks/`
- Utility functions in `src/utils/` and `src/lib/`

**AI Flow Pattern:**
- Each AI flow is a separate module in `src/ai/flows/`
- Flows use Genkit for AI provider abstraction
- Input/output validation with Zod schemas
- Standardized error handling and response formats
- Prompt definitions using `ai.definePrompt()`

**Data Processing Pattern:**
- Hybrid approach: direct normalized matching + AI fallback
- Validation against PostgreSQL field definitions
- Lookup validation against MongoDB cache
- Row-level error tracking with user-friendly messages
- Export with comprehensive error reporting and retry functionality

**Database Access Pattern:**
- PostgreSQL: Use `query`, `queryRows`, `queryRow` helpers from `src/lib/db.ts`
- MongoDB: Use Mongoose models with connection via `mongoose.connect()`
- Always handle connection errors gracefully
- Use transactions for multi-table operations

**API Route Pattern:**
- Input validation with Zod or manual checks
- Standardized response format: `{ success: boolean, data?: any, error?: { message: string } }`
- Error handling with try-catch blocks
- Type-safe request/response handling

## Migration Notes

The application has undergone a significant migration from file-based configuration (`exportEntities.json`) to PostgreSQL-based dynamic entity management:

**What Changed:**
- Entity definitions now stored in PostgreSQL `entities` table
- Field configurations in `entity_fields` table with full data type and constraint support
- Validation rules in `entity_validations` table with lookup, pattern, and range validations
- Admin UI for managing entities, fields, and validations
- Backward compatibility maintained with MongoDB lookup caching

**Legacy Components:**
- `exportEntities.json` - No longer primary source of truth (kept for backward compatibility)
- `src/lib/models/entity.ts` - MongoDB model (now used only for lookup caching)

This architecture enables fully dynamic entity support, robust AI-powered data processing, and comprehensive error handling without requiring code changes for new entities, fields, or validation rules.
