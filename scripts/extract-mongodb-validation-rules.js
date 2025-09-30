const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // Load environment variables

// Function to convert regex patterns to enum arrays
function convertRegexToEnum(pattern) {
  // Remove anchors and case-insensitive flags
  let cleanPattern = pattern.replace(/^\^|\$$/g, '').replace(/\(\?\:?i\)/g, '');

  // Check if pattern is a simple alternation (value1|value2|value3)
  if (cleanPattern.match(/^\([^)]+\)$/)) {
    // Remove outer parentheses
    cleanPattern = cleanPattern.slice(1, -1);

    // Split by | and clean up
    const values = cleanPattern.split('|').map(value => {
      // Remove extra escaping and whitespace
      return value.replace(/\\(.)/g, '$1').trim();
    }).filter(value => value.length > 0);

    // Only convert if we have reasonable enum values (2-20 values, each under 50 chars)
    if (values.length >= 2 && values.length <= 20 && values.every(v => v.length < 50)) {
      return values;
    }
  }

  // Special cases for common patterns
  const specialCases = {
    // Boolean patterns
    '^(?i)(true|false)$': ['true', 'false'],
    '^(true|false|True|False|TRUE|FALSE)$': ['true', 'false'],
    '^(Yes|No)$': ['Yes', 'No'],
    '^(yes|no)$': ['yes', 'no'],

    // Load types
    '^(Import|Export|Road)$': ['Import', 'Export', 'Road'],

    // Trailer sizes
    '^(26\'|40\'|45\'|48\'|53\')$': ['26\'', '40\'', '45\'', '48\'', '53\''],

    // Trailer types
    '^(Dry Van|Reefer|Flat Bed|Drop Deck|Low Boy|Double Drop Deck)$':
      ['Dry Van', 'Reefer', 'Flat Bed', 'Drop Deck', 'Low Boy', 'Double Drop Deck'],
  };

  return specialCases[pattern] || null;
}

// Connect to MongoDB and extract actual validation data
async function extractMongoValidationRules() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('❌ MONGODB_URI environment variable not found');
    console.log('Available environment variables:', Object.keys(process.env).filter(key => key.includes('MONGO')));
    return;
  }

  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('BulkuploadEntity');

    // First, let's see what collections exist
    const collections = await db.listCollections().toArray();
    console.log('📋 Available collections:', collections.map(c => c.name));

    // Get all entity configurations
    const documents = await collection.find({}).toArray();
    console.log(`📋 Found ${documents.length} documents in BulkuploadEntity collection`);

    if (documents.length === 0) {
      console.log('🔍 Checking other potential collection names...');

      // Try different collection names
      const possibleNames = ['bulkuploadentity', 'entities', 'entity', 'exportentities'];
      for (const name of possibleNames) {
        try {
          const altCollection = db.collection(name);
          const altDocs = await altCollection.find({}).toArray();
          if (altDocs.length > 0) {
            console.log(`✅ Found ${altDocs.length} documents in collection '${name}'`);
            // Use this collection instead
            documents.push(...altDocs);
            break;
          }
        } catch (err) {
          // Collection doesn't exist, continue
        }
      }
    }

    let sql = `-- Auto-generated validation rules from MongoDB BulkuploadEntity collection\n`;
    sql += `-- Extracted from actual working validation system\n`;
    sql += `-- Generated on: ${new Date().toISOString()}\n\n`;

    // Note: We are NOT modifying entity_fields table - it already has everything needed
    sql += `-- IMPORTANT: Not modifying entity_fields table\n`;
    sql += `-- field_name (PostgreSQL) = sourceColumn (MongoDB) - already populated\n`;
    sql += `-- display_name (PostgreSQL) = name (MongoDB) - already populated\n`;
    sql += `-- Only adding advanced validation rules to entity_validations table\n\n`;

    let totalEntities = 0;
    let totalFields = 0;
    let totalValidations = 0;
    let regexToEnumConversions = 0;
    let regexKept = 0;
    let enumRules = 0;
    let lookupRules = 0;
    const processedEntities = new Set(); // Track unique entities to avoid duplicates

    documents.forEach((doc, docIndex) => {
      if (doc.entities && Array.isArray(doc.entities)) {
        sql += `-- Document ${docIndex + 1}: Base URL ${doc.baseUrl}\n`;
        sql += `-- Contains ${doc.entities.length} entities\n\n`;

        doc.entities.forEach(entity => {
          const entityKey = `${entity.id}_${entity.name}`;

          if (processedEntities.has(entityKey)) {
            console.log(`⚠️  Skipping duplicate entity: ${entity.name} (${entity.id})`);
            return; // Skip duplicate entities
          }

          processedEntities.add(entityKey);
          totalEntities++;
          console.log(`Processing entity: ${entity.name} (${entity.fields.length} fields)`);

          sql += `-- ============================================\n`;
          sql += `-- Entity: ${entity.name} (${entity.id})\n`;
          sql += `-- Fields: ${entity.fields.length}\n`;
          sql += `-- ============================================\n\n`;

          entity.fields.forEach(field => {
            totalFields++;
            const entityKey = entity.id;
            const fieldName = field.name;
            let fieldValidations = 0;

            // Note: No need to update source column mapping since:
            // MongoDB sourceColumn -> PostgreSQL field_name (already populated)
            // MongoDB name -> PostgreSQL display_name (already populated)
            // The mapping was done during the initial entity_fields seeding

            // Skip multi-value field processing - not modifying entity_fields table
            // isMulti information will be preserved in the API integration layer if needed

            // Pattern validation - check if it should be converted to enum
            if (field.pattern) {
              const enumValues = convertRegexToEnum(field.pattern);

              if (enumValues) {
                // Convert to enum validation
                fieldValidations++;
                regexToEnumConversions++;
                sql += `-- Enum validation (converted from regex): ${entityKey}.${fieldName}\n`;
                sql += `-- Original pattern: ${field.pattern}\n`;
                sql += `INSERT INTO entity_validations (entity_field_id, validation_type, enum_values, error_message)\n`;
                sql += `SELECT ef.id, 'enum', '${JSON.stringify(enumValues)}', '${fieldName.replace(/'/g, "''")} must be one of: ${enumValues.join(', ')}'\n`;
                sql += `FROM entity_fields ef\n`;
                sql += `JOIN entities e ON ef.entity_id = e.id\n`;
                sql += `WHERE e.entity_key = '${entityKey}' AND ef.display_name = '${fieldName.replace(/'/g, "''")}';\n\n`;
              } else {
                // Keep as regex validation
                fieldValidations++;
                regexKept++;
                sql += `-- Regex validation: ${entityKey}.${fieldName}\n`;
                sql += `INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)\n`;
                sql += `SELECT ef.id, 'regex', '${field.pattern.replace(/'/g, "''")}', 'Invalid format for ${fieldName.replace(/'/g, "''")}'\n`;
                sql += `FROM entity_fields ef\n`;
                sql += `JOIN entities e ON ef.entity_id = e.id\n`;
                sql += `WHERE e.entity_key = '${entityKey}' AND ef.display_name = '${fieldName.replace(/'/g, "''")}';\n\n`;
              }
            }

            // Enum validation
            if (field.enum && Array.isArray(field.enum) && field.enum.length > 0) {
              fieldValidations++;
              enumRules++;
              const enumJson = JSON.stringify(field.enum).replace(/'/g, "''");
              sql += `-- Enum validation: ${entityKey}.${fieldName}\n`;
              sql += `INSERT INTO entity_validations (entity_field_id, validation_type, enum_values, error_message)\n`;
              sql += `SELECT ef.id, 'enum', '${enumJson}', '${fieldName.replace(/'/g, "''")} must be one of: ${field.enum.join(', ')}'\n`;
              sql += `FROM entity_fields ef\n`;
              sql += `JOIN entities e ON ef.entity_id = e.id\n`;
              sql += `WHERE e.entity_key = '${entityKey}' AND ef.display_name = '${fieldName.replace(/'/g, "''")}';\n\n`;
            }

            // Lookup validation
            if (field.lookupValidation) {
              fieldValidations++;
              lookupRules++;
              const lookupId = field.lookupValidation.lookupId;
              const lookupField = field.lookupValidation.lookupField;
              sql += `-- Lookup validation: ${entityKey}.${fieldName} -> ${lookupId}.${lookupField}\n`;
              sql += `INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)\n`;
              sql += `SELECT ef.id, 'lookup', '${lookupId}', '${lookupField}', '${fieldName.replace(/'/g, "''")} must be a valid ${lookupId} entry'\n`;
              sql += `FROM entity_fields ef\n`;
              sql += `JOIN entities e ON ef.entity_id = e.id\n`;
              sql += `WHERE e.entity_key = '${entityKey}' AND ef.display_name = '${fieldName.replace(/'/g, "''")}';\n\n`;
            }

            // Numeric range validation
            if (field.minValue !== undefined || field.maxValue !== undefined) {
              fieldValidations++;
              const minVal = field.minValue !== undefined ? field.minValue : 'NULL';
              const maxVal = field.maxValue !== undefined ? field.maxValue : 'NULL';
              sql += `-- Numeric range validation: ${entityKey}.${fieldName}\n`;
              sql += `INSERT INTO entity_validations (entity_field_id, validation_type, min_value, max_value, error_message)\n`;
              sql += `SELECT ef.id, 'numeric_range', ${minVal}, ${maxVal}, 'Value out of range for ${fieldName.replace(/'/g, "''")}'\n`;
              sql += `FROM entity_fields ef\n`;
              sql += `JOIN entities e ON ef.entity_id = e.id\n`;
              sql += `WHERE e.entity_key = '${entityKey}' AND ef.display_name = '${fieldName.replace(/'/g, "''")}';\n\n`;
            }

            totalValidations += fieldValidations;

            if (fieldValidations > 0) {
              sql += `-- Field ${fieldName} has ${fieldValidations} validation rule(s)\n\n`;
            }
          });

          sql += `-- Entity ${entity.name} completed: ${entity.fields.length} fields processed\n\n`;
        });
      }
    });

    // Add summary
    sql += `-- ============================================\n`;
    sql += `-- MIGRATION SUMMARY (DEDUPLICATED WITH ENUM CONVERSION)\n`;
    sql += `-- ============================================\n`;
    sql += `-- Total Documents: ${documents.length}\n`;
    sql += `-- Unique Entities: ${totalEntities}\n`;
    sql += `-- Total Fields: ${totalFields}\n`;
    sql += `-- Total Validation Rules: ${totalValidations}\n`;
    sql += `--\n`;
    sql += `-- Validation Type Breakdown:\n`;
    sql += `--   Regex patterns (kept): ${regexKept}\n`;
    sql += `--   Enum validations (converted from regex): ${regexToEnumConversions}\n`;
    sql += `--   Enum validations (native): ${enumRules}\n`;
    sql += `--   Lookup validations: ${lookupRules}\n`;
    sql += `--\n`;
    sql += `-- Processed Entity Types: ${Array.from(processedEntities).sort().join(', ')}\n`;
    sql += `-- Generated: ${new Date().toISOString()}\n`;
    sql += `-- Source: MongoDB BulkuploadEntity collection\n`;
    sql += `-- ============================================\n`;

    // Write SQL file
    const sqlPath = path.join(__dirname, '../sql/004_seed_entity_validations_from_mongodb.sql');

    // Ensure sql directory exists
    const sqlDir = path.dirname(sqlPath);
    if (!fs.existsSync(sqlDir)) {
      fs.mkdirSync(sqlDir, { recursive: true });
    }

    fs.writeFileSync(sqlPath, sql);

    console.log('✅ Generated validation rules migration SQL from MongoDB');
    console.log(`📁 SQL file: ${sqlPath}`);
    console.log(`📊 Summary:`);
    console.log(`   - Documents: ${documents.length}`);
    console.log(`   - Entities: ${totalEntities}`);
    console.log(`   - Fields: ${totalFields}`);
    console.log(`   - Total Validation Rules: ${totalValidations}`);
    console.log(`📋 Validation Type Breakdown:`);
    console.log(`   - Regex patterns (kept): ${regexKept}`);
    console.log(`   - Enum validations (converted from regex): ${regexToEnumConversions}`);
    console.log(`   - Enum validations (native): ${enumRules}`);
    console.log(`   - Lookup validations: ${lookupRules}`);

  } catch (error) {
    console.error('❌ Error extracting MongoDB validation rules:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run extraction
extractMongoValidationRules();