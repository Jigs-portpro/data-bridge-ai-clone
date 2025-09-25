# Data Mapping and API Flow Documentation

This document explains how data flows from the user interface through validation, mapping, and transformation to external API calls in the PortPro Data Bridge AI system.

## Overview

The system processes uploaded data through a sophisticated pipeline that validates, transforms, and maps data to external API endpoints. The process ensures data integrity while handling different entity types with their specific requirements.

## High-Level Architecture Flow

```mermaid
graph TD
    A[User Uploads Data] --> B[Data Preview & Validation]
    B --> C[Column Mapping via AI]
    C --> D[Field Validation & Lookup Resolution]
    D --> E[Entity-Specific Transformation]
    E --> F[API Payload Construction]
    F --> G[External API Call]
    G --> H{Response}
    H -->|Success| I[Remove Exported Data]
    H -->|Error| J[Highlight Failed Rows]
    I --> K[Update UI State]
    J --> K
```

## Core Components

### 1. Entity Configuration System

The `exportEntities.json` file serves as the central configuration for all supported entities:

- **Field Definitions**: Maps UI field names to API field names via `sourceColumn`
- **Validation Rules**: Data types, patterns, required fields, min/max lengths
- **Lookup Relationships**: Defines which fields need ID resolution
- **API Endpoints**: Entity-specific URLs and upload types

### 2. Data Transformation Pipeline

The transformation occurs in multiple stages through the `useExport` hook and `fieldMapper` utility.

## Detailed Process Flow

### Stage 1: Data Collection and Validation

```mermaid
sequenceDiagram
    participant UI as User Interface
    participant AC as AppContext
    participant ED as Export Data Slice
    participant VH as Validation Handler

    UI->>AC: Upload CSV/Excel File
    AC->>AC: Parse and Store Raw Data
    UI->>VH: Trigger Validation
    VH->>VH: Apply Field Mappings
    VH->>VH: Perform Lookup Validation
    VH->>ED: Store Validation Results
    ED->>UI: Update Validation State
```

### Stage 2: Field Mapping and Transformation

```mermaid
graph TD
    subgraph "Field Mapping Process"
        A[Raw Data Row] --> B[Apply Field Mappings]
        B --> C[Process Lookup Fields]
        C --> D[Entity-Specific Transformations]
        D --> E[Data Type Conversions]
        E --> F[Validation Cleanup]
        F --> G[Final Payload Row]
    end

    subgraph "Lookup Resolution"
        H[Display Value] --> I[Find in Lookup Data]
        I --> J{Found?}
        J -->|Yes| K[Use Database ID]
        J -->|No| L[Keep Original Value]
    end

    C --> H
    K --> D
    L --> D
```

### Stage 3: Entity-Specific Processing

Different entities require different transformation logic:

```mermaid
graph TD
    A[Transformed Data] --> B{Entity Type}

    B -->|Load| C[Load Processing]
    B -->|Organization| D[Organization Processing]
    B -->|Charge Profile| E[Charge Profile Processing]
    B -->|Users| F[Users Processing]
    B -->|Others| G[Standard Processing]

    C --> H[Convert to Arrays<br/>Handle Date Formats<br/>Map Special Fields]
    D --> I[Build Address Object<br/>Generate Email/Password<br/>Handle Branch Arrays]
    E --> J[Create Nested Payload<br/>Build Rules & Events<br/>Process Charges]
    F --> K[Format Role Arrays<br/>Handle Terminals JSON<br/>Process Custom Roles]
    G --> L[Apply Standard Mappings]

    H --> M[Final Payload]
    I --> M
    J --> M
    K --> M
    L --> M
```

## Upload Type Handling

The system supports three different upload patterns:

### Bulk Upload Flow

```mermaid
sequenceDiagram
    participant UI as User Interface
    participant UE as useExport Hook
    participant API as External API
    participant DB as Database

    UI->>UE: Request Bulk Export
    UE->>UE: Transform All Rows
    UE->>UE: Wrap in Bulk Container
    UE->>API: Single POST Request
    API-->>UE: Bulk Response
    UE->>UE: Process Success/Error Lists
    UE->>DB: Clear Successful Rows
    UE->>UI: Update State & Show Results
```

### Single Row Upload Flow

```mermaid
sequenceDiagram
    participant UI as User Interface
    participant UE as useExport Hook
    participant API as External API
    participant DB as Database

    UI->>UE: Request Single Row Export
    loop For Each Row
        UE->>UE: Transform Single Row
        UE->>API: Individual POST Request
        API-->>UE: Single Row Response
        UE->>UE: Track Success/Failure
        alt Success
            UE->>UI: Remove Row from View
        else Failure
            UE->>UE: Add to Failed List
        end
    end
    UE->>DB: Clear Successful Rows
    UE->>UI: Show Final Results
```

### Load Entity Special Handling

