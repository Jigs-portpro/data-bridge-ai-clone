# PortPro Data Bridge - Intelligent Data Processing Platform

PortPro Data Bridge is an AI-powered data processing platform built with Next.js that enables intelligent data upload, validation, enrichment, and export to target APIs. The platform features dynamic entity management, AI-driven column mapping, comprehensive validation workflows, and natural language data manipulation.

## 🚀 Key Features

### Dynamic Entity Management
- **PostgreSQL-Based Configuration**: All entity definitions, field configurations, and validation rules stored in PostgreSQL for complete flexibility
- **Admin UI**: Comprehensive admin interface for managing entities, fields, and validations without code changes
- **Upload Types**: Support for both `SINGLE_ROW_UPLOAD` (row-by-row POST) and `BULK_UPLOAD` (batch processing)
- **Zero Code Changes**: Add new entities, fields, or validation rules through the UI

### AI-Powered Intelligence

#### Entity Detection
- Automatically detects the best matching entity based on uploaded data columns
- Specialized classification for complex entities (Tariffs, Charge Profiles, etc.)
- Coverage statistics and confidence scoring
- Detailed reasoning for entity matches

#### Column Mapping
- **Hybrid Approach**: Direct normalized matching for exact matches + AI for ambiguous cases
- Confidence scoring for each mapped field
- Manual override capabilities
- Handles camelCase, snake_case, spaces, and common abbreviations

#### Data Processing Tools
- **Data Correction**: AI-powered suggestions for casing, formatting, and data quality issues
- **Data Enrichment**: Natural language instructions to enhance data (add columns, standardize values)
- **Duplicate Detection**: Fuzzy matching to identify potential duplicates
- **Anomaly Detection**: Statistical analysis to flag data anomalies
- **Address Processing**: Clean, standardize, and geocode addresses with AI
- **Chat Interface**: Natural language data manipulation and querying

### Advanced Validation System
- **Field-Level Validation**: Data type, required, minLength, maxLength, min/max value, regex patterns
- **Lookup Validation**: Validate fields against cached lookup data (chassis owners, container types, branches, etc.)
- **Dynamic Lookups**: Any lookup configured in the system is automatically supported
- **Real-Time Feedback**: Validation errors with detailed, user-friendly messages
- **Pre-Export Validation**: Catch errors before API submission

### Export & Error Handling
- **Multiple Export Options**:
  - Export to API (row-by-row or bulk)
  - Simulate export (dry run with payload logging)
  - Download as CSV
- **Comprehensive Error Tracking**: Failed rows captured with detailed error messages
- **Retry Functionality**: Retry only failed rows with one click
- **Export Summary**: Success/failure counts and detailed error reports
- **Failed Row CSV**: Download failed rows with error column for correction

### User Experience Features
- **File Upload**: CSV and Excel (.xls, .xlsx) with multi-sheet support
- **Data Preview**: Sortable, filterable table with search
- **AI Provider Selection**: Choose between Google AI (Gemini), OpenAI (GPT), or Anthropic (Claude)
- **Model Configuration**: Select specific models per provider
- **Lookup Management**: Fetch, cache, and refresh lookup data from external APIs
- **API Token Management**: Store and manage authentication tokens
- **Responsive UI**: Modern interface built with ShadCN UI and Tailwind CSS

## 🛠️ Tech Stack

### Core Technologies
- **Framework**: Next.js 15.2.3 with App Router
- **Language**: TypeScript
- **UI**: ShadCN UI components + Tailwind CSS
- **AI Integration**: Google Genkit with multi-provider support
  - Google AI (Gemini models)
  - OpenAI (GPT models)
  - Anthropic (Claude models)

### State Management
- **Redux Toolkit** with Redux Persist
- **React Context**: AppContext, EntityContext, UserCacheContext
- **Session Storage**: Temporary state and chat history

### Databases
- **PostgreSQL**: Primary configuration store
  - Entity definitions
  - Field configurations
  - Validation rules
  - Base URLs
- **MongoDB**: Caching and sessions
  - Lookup data caching
  - NextAuth session management

### Additional Libraries
- **File Processing**: `xlsx` for Excel, custom CSV parser
- **Authentication**: NextAuth.js
- **Forms**: React Hook Form
- **Validation**: Zod schemas
- **HTTP Client**: Axios
- **Fuzzy Matching**: Fuse.js
- **Date Handling**: date-fns, moment, moment-timezone
- **UI Components**: Recharts, lucide-react

## 📋 Prerequisites

- [Node.js](https://nodejs.org/) v18.x or later
- [PostgreSQL](https://www.postgresql.org/) 12 or later
- [MongoDB](https://www.mongodb.com/) 4.4 or later
- npm or yarn

## 🔧 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd portpro-data-bridge-ai
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Set Up Environment Variables
Create a `.env.local` file in the project root:

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

# Optional Services
REDIS_URL=redis://localhost:6379
AMQP_URL=amqp://localhost:5672

# Email Configuration (for export notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=your_email@gmail.com
```

**Important**: After adding or changing API keys, restart your Next.js development server.

### 4. Set Up Databases

#### PostgreSQL Setup
```bash
# Create database
createdb portpro_data_bridge

# Run migrations (choose one approach)

# Option 1: Individual scripts
psql -U postgres -d portpro_data_bridge -f sql/001_create_entities_tables.sql
psql -U postgres -d portpro_data_bridge -f sql/003_create_entity_fields_table.sql
psql -U postgres -d portpro_data_bridge -f sql/003_create_entity_validations_table.sql

# Option 2: Complete migration (recommended)
psql -U postgres -d portpro_data_bridge -f sql/COMPLETE_DATABASE_MIGRATION_FULL.sql
```

#### MongoDB Setup
MongoDB will be used automatically for lookup caching. No schema setup required.

### 5. Start Development Server
```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:9002`

### 6. (Optional) Start Genkit Dev Server
For AI flow debugging and inspection:
```bash
npm run genkit:dev
# or
yarn genkit:dev
```

Genkit Developer UI will be available at `http://localhost:4000`

## 📖 Usage Guide

### Initial Setup

1. **Configure AI Settings** (`/ai-settings`)
   - Select your preferred AI provider (Google AI, OpenAI, or Anthropic)
   - Choose a specific model
   - Settings are stored locally

2. **Manage Lookups** (`/lookups`)
   - Fetch and cache lookup datasets from external APIs
   - View cached data
   - Refresh when needed

3. **Set Up Entities** (`/admin/entities`)
   - Create entities with name, key, API endpoint, and upload type
   - Configure fields per entity (`/admin/entity-fields`)
   - Add validation rules (`/admin/entity-validations`)

4. **Configure Base URLs** (`/admin/base-urls`)
   - Set up API base URLs for different environments

5. **Manage API Tokens** (`/auth-token`)
   - Obtain and store bearer tokens for API authentication

### Data Processing Workflow

#### 1. Upload Data (`/`)
- Drag and drop or browse for CSV/Excel files
- For Excel, select the sheet to process
- Data appears in a sortable, filterable table

#### 2. Entity Detection (Automatic)
- AI analyzes your data columns
- Suggests the best matching entity
- Shows coverage statistics and confidence
- Option to manually select different entity

#### 3. Use AI Processing Tools (Sidebar)
- **Data Correction**: Fix casing, formatting issues
- **Data Enrichment**: Add columns or transform data with natural language
- **Duplicate Detection**: Find potential duplicates
- **Anomaly Report**: Identify statistical outliers
- **Address Processing**: Clean and geocode addresses
- **Chat Interface**: Ask questions or modify data conversationally

#### 4. Export Data (`/export-data`)

**A. Map Columns**
- Click "Auto-Map (AI)" for intelligent column mapping
- Review confidence scores
- Manually adjust mappings as needed

**B. Validate Data**
- Click "Validate Data"
- Review validation errors (field-level and lookup)
- Fix errors in source data or mappings

**C. Export Options**
- **Export to API**: Submit data to configured endpoint
  - Row-by-row for `SINGLE_ROW_UPLOAD`
  - Bulk array for `BULK_UPLOAD`
  - View success/failure summary
  - Download failed rows as CSV
  - Retry failed rows
- **Simulate Export**: Dry run with console logging
- **Download as CSV**: Export validated data

### Advanced Features

#### Chat Interface
Use natural language to:
- Query data: "How many rows have status pending?"
- Modify data: "Capitalize all customer names"
- Add columns: "Add a column for full address"
- Get insights: "Show me statistics for the price column"

#### Validation Rules
Configure per-field in `/admin/entity-validations`:
- **Data Type**: string, number, date, boolean
- **Required**: Mark fields as mandatory
- **Length Constraints**: minLength, maxLength
- **Value Constraints**: minValue, maxValue (for numbers)
- **Pattern Validation**: Regex patterns for format checking
- **Lookup Validation**: Validate against cached lookup datasets

#### Error Handling
- Validation errors shown before export
- API errors captured per row
- Failed rows displayed in table with error messages
- Download failed rows with error column
- Retry only failed rows

## 🏗️ Architecture Overview

### Database Schema

**PostgreSQL Tables:**
- `base_urls`: API base URL configurations
- `entities`: Entity definitions with upload types
- `entity_fields`: Field configurations per entity
- `entity_validations`: Validation rules per field

**MongoDB Collections:**
- Lookup caches (chassis owners, container types, branches, etc.)
- NextAuth sessions

### AI Flows (`src/ai/flows/`)
- `entity-detection.ts`: Intelligent entity matching
- `auto-column-mapping.ts`: Hybrid AI/direct column mapping
- `data-correction-suggestions.ts`: Data quality improvements
- `data-enrichment.ts`: Natural language enhancements
- `duplicate-detection.ts`: Fuzzy duplicate detection
- `anomaly-report.ts`: Statistical anomaly detection
- `intelligent-column-reordering.ts`: Smart column ordering
- `process-address-flow.ts`: Address processing
- `data-modification.ts`: Natural language transformations
- `data-validation.ts`: AI-powered validation

### Key Pages
- `/` - Main data view (upload, preview, process)
- `/admin/entities` - Entity CRUD
- `/admin/entity-fields` - Field configuration
- `/admin/entity-validations` - Validation rules
- `/admin/base-urls` - Base URL management
- `/admin/cache-management` - Cache operations
- `/export-data` - Export workflow
- `/lookups` - Lookup management
- `/ai-settings` - AI configuration
- `/auth-token` - Token management
- `/login` - Authentication

### State Management
- **Context**: AppContext, EntityContext, UserCacheContext
- **Redux**: Export data persistence
- **Session Storage**: Chat history, temporary state

## 🔧 Available Scripts

```bash
# Development
npm run dev              # Start Next.js dev server (port 9002)
npm run genkit:dev       # Start Genkit dev server (port 4000)
npm run genkit:watch     # Start Genkit with watch mode

# Production
npm run build            # Build for production
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run typecheck        # Run TypeScript type checking
```

## 🗂️ Project Structure

```
portpro-data-bridge-ai/
├── src/
│   ├── ai/
│   │   ├── flows/           # AI flow implementations
│   │   └── genkit.ts        # AI provider config
│   ├── app/                 # Next.js App Router pages
│   │   ├── admin/           # Admin pages
│   │   ├── api/             # API routes
│   │   ├── ai-settings/     # AI configuration
│   │   ├── export-data/     # Export workflow
│   │   └── ...
│   ├── components/
│   │   ├── ui/              # ShadCN UI components
│   │   └── dialogs/         # Dialog components
│   ├── contexts/            # React Context providers
│   ├── hooks/               # Custom React hooks
│   ├── lib/
│   │   ├── db.ts            # PostgreSQL connection
│   │   └── models/          # MongoDB models
│   ├── store/               # Redux store
│   └── utils/               # Utility functions
├── sql/                     # PostgreSQL migrations
├── .env.example             # Environment template
├── CLAUDE.md                # AI assistant guidance
├── package.json
└── README.md
```

## 🔄 Migration from exportEntities.json

The application has migrated from file-based configuration to PostgreSQL:

**Before**: `exportEntities.json` file
**After**: PostgreSQL tables (`entities`, `entity_fields`, `entity_validations`)

**Benefits**:
- Dynamic configuration through admin UI
- No code changes for new entities
- Version control via database migrations
- Better data integrity and relationships

**Note**: `exportEntities.json` maintained for backward compatibility but no longer the primary source of truth.

## 🤝 Contributing

When contributing:
1. Follow existing code patterns
2. Use TypeScript strictly
3. Follow ShadCN UI component conventions
4. Run `npm run typecheck` before committing
5. Test AI flows with multiple providers when possible

## 📝 Notes

- **AI API Keys**: At least one AI provider API key is required (Google AI, OpenAI, or Anthropic)
- **Database Setup**: PostgreSQL must be running with migrations applied
- **MongoDB**: Used for lookup caching, must be accessible
- **Port**: Application runs on port 9002 by default
- **Genkit UI**: Useful for debugging AI flows during development

## 🐛 Troubleshooting

### AI Flows Not Working
- Verify at least one AI API key is set in `.env.local`
- Restart Next.js server after adding keys
- Check AI Settings page for correct provider selection

### Database Connection Errors
- Verify PostgreSQL is running: `psql -U postgres -l`
- Check `DATABASE_URL` in `.env.local`
- Ensure migrations have been run

### Lookup Validation Failing
- Verify MongoDB is running
- Check lookups have been fetched on `/lookups` page
- Refresh lookup data if stale

### Build Errors
- Run `npm run typecheck` to identify TypeScript issues
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`

## 📄 License

[Add your license information here]

## 👥 Maintainers

[Add maintainer information here]

---

For detailed architecture documentation and development guidelines, see [CLAUDE.md](./CLAUDE.md).
