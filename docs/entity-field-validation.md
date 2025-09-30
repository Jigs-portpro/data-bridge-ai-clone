# Entity Field Validation System

This document explains how validation for entity fields works in the PortPro Data Bridge AI system.

## Overview

The validation system follows a **database-driven approach** where entity field definitions are stored in PostgreSQL database tables. The `useValidation.ts` hook serves as the central validation engine that processes data against these configurations.

⚠️ **Important Discovery**: Despite the existence of `exportEntities.json` in the project root, this file is **NOT being used** by the validation system. All entity configurations come from the database.

## Architecture Components

### 1. Entity Configuration (PostgreSQL Database)

**Purpose**: Single source of truth for all entity field definitions

**Location**: PostgreSQL database tables (`entities` and `entity_fields`)

**API Access**: `/api/export-entities` route (`src/app/api/export-entities/route.ts`)

**Structure**: Basic field information with limited validation properties

**Available Field Properties** (from database):
- `name` (`field_name`): Target field name for the API
- `required` (`is_required`): Whether field is mandatory for API submission
- `type` (`field_type`): Basic data type (string, number, boolean, date, email)
- `minLength` (`min_length`): Minimum string length
- `maxLength` (`max_length`): Maximum string length

**Missing Critical Validation Properties**:
- ❌ `sourceColumn`: Source column mapping (not stored in database)
- ❌ `pattern`: Regex validation patterns (not stored in database)
- ❌ `enum`: Array of allowed values (not stored in database)
- ❌ `lookupValidation`: External data validation configuration (not stored in database)
- ❌ `minValue`/`maxValue`: Numeric range constraints (not stored in database)

## 🚨 **Critical System Issue**

There is a major disconnect between what the validation system expects and what the database provides:

1. **The validation code in `useValidation.ts`** expects comprehensive field definitions with `pattern`, `enum`, `lookupValidation`, etc.
2. **The database only provides basic information** like `name`, `type`, `required`, `minLength`, `maxLength`
3. **Advanced validation features are likely non-functional** because the entity configurations lack the necessary validation rules
4. **The comprehensive `exportEntities.json` file exists** with all validation rules but is completely ignored

This means:
- ❌ Pattern validation (regex) is not working
- ❌ Enum validation (allowed values) is not working
- ❌ Lookup validation (external data) is not working
- ❌ Source column mapping is not working
- ✅ Only basic type, required, and length validation works

### 2. Validation Hook (`useValidation.ts`)

**Location**: `/src/hooks/useValidation.ts`

**Main Function**: `validateSingleRow()` (lines 51-223)

**Key Responsibilities**:
- Field mapping validation
- Data presence validation
- Type-specific validation
- Pattern matching with regex
- Lookup data validation
- Entity-specific business rule validation

### 3. Lookup Data Sources (`useLookupDataSources.ts`)

**Location**: `/src/hooks/useLookupDataSources.ts`

**Purpose**: Provides dynamic lookup validation against cached external data

**Structure**: Maps `lookupId` to data sources with field names and fetch functions

**Available Lookups**:
- `tmsCustomers` - TMS customer data
- `branches` - Branch/terminal data
- `containerTypes` - Container type definitions
- `containerSizes` - Container size definitions
- `chassisOwners` - Chassis owner companies
- `containerOwners` - Container owner companies
- `commodities` - Commodity types
- `driverGroups` - Driver group classifications
- `carrierGroups` - Carrier group classifications
- And 15+ more lookup types

## Validation Flow

### Step 1: Field Mapping Validation
```typescript
// Validates that required fields are mapped to source columns
const sourceColumnName = fieldMappings[targetField.name];
if (targetField.required && !sourceColumnName) {
  errors.push(`Row ${rowIndex + 1}, Target "${targetField.name}": required by API but not mapped.`);
}
```

### Step 2: Data Presence Validation
```typescript
// Validates that required fields have data
if (targetField.required && stringValue === "") {
  errors.push(`Row ${rowIndex + 1}, Field "${targetField.name}" (from "${sourceColumnName}"): required by API but source data is empty.`);
}
```