```mermaid
graph TD
    A[Load Data Rows] --> B[Transform Each Row]
    B --> C[Wrap in loadData Object]
    C --> D[Individual API Calls]
    D --> E{Response Status}
    E -->|200/201| F[Success - Remove Row]
    E -->|Error| G[Failure - Keep Row]
    F --> H[Track Successful Count]
    G --> I[Track Failed Rows]
    H --> J[Final Results]
    I --> J
```

## Field Mapping Details

### Basic Field Mapping

1. **Source Column Mapping**: Maps UI display names to API field names
2. **Data Type Conversion**: Handles string, number, boolean, date, and array types
3. **Null Value Handling**: Filters null values for specific entities

### Lookup Field Resolution

```mermaid
graph LR
    A[Display Value<br/>'ACME Corp'] --> B[Search Lookup Data]
    B --> C{Match Found?}
    C -->|Yes| D[Extract Database ID<br/>'64f7a123...']
    C -->|No| E[Keep Original Value]
    D --> F[Use ID in Payload]
    E --> G[Use Original in Payload]

    subgraph "Lookup Sources"
        H[TMS Customers]
        I[Container Types]
        J[Branches]
        K[Driver Groups]
        L[Carrier Groups]
    end

    B --> H
    B --> I
    B --> J
    B --> K
    B --> L
```

## Error Handling and Recovery

### Validation Error Processing

```mermaid
graph TD
    A[API Response] --> B{Status Code}
    B -->|200/201| C[Success Path]
    B -->|400| D[Validation Errors]
    B -->|409| E[Conflict Errors]
    B -->|Other| F[General Errors]

    D --> G[Parse Error Messages]
    G --> H[Map to Field Names]
    H --> I[Highlight Error Cells]
    I --> J[Show Error Messages]

    E --> K[Extract Email Conflicts]
    K --> L[Highlight Email Fields]
    L --> M[Show Conflict Details]

    F --> N[Show Generic Error]

    C --> O[Remove Successful Rows]
    J --> P[Keep Failed Rows]
    M --> P
    N --> P
```

### Row State Management

The system maintains different states for data rows:

- **Pending**: Awaiting export
- **Processing**: Currently being exported
- **Success**: Successfully exported (removed from UI)
- **Failed**: Export failed (kept in UI with error highlighting)

## Configuration Files

### exportEntities.json Structure

```json
{
  "baseUrl": "https://api.portpro.io",
  "entities": [
    {
      "id": "EntityName",
      "name": "Display Name",
      "url": "/api/endpoint",
      "uploadType": "BULK_UPLOAD|SINGLE_ROW_UPLOAD",
      "fields": [
        {
          "name": "Display Name",
          "sourceColumn": "api_field_name",
          "type": "string|number|boolean|date",
          "required": true,
          "lookupValidation": {
            "lookupId": "lookupSource",
            "lookupField": "fieldToMatch"
          }
        }
      ]
    }
  ]
}
```

### Key Field Properties

- **name**: Display name shown in UI
- **sourceColumn**: Target API field name
- **type**: Data type for validation and conversion
- **required**: Whether field is mandatory
- **lookupValidation**: Configuration for ID resolution
- **pattern**: Regex pattern for validation
- **minLength/maxLength**: String length constraints

## API Integration Points

### Authentication

All API calls include:
- Bearer token from localStorage
- Standard content-type headers
- Accept headers for JSON responses

### Base URL Resolution

The system dynamically resolves base URLs:
1. Fetches active base URL from database
2. Combines with entity-specific endpoint
3. Handles both relative and absolute URLs

### Response Processing

Different response formats are handled:
- **Bulk Responses**: Process `validList` and `inValidList` arrays
- **Single Responses**: Handle individual success/error status
- **Error Responses**: Extract field-specific error details

## Performance Optimizations

### Batch Processing

- **Bulk Uploads**: Single API call for all rows
- **Lookup Caching**: Redis-based caching for validation data
- **Parallel Processing**: Concurrent API calls where applicable

### Memory Management

- **Pagination**: Process large datasets in chunks
- **State Cleanup**: Remove successful rows from memory
- **Error Isolation**: Keep only failed rows for retry

## Troubleshooting Guide

### Common Issues

1. **Field Mapping Errors**: Check `sourceColumn` values in entity config
2. **Lookup Resolution Failures**: Verify lookup data is loaded and accessible
3. **API Authentication**: Ensure valid bearer token is present
4. **Data Type Mismatches**: Verify field types match API expectations

### Debug Information

The system logs detailed information for:
- Field mapping operations
- Lookup resolution attempts
- API request/response cycles
- Error processing steps

## Related Files

- `src/hooks/useExport.ts` - Main export logic
- `src/utils/fieldMapper.ts` - Data transformation utilities
- `src/contexts/AppContext.tsx` - Application state management
- `exportEntities.json` - Entity configuration
- `src/store/slices/exportDataSlice.ts` - Redux state management