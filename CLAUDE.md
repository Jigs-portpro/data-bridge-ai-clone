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

## High-Level Architecture

### Core Technology Stack
- **Framework:** Next.js 15.2.3 with App Router
- **Language:** TypeScript
- **UI:** ShadCN UI components with Tailwind CSS
- **AI Integration:** Google Genkit with support for Google AI, OpenAI, and Anthropic models
- **State Management:** Redux Toolkit with Redux Persist
- **Authentication:** NextAuth.js
- **Data Storage:** MongoDB for data persistence and session management
- **File Processing:** Custom Excel/CSV parsing with `xlsx` library

### AI-Powered Data Processing Pipeline
The application centers around intelligent data processing with multiple AI flows:

**Key AI Flows (located in `src/ai/flows/`):**
- `auto-column-mapping.ts` - Hybrid AI/direct matching for column mapping
- `data-correction-suggestions.ts` - AI-powered data quality improvements
- `data-enrichment.ts` - Natural language data enhancement
- `duplicate-detection.ts` - Fuzzy matching for duplicate identification
- `anomaly-report.ts` - Statistical anomaly detection
- `intelligent-column-reordering.ts` - Logic-based column organization
- `chat-interface-updates/` - Complete chat-based data interaction system

**AI Provider Configuration:**
- Multi-provider support: Google AI (primary), OpenAI, Anthropic
- Provider selection managed in `src/ai/genkit.ts`
- Runtime model switching via AI Settings page
- Requires at least one API key: `GOOGLEAI_API_KEY`, `OPENAI_API_KEY`, or `ANTHROPIC_API_KEY`

### Data Flow Architecture

**Upload & Processing:**
1. File upload supports CSV/Excel with multi-sheet detection
2. Data preview in sortable/filterable table (`DataTable` component)
3. AI-powered processing tools available via sidebar
4. Chat interface for natural language data manipulation

**Entity Configuration System:**
- Dynamic entity definitions in `exportEntities.json`
- Configurable field validation with lookup support
- API endpoint mapping per entity
- Supports both single-row and bulk upload types

**Validation & Export Pipeline:**
1. AI auto-mapping with confidence scoring
2. Dynamic lookup validation against cached data
3. Row-by-row API export with error handling
4. Failed row tracking and retry functionality

### State Management Pattern
- **Global State:** Redux store with persistence for export data
- **Local State:** React Context (`AppContext`) for UI state
- **Session Storage:** Used for temporary data like chat history
- **Lookup Cache:** MongoDB-based caching for validation data

### Key Architectural Components

**Context System:**
- `AppContext` - Main application state (data, columns, UI state)
- `EntityContext` - Entity-specific configurations and validation

**Lookup System:**
- Dynamic lookup validation supporting any configured lookup
- Cached lookup data in MongoDB with refresh capabilities
- Lookup IDs: `chassisOwners`, `containerTypes`, `branches`, `tmsCustomers`, etc.

**Chat Interface Architecture:**
- Modular chat system in `src/ai/flows/chat-interface-updates/`
- Intent detection, entity processing, and response generation
- Data validation and modification capabilities
- User-friendly error handling and suggestions

## Important Configuration Files

- `exportEntities.json` - Core entity configurations for the entire system
- `src/ai/genkit.ts` - AI provider initialization and configuration
- `src/contexts/AppContext.tsx` - Main application context with all state management
- `src/store/index.ts` - Redux store configuration with persistence

## Environment Setup

**Required Environment Variables:**
- At least one AI API key: `GOOGLEAI_API_KEY`, `OPENAI_API_KEY`, or `ANTHROPIC_API_KEY`
- MongoDB connection string (if using external database)

**Development Setup:**
1. `npm install` - Install dependencies
2. Create `.env.local` with required API keys
3. Ensure `exportEntities.json` exists in project root
4. `npm run dev` - Start development server on `http://localhost:9002`

## Testing & Quality

- **No custom test framework** - This project doesn't include custom tests
- **Linting:** Use `npm run lint` for Next.js ESLint checks
- **Type Checking:** Use `npm run typecheck` for TypeScript validation
- **Code Quality:** Follow existing patterns in ShadCN UI components and TypeScript conventions

## Key Development Patterns

**Component Structure:**
- UI components in `src/components/ui/` (ShadCN)
- Dialog components in `src/components/dialogs/`
- Custom hooks in `src/hooks/`
- Utility functions in `src/utils/` and `src/lib/`

**AI Flow Pattern:**
- Each AI flow is a separate module in `src/ai/flows/`
- Flows use Genkit for AI provider abstraction
- Input validation with Zod schemas
- Standardized error handling and response formats

**Data Processing Pattern:**
- Hybrid approach: direct matching + AI fallback
- Validation against dynamic lookup data
- Row-level error tracking with user-friendly messages
- Export with comprehensive error reporting and retry functionality

This architecture enables fully dynamic entity support, robust AI-powered data processing, and comprehensive error handling without requiring code changes for new entities or lookups.