### Step 3: Type-Specific Validation

#### String Validation
- Length constraints (minLength/maxLength)
- Pattern matching with regex
- Special handling for email type with format validation

#### Number Validation
- Numeric format validation
- Range constraints (minValue/maxValue)

#### Boolean Validation
- Accepts: "true", "false", "1", "0" (case insensitive)
- Also accepts: "TRUE", "FALSE", "True", "False"

#### Date Validation
- Custom date validation via `validateAndConvertDate()` utility
- Supports multiple date formats
- Entity-specific date validation rules

### Step 4: Enum Validation
```typescript
// Validates against predefined allowed values
if (targetField.enum && stringValue !== "") {
  if (!targetField.enum.includes(stringValue)) {
    errors.push(`Row ${rowIndex + 1}, "${targetField.name}" (from "${sourceColumnName}"): must be one of [${targetField.enum.join(", ")}]. Found "${stringValue}".`);
  }
}
```

### Step 5: Lookup Validation
```typescript
// Validates against external data sources
if (targetField.lookupValidation && stringValue !== "") {
  const { lookupId, lookupField } = targetField.lookupValidation;
  const lookupSource = lookupDataSources[lookupId];

  // Validates value exists in lookup data
  const foundInLookup = lookupDataSource.some((lookupRow) => {
    const _value = String(lookupRow[expectedField]).trim();
    return _value === stringValue.trim();
  });
}
```

## Special Validation Features

### 1. Comma-Separated Values Support
- Supports multi-value fields (e.g., "Value 1, Value 2, Value 3")
- Each value validated individually against lookup data
- Special handling for Fleet Owners to preserve names containing commas

### 2. "All" Values Recognition
- Recognizes variations: "all", "all branches", "branches all", etc.
- Always passes lookup validation for "All" patterns
- Case-insensitive matching

### 3. Entity-Specific Validation

#### Organization Entity
- **Email Uniqueness**: Validates emails don't already exist in system
- **Company Name Uniqueness**: Validates company names are unique
- **Payment Terms**: Validates payment terms method ("day", "month", or blank)

#### Load Entity
- **Container Existence**: Validates containers don't already exist
- **Customer Validation**: Validates customer references across multiple fields
- **Reference Number Validation**: Validates reference numbers

#### Tariff Entity
- **Charge Profile Validation**: Validates charge profiles exist for vendor type
- **Vendor Type Handling**: Different validation for Driver vs Carrier tariffs

#### Charge Profile Entity
- **Business Rule Validation**: Complex validation for charge profile rules
- **Event Validation**: Validates From/To event combinations
- **Rule Completeness**: Ensures required rules are selected

### 4. Error Reporting System

#### Row-Level Tracking
- Global row indices across pagination
- Consistent row numbering in error messages

#### Cell-Level Highlighting
- Maps errors to specific source columns
- Enables precise error highlighting in data table UI

#### Error Message Structure
- Format: "Row X, Field Y (from Z): Error description"
- Clear, actionable feedback for users

#### Redux State Management
- `errorRows`: Array of row indices with errors
- `errorCells`: Map of column names to error row indices
- `errorMessages`: Map of row:column keys to error messages
- `totalErrorCount`: Total validation error count

## Configuration Examples

### Basic Field with Lookup Validation
```json
{
  "name": "Customer",
  "sourceColumn": "caller",
  "type": "string",
  "required": true,
  "minLength": 2,
  "maxLength": 100,
  "lookupValidation": {
    "lookupId": "tmsCustomers",
    "lookupField": "company_name"
  }
}
```

### Pattern Validation Example
```json
{
  "name": "Load Type",
  "sourceColumn": "type_of_load",
  "type": "string",
  "required": true,
  "maxLength": 50,
  "pattern": "^(Import|Export|Road)$"
}
```

### Enum Validation Example
```json
{
  "name": "Unit of Measure",
  "sourceColumn": "unitOfMeasure",
  "type": "string",
  "required": true,
  "enum": ["Per Miles", "Fixed", "Per Hour", "Percentage"]
}
```

### Date Field Example
```json
{
  "name": "Container ETA",
  "sourceColumn": "vessel.eta",
  "type": "date"
}
```

### Boolean Field Example
```json
{
  "name": "Hazmat",
  "sourceColumn": "hazmat",
  "type": "boolean",
  "pattern": "^(?i)(true|false)$"
}
```

## Validation Execution

### Triggering Validation
Validation is triggered via the `handleValidateData` function in `useValidation.ts`:

```typescript
const { handleValidateData } = useValidation(lookupDataSources, setValidChargeProfileList);

// Called when user clicks "Validate Data" button
await handleValidateData(selectedEntityId, exportConfig);
```

### Validation Process Flow
1. **Setup**: Clear previous validation state
2. **Data Preparation**: Get current page data for validation
3. **Entity-Specific Validation**: Run special validations per entity type
4. **Row-by-Row Validation**: Validate each row against field definitions
5. **Error Processing**: Process and format validation errors
6. **State Updates**: Update Redux state with validation results
7. **UI Feedback**: Display results to user via toast notifications

### Performance Considerations
- **Cached Lookup Data**: Lookup data cached in memory to avoid repeated API calls
- **Pagination Support**: Validates current page data only
- **Batch Processing**: Processes multiple validation rules efficiently
- **Error Limiting**: Limits displayed errors to prevent UI performance issues

## Key Benefits

1. **Dynamic Configuration**: Add new entities/fields without code changes
2. **Comprehensive Validation**: Covers data types, formats, business rules, and external data
3. **User-Friendly Feedback**: Clear, actionable error messages with row/column references
4. **Performance Optimized**: Cached lookup data and efficient validation algorithms
5. **Extensible Architecture**: Easy to add new validation types and lookup sources
6. **Consistent Error Handling**: Standardized error format across all validation types
7. **Real-Time Feedback**: Immediate validation results with precise error locations

## Adding New Validation Rules

### 1. Add Field Configuration
Add field definition to appropriate entity in `exportEntities.json`:

```json
{
  "name": "New Field",
  "sourceColumn": "new_field_source",
  "type": "string",
  "required": true,
  "lookupValidation": {
    "lookupId": "newLookupId",
    "lookupField": "field_name"
  }
}
```

### 2. Add Lookup Data Source (if needed)
Add to `useLookupDataSources.ts`:

```typescript
newLookupId: {
  getData: () => newLookupData,
  field: "field_name",
  name: "Display Name",
  fetchFunction: fetchAndStoreNewLookup,
}
```

### 3. Add Special Validation (if needed)
Add entity-specific validation to `useValidation.ts` in the `handleValidateData` function.

The validation system will automatically handle the new field based on its configuration without requiring additional code changes.

## 🔧 **Potential Solutions to Fix the System**

To resolve the disconnect between the validation system and database configuration, consider these options:

### Option 1: Migrate to JSON File Configuration
1. **Modify `/api/export-entities`** to read from `exportEntities.json` instead of database
2. **Remove database dependency** for entity configurations
3. **Update Setup page** to read/write to JSON file instead of database
4. **Maintain version control** of entity configurations

### Option 2: Expand Database Schema
1. **Add missing columns** to `entity_fields` table:
   - `source_column` (varchar)
   - `validation_pattern` (text)
   - `enum_values` (json)
   - `lookup_id` (varchar)
   - `lookup_field` (varchar)
   - `min_value` (numeric)
   - `max_value` (numeric)

2. **Update API route** to include all validation properties in query
3. **Migrate existing JSON data** to expanded database schema

### Option 3: Hybrid Approach
1. **Use database for basic entity/field structure**
2. **Read validation rules from JSON file** as fallback
3. **Merge configurations** at runtime in API route

### Recommended Immediate Actions

1. **Verify current system behavior** - Test if advanced validation actually works
2. **Choose configuration source** - Decide between JSON file vs database
3. **Update API route** to provide complete field configurations
4. **Test validation system** with complete field definitions
5. **Update documentation** to reflect chosen approach