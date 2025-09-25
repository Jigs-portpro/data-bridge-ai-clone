# Base URLs Admin Setup

## Quick Setup Instructions

### 1. Set Environment Variable
Add your PostgreSQL connection string to your `.env.local` file:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
```

### 2. Create Table and Seed Data
Run the SQL files manually in your PostgreSQL database:

```bash
# Create the table
psql $DATABASE_URL -f sql/001_create_base_urls.sql

# Seed initial data
psql $DATABASE_URL -f sql/002_seed_base_urls.sql
```

### 3. Test the Implementation

**API Endpoints:**
- GET `/api/admin/base-urls` - List all base URLs
- POST `/api/admin/base-urls` - Create new base URL
- GET `/api/admin/base-urls/[id]` - Get single base URL
- PUT `/api/admin/base-urls/[id]` - Update base URL
- DELETE `/api/admin/base-urls/[id]` - Delete base URL

**Admin UI:**
- Visit `/admin/base-urls` - Main listing page
- Visit `/admin/base-urls/new` - Create new base URL
- Visit `/admin/base-urls/[id]/edit` - Edit existing base URL

### 4. Test API Manually (Optional)

```bash
# Test GET all base URLs
curl http://localhost:9002/api/admin/base-urls

# Test POST create new base URL
curl -X POST http://localhost:9002/api/admin/base-urls \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test API",
    "url": "https://api.test.com",
    "description": "Test environment",
    "is_active": true
  }'
```

## What's Implemented

✅ **Database Layer**
- PostgreSQL connection with connection pooling
- Base URLs table with proper schema
- Seed data with current exportEntities.json URL

✅ **API Layer**
- Full CRUD operations
- Proper error handling and validation
- TypeScript types for all endpoints

✅ **Admin UI**
- Responsive listing page with cards
- Create/edit forms with validation
- Delete confirmation
- Active/inactive toggle
- Uses existing ShadCN UI components

✅ **Features**
- URL validation
- Duplicate name prevention
- Auto-updating timestamps
- Proper error messages
- Loading states

## File Structure Created

```
sql/
├── 001_create_base_urls.sql
└── 002_seed_base_urls.sql

src/
├── lib/
│   └── db.ts
├── types/
│   └── baseUrls.ts
├── app/
│   ├── admin/base-urls/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/edit/page.tsx
│   └── api/admin/base-urls/
│       ├── route.ts
│       └── [id]/route.ts
```

## Next Steps

1. Test all functionality thoroughly
2. Add navigation to the admin section (link from main menu)
3. Consider adding authentication/authorization for admin routes
4. Once this works well, proceed with entities and fields tables

That's it! The Base URLs admin system is complete and ready to test.