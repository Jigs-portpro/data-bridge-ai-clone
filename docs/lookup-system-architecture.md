# Lookup System Architecture

This document explains the lookup validation system that converts human-readable display values to database IDs during the data export process.

## Overview

The lookup system is a critical component that ensures data integrity by validating user inputs against authoritative data sources and converting display names to the corresponding database IDs required by external APIs.

## Lookup System Flow

```mermaid
graph TD
    A[User Input: Display Value] --> B[Lookup Configuration]
    B --> C[Lookup Data Source]
    C --> D[Value Resolution]
    D --> E{Match Found?}
    E -->|Yes| F[Extract Database ID]
    E -->|No| G[Keep Original Value]
    F --> H[Use ID in API Call]
    G --> I[Potential API Error]

    subgraph "Lookup Sources"
        J[TMS Customers]
        K[Container Types]
        L[Branches]
        M[Driver Groups]
        N[Container Owners]
    end

    C --> J
    C --> K
    C --> L
    C --> M
    C --> N
```

## Lookup Configuration

### Entity Field Configuration

Each field that requires lookup validation is configured in `exportEntities.json`:

```json
{
  "name": "Customer",
  "sourceColumn": "caller",
  "type": "string",
  "required": true,
  "lookupValidation": {
    "lookupId": "tmsCustomers",
    "lookupField": "company_name"
  }
}
```

### Lookup Data Sources

The system maintains various lookup data sources:

```mermaid
graph TD
    A[Lookup Data Sources] --> B[TMS Customers]
    A --> C[Container Types]
    A --> D[Container Sizes]
    A --> E[Branches]
    A --> F[Driver Groups]
    A --> G[Carrier Groups]
    A --> H[Chassis Owners]
    A --> I[Container Owners]
    A --> J[Commodities]
    A --> K[Chassis Types]
    A --> L[Chassis Sizes]

    subgraph "Data Structure"
        M[_id: Database ID]
        N[name/company_name: Display Value]
        O[type: Entity Type]
        P[Additional Metadata]
    end

    B --> M
    B --> N
    B --> O
    B --> P
```

## Lookup Resolution Process

### Basic Lookup Flow

```mermaid
sequenceDiagram
    participant UI as User Interface
    participant FM as Field Mapper
    participant LS as Lookup Source
    participant API as External API

    UI->>FM: Submit Data with Display Values
    FM->>FM: Identify Lookup Fields
    loop For Each Lookup Field
        FM->>LS: Get Lookup Data
        LS-->>FM: Return Lookup Array
        FM->>FM: Search for Matching Value
        alt Match Found
            FM->>FM: Extract Database ID
        else No Match
            FM->>FM: Keep Original Value
        end
    end
    FM->>API: Send Transformed Data
```

### Multi-Value Lookup Resolution

For comma-separated values:

```mermaid
graph TD
    A[Input: 'ACME Corp, Beta Inc'] --> B[Split by Comma]
    B --> C[Trim Each Value]
    C --> D[Process Each Value]

    D --> E[Lookup 'ACME Corp']
    D --> F[Lookup 'Beta Inc']

    E --> G{Found ACME?}
    F --> H{Found Beta?}

    G -->|Yes| I[ID: 64f7a123...]
    G -->|No| J[Keep: ACME Corp]
    H -->|Yes| K[ID: 64f7b456...]
    H -->|No| L[Keep: Beta Inc]

    I --> M[Combine Results]
    J --> M
    K --> M
    L --> M

    M --> N[Final Array or Single Value]
```

## Lookup Data Sources Detail

### TMS Customers

Used for all customer-related fields:

```typescript
interface TMSCustomer {
  _id: string;
  company_name: string;
  type: string;
  address?: Address;
  city?: string;
  state?: string;
  country?: string;
  zip_code?: string;
}
```

### Container Types/Sizes/Owners

Used for container-related logistics data:

```typescript
interface ContainerLookup {
  _id: string;
  name: string;
  type?: string;
  company_name?: string; // For owners
}
```

### Branches/Terminals

Used for location-based fields:

```typescript
interface Branch {
  _id: string;
  name: string;
  type: 'terminal' | 'branch';
  address?: Address;
  timezone?: string;
}
```

### Driver/Carrier Groups

Used for charge profiles and user assignments:

```typescript
interface DriverGroup {
  _id: string;
  name: string;
  type: 'driver' | 'carrier';
  profiles?: Profile[];
}
```

## Special Lookup Handling

### "All" Values

The system handles special "All" values that represent all items in a lookup:

```mermaid
graph TD
    A[Input Value] --> B{Is 'All' Value?}
    B -->|Yes| C[Get All Lookup Values]
    B -->|No| D[Normal Lookup Process]

    C --> E[Extract All IDs]
    E --> F[Return Complete ID Array]

    D --> G[Search for Specific Match]
    G --> H{Found?}
    H -->|Yes| I[Return Single ID]
    H -->|No| J[Return Original Value]
```

Special "All" patterns recognized:
- `"all"`
- `"All Customers"`
- `"All Container Types"`
- `"All Driver Groups"`

### Fleet Owner Special Handling

Fleet Owners have special comma handling due to company names containing commas:

```mermaid
graph TD
    A[Fleet Owner Input] --> B{Contains Comma?}
    B -->|Yes| C[Treat as Single Entity Name]
    B -->|No| D[Normal Processing]

    C --> E[Search by Exact Match]
    E --> F{Found?}
    F -->|Yes| G[Return ID]
    F -->|No| H[Return Original]

    D --> I[Standard Lookup Process]
```

## Lookup Key Mapping

The system uses a lookup key mapper to handle different naming conventions:

```typescript
const LookupKeyMapper: Record<string, string> = {
  'tmsCustomers': 'customers',
  'containerTypes': 'containerTypes',
  'branches': 'branches',
  'driverGroups': 'driverGroups',
  'fleetOwners': 'fleetTruckOwners'
};
```

This allows flexible configuration while maintaining consistent internal naming.

## Validation-Only Fields

Some fields are validated against lookups but keep their original values:

```mermaid
graph TD
    A[Validation-Only Field] --> B[Check Against Lookup]
    B --> C{Value Exists?}
    C -->|Yes| D[Keep Original Value]
    C -->|No| E[Set to Null/Remove]

    subgraph "Validation-Only Fields"
        F[chassisNo]
        G[Custom Validation Fields]
    end
```

Example: `chassisNo` field is validated to ensure the chassis exists but the original chassis number is kept in the payload.

## Lookup Data Caching

### Redis-Based Caching

```mermaid
graph TD
    A[Lookup Request] --> B[Check Redis Cache]
    B --> C{Cache Hit?}
    C -->|Yes| D[Return Cached Data]
    C -->|No| E[Fetch from Database]
    E --> F[Store in Redis]
    F --> G[Return Fresh Data]

    subgraph "Cache Configuration"
        H[TTL: 1 Hour]
        I[Auto-Refresh on Update]
        J[Cache Key Strategy]
    end
```

### Cache Refresh Strategy

```mermaid
sequenceDiagram
    participant UI as Admin Interface
    participant API as Lookup API
    participant CACHE as Redis Cache
    participant DB as Database

    UI->>API: Add/Update Lookup Data
    API->>DB: Persist Changes
    API->>CACHE: Invalidate Related Keys
    CACHE-->>API: Confirmation
    API-->>UI: Success Response

    Note over CACHE: Next request will fetch fresh data
```

## Error Handling

### Lookup Resolution Errors

```mermaid
graph TD
    A[Lookup Attempt] --> B{Data Source Available?}
    B -->|No| C[Log Warning]
    B -->|Yes| D[Search for Value]

    C --> E[Keep Original Value]

    D --> F{Match Found?}
    F -->|Yes| G[Return ID]
    F -->|No| H[Log Missing Value]

    H --> I{Required Field?}
    I -->|Yes| J[Add to Validation Errors]
    I -->|No| K[Keep Original Value]

    G --> L[Success Path]
    E --> L
    K --> L
    J --> M[Block Export]
```

### Fallback Strategies

1. **Keep Original Value**: For optional fields or when lookup data is unavailable
2. **Use Empty/Null**: For non-critical fields that can be empty
3. **Block Export**: For required fields that must have valid lookups
4. **User Correction**: Highlight invalid values for user review

## Performance Optimization

### Batch Lookup Processing

```mermaid
graph TD
    A[Multiple Rows with Lookups] --> B[Collect All Lookup Values]
    B --> C[Group by Lookup Source]
    C --> D[Batch Process Each Source]
    D --> E[Build Value → ID Map]
    E --> F[Apply to All Rows]

    subgraph "Before Optimization"
        G[Row 1: Lookup Customer]
        H[Row 2: Lookup Same Customer]
        I[Row 3: Lookup Different Customer]
    end

    subgraph "After Optimization"
        J[Batch: All Customer Lookups]
        K[Single Map Creation]
        L[Apply to All Rows]
    end
```

### Lookup Data Preloading

```mermaid
sequenceDiagram
    participant APP as Application
    participant CACHE as Cache Manager
    participant DB as Database

    APP->>CACHE: Request All Lookup Sources
    CACHE->>DB: Fetch TMS Customers
    CACHE->>DB: Fetch Container Types
    CACHE->>DB: Fetch Branches
    CACHE->>DB: Fetch Driver Groups

    par Parallel Loading
        DB-->>CACHE: Customers Data
        DB-->>CACHE: Container Data
        DB-->>CACHE: Branch Data
        DB-->>CACHE: Group Data
    end

    CACHE-->>APP: All Lookup Data Ready

    Note over APP: Export process can begin
```

## Lookup System Configuration

### Adding New Lookup Sources

To add a new lookup source:

1. **Add to Lookup Key Mapper**:
```typescript
const LookupKeyMapper = {
  'newLookupType': 'internalSourceName'
};
```

2. **Configure in Entity Fields**:
```json
{
  "lookupValidation": {
    "lookupId": "newLookupType",
    "lookupField": "fieldToMatch"
  }
}
```

3. **Implement Data Source**:
```typescript
const newLookupSource = {
  getData: () => fetchFromAPI(),
  field: 'name',
  name: 'Display Name'
};
```

### Lookup Field Matching Strategy

The system tries multiple field matching strategies:

```mermaid
graph TD
    A[Input Value] --> B[Try lookupField Match]
    B --> C{Found?}
    C -->|Yes| D[Return Match]
    C -->|No| E[Try 'name' Field]
    E --> F{Found?}
    F -->|Yes| G[Return Match]
    F -->|No| H[Try 'company_name' Field]
    H --> I{Found?}
    I -->|Yes| J[Return Match]
    I -->|No| K[No Match Found]
```

This flexible matching ensures compatibility with various data source structures.

## Related Files

- `src/hooks/useExport.ts` - Main lookup processing logic
- `src/utils/fieldMapper.ts` - Lookup field transformation
- `src/lib/constants/index.ts` - Lookup key mappings
- `src/contexts/AppContext.tsx` - Lookup data management
- `exportEntities.json` - Lookup configuration