# Entity-Specific Data Transformations

This document details how different entity types are transformed during the data mapping process. Each entity has unique requirements and business logic.

## Entity Transformation Overview

```mermaid
graph TD
    A[Raw Data Row] --> B{Determine Entity Type}

    B -->|Load| C[Load Entity Transform]
    B -->|Organization| D[Organization Entity Transform]
    B -->|Charge Profile| E[Charge Profile Entity Transform]
    B -->|Users| F[Users Entity Transform]
    B -->|Drivers| G[Drivers Entity Transform]
    B -->|Trucks/Trailers| H[Equipment Entity Transform]
    B -->|Tariff| I[Tariff Entity Transform]
    B -->|People| J[People Entity Transform]

    C --> K[Apply Common Post-Processing]
    D --> K
    E --> K
    F --> K
    G --> K
    H --> K
    I --> K
    J --> K

    K --> L[Final API Payload]
```

## Load Entity Transformation

The Load entity requires special handling for logistics data with complex field relationships.

### Load Transformation Flow

```mermaid
graph TD
    A[Load Raw Data] --> B[Field Name Mapping]
    B --> C[Convert Load Type to Uppercase]
    C --> D[Handle Customer Mapping]
    D --> E[Process Location Arrays]
    E --> F[Convert Date Fields]
    F --> G[Handle Single Value Fields]
    G --> H[Final Load Payload]

    subgraph "Special Field Mappings"
        I[CUSTOMER → caller]
        J[Delivery City/State → consignee]
        K[Pick Up Location → shipper array]
        L[Container Return → return single]
    end

    D --> I
    D --> J
    E --> K
    G --> L
```

### Key Load Transformations

```typescript
// Type conversion
if (mappedItem.type_of_load) {
  mappedItem.type_of_load = mappedItem.type_of_load.toUpperCase();
}

// Array conversions for locations
if (mappedItem.shipper) {
  mappedItem.shipper = Array.isArray(mappedItem.shipper)
    ? mappedItem.shipper
    : [mappedItem.shipper];
}

// Single value fields
const singleValueFields = ['chassisPick', 'chassisTermination', 'return', 'caller'];
```

## Organization Entity Transformation

Organizations require complex address handling and credential generation.

### Organization Transformation Flow

```mermaid
graph TD
    A[Organization Data] --> B[Auto-Generate Credentials]
    B --> C[Build Address Object]
    C --> D[Transform Customer Type]
    D --> E[Handle Branch Arrays]
    E --> F[Process Payment Terms]
    F --> G[Clean Up Location Fields]
    G --> H[Final Organization Payload]

    subgraph "Address Building"
        I[Street Address]
        J[Building/Suite]
        K[City, State, Zip]
        L[Country]
        M[Lat/Lng Coordinates]
    end

    C --> I
    C --> J
    C --> K
    C --> L
    C --> M
```

### Organization Address Construction

```mermaid
sequenceDiagram
    participant TD as Transform Data
    participant AB as Address Builder
    participant GEO as Geocoding

    TD->>AB: Raw Address Fields
    AB->>AB: Extract Street Address
    AB->>AB: Combine Building/Suite
    AB->>AB: Build Address Parts Array
    AB->>AB: Create Combined Address
    AB->>GEO: Get Coordinates (if available)
    GEO-->>AB: Lat/Lng
    AB->>TD: Complete Address Object
```

## Charge Profile Entity Transformation

The most complex transformation, creating nested charge templates with rules and events.

### Charge Profile Architecture

```mermaid
graph TD
    A[Charge Profile Data] --> B[Basic Template Fields]
    A --> C[Vendor Processing]
    A --> D[Rules Generation]
    A --> E[Event Processing]
    A --> F[Charges Array]

    B --> G[name, chargeName, unitOfMeasure]
    C --> H[Driver Groups, Carrier Groups]
    D --> I[CSV Rules Mapping]
    E --> J[By Event, By Move, By Leg]
    F --> K[Amount, Free Units, Dates]

    G --> L[Final Charge Template]
    H --> L
    I --> L
    J --> L
    K --> L
```

### Event Rule Processing

```mermaid
graph TD
    A[Event Fields] --> B{Event Type}

    B -->|By Move| C[Event + Event Time]
    B -->|By Event| D[Event Only]
    B -->|Between Status| E[From/To Events]
    B -->|By Leg| F[Leg Events + Locations]

    C --> G[eventLocationRules Array]
    D --> H[eventLocationRule Object]
    E --> I[fromEvent/toEvent Objects]
    F --> J[fromLegs/toLegs + Profiles]

    G --> K[Charge Template Rules]
    H --> K
    I --> K
    J --> K
```

### Rule Generation Logic

The system converts CSV rule fields into complex nested rule structures:

```mermaid
graph LR
    A[CSV Rule Fields] --> B[Rule Builder]
    B --> C{Rule Type}

    C -->|Zip Code| D[Zip Code Rules]
    C -->|Load Type| E[Load Type Rules]
    C -->|Customer| F[Customer Rules]
    C -->|City State| G[City State Rules]

    D --> H[ANY_IN / NOT_IN Operators]
    E --> H
    F --> H
    G --> H

    H --> I[Final Rules Array]
```

## Users Entity Transformation

Users require role formatting and terminal handling.

### Users Transformation Flow

```mermaid
graph TD
    A[Users Data] --> B[Format Role Arrays]
    B --> C[Process Terminals JSON]
    C --> D[Handle Custom Roles]
    D --> E[Clean Array Elements]
    E --> F[Final Users Payload]

    subgraph "Role Processing"
        G[String Roles] --> H[Split by Comma]
        H --> I[Trim Whitespace]
        I --> J[Role Array]
    end

    B --> G

    subgraph "Terminal Processing"
        K[Terminal Array] --> L[Clean Elements]
        L --> M[Remove Quotes/Brackets]
        M --> N[JSON Stringify]
    end

    C --> K
```

## Drivers Entity Transformation

Drivers need profile type arrays and hazmat boolean conversion.

### Drivers Processing

```mermaid
graph TD
    A[Driver Data] --> B[Ensure Profile Type Array]
    B --> C[Handle External System ID]
    C --> D[Convert Hazmat Boolean]
    D --> E[Final Driver Payload]

    subgraph "Hazmat Conversion"
        F[String/Number Input] --> G{Check Value}
        G -->|'true', 'yes', 't', '1'| H[true]
        G -->|Other| I[false]
        G -->|Empty/Null| J[true - default]
    end

    D --> F
```

## Equipment Entities (Trucks/Trailers)

Equipment entities share common patterns with type-specific differences.

### Equipment Transformation

```mermaid
graph TD
    A[Equipment Data] --> B{Equipment Type}

    B -->|Truck| C[Set equipment_type = 'TRUCK']
    B -->|Trailer| D[Set equipment_type = 'TRAILER']

    C --> E[Common Equipment Processing]
    D --> F[Handle Trailer Type Field]
    F --> E

    E --> G[Date Field Conversion]
    G --> H[License Plate Formatting]
    H --> I[Final Equipment Payload]
```

## Tariff Entity Transformation

Tariffs create complex rate structures with customer and location relationships.

### Tariff Structure Building

```mermaid
graph TD
    A[Tariff Data] --> B[Basic Tariff Info]
    A --> C[Customer Processing]
    A --> D[Location Processing]
    A --> E[Charge Group Building]

    B --> F[Name, Description, Dates]
    C --> G[Customer Profile Objects]
    D --> H[Pickup/Delivery/Return Locations]
    E --> I[Charge Profile Matching]

    F --> J[Final Tariff Object]
    G --> J
    H --> J
    I --> J

    subgraph "Charge Group Structure"
        K[Bill To: Match Customer]
        L[One Off Charges: Empty]
        M[Charge Profiles: From CSV]
        N[Charge Profile Groups: Empty]
    end

    E --> K
    E --> L
    E --> M
    E --> N
```

## People Entity Transformation

People entities handle customer permissions and mobile number formatting.

### People Processing Flow

```mermaid
graph TD
    A[People Data] --> B[Transform Permissions]
    B --> C[Format Mobile Numbers]
    C --> D[Set Customer Flag]
    D --> E[Final People Payload]

    subgraph "Permission Transformation"
        F[Individual Boolean Fields] --> G[Generic Permissions Utility]
        G --> H[Consolidated Permission Object]
    end

    B --> F

    subgraph "Mobile Number Formatting"
        I[String/Array Input] --> J[Normalize to Array]
        J --> K[Wrap in Label/Mobile Objects]
    end

    C --> I
```

## Common Post-Processing

All entities go through common post-processing steps:

### Date Conversion

```mermaid
graph TD
    A[Entity Data] --> B[Check Entity Date Config]
    B --> C{Has Date Fields?}
    C -->|Yes| D[Apply Date Conversions]
    C -->|No| E[Skip Date Processing]
    D --> F[Continue Processing]
    E --> F
```

### Null Value Filtering

```mermaid
graph TD
    A[Transformed Data] --> B{Entity Requires Filtering?}
    B -->|Yes| C[Filter Null Values Recursively]
    B -->|No| D[Keep All Values]
    C --> E[Remove Undefined Results]
    E --> F[Final Clean Data]
    D --> F
```

### Location Auto-Fill

For specific entities (Truck Owner, Carrier):

```mermaid
sequenceDiagram
    participant TE as Transform Engine
    participant GEO as Geocoding API
    participant FB as Fallback Data

    TE->>GEO: Request Location Details
    alt API Success
        GEO-->>TE: Lat/Lng + Address Details
        TE->>TE: Structure Address Object
    else API Failure
        TE->>FB: Use Hardcoded Fallbacks
        FB-->>TE: Default Location Data
    end
    TE->>TE: Clean Up Flat Properties
```

## Transformation Error Handling

Each transformation step includes error handling:

```mermaid
graph TD
    A[Start Transformation] --> B[Try Transform Step]
    B --> C{Error Occurred?}
    C -->|No| D[Continue to Next Step]
    C -->|Yes| E[Log Error Details]
    E --> F[Use Fallback Values]
    F --> G[Mark Row with Warning]
    D --> H{More Steps?}
    G --> H
    H -->|Yes| B
    H -->|No| I[Complete Transformation]
```

## Field Mapping Reference

### Common Field Types

| UI Field Type | API Transformation | Example |
|---------------|-------------------|---------|
| Text | Direct mapping | `"ACME Corp"` → `"ACME Corp"` |
| Lookup | ID resolution | `"ACME Corp"` → `"64f7a123..."` |
| Date | ISO formatting | `"12/25/2023"` → `"2023-12-25T00:00:00.000Z"` |
| Boolean | String to boolean | `"Yes"` → `true` |
| Array | CSV to array | `"A,B,C"` → `["A","B","C"]` |
| Address | Object structure | Multiple fields → `{address, lat, lng, city, state}` |

### Entity-Specific Mappings

Each entity may override or extend these basic transformations with business logic specific to their domain requirements.

## Related Files

- `src/utils/fieldMapper.ts` - Main transformation logic
- `src/hooks/useExport.ts` - Export orchestration
- `exportEntities.json` - Field configuration
- `src/utils/permissions.ts` - Permission transformations
- `src/utils/dateConverter.ts` - Date conversion utilities