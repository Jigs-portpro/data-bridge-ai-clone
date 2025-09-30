const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function analyzeImportFailures() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:mysecretpassword@localhost:5432/portpro_data_bridge',
  });

  try {
    console.log('🔍 Analyzing MongoDB import failures...');

    // Read the generated SQL file
    const sqlPath = path.join(__dirname, '../sql/004_seed_entity_validations_from_mongodb.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Get current database entities and fields
    const dbEntitiesResult = await pool.query(`
      SELECT
        e.entity_key,
        e.name as entity_name,
        ef.field_name,
        ef.display_name
      FROM entities e
      JOIN entity_fields ef ON e.id = ef.entity_id
      ORDER BY e.entity_key, ef.field_name;
    `);

    const dbEntitiesByKey = {};
    const dbFieldsByEntity = {};

    dbEntitiesResult.rows.forEach(row => {
      dbEntitiesByKey[row.entity_key] = row.entity_name;

      if (!dbFieldsByEntity[row.entity_key]) {
        dbFieldsByEntity[row.entity_key] = new Set();
      }
      dbFieldsByEntity[row.entity_key].add(row.field_name);
      dbFieldsByEntity[row.entity_key].add(row.display_name);
    });

    console.log('📋 Current database schema:');
    Object.keys(dbEntitiesByKey).forEach(key => {
      console.log(`  ${key}: ${dbFieldsByEntity[key].size} fields`);
    });

    // Parse the SQL file to extract entity/field references
    const lines = sql.split('\n');
    const mongoValidations = [];
    let currentEntity = null;

    for (const line of lines) {
      const trimmed = line.trim();

      // Extract entity information from comments
      if (trimmed.startsWith('-- Entity:')) {
        const match = trimmed.match(/-- Entity: (.+) \((.+)\)/);
        if (match) {
          currentEntity = {
            mongoName: match[1],
            mongoKey: match[2]
          };
        }
      }

      // Extract validation rules from INSERT statements
      if (trimmed.startsWith('INSERT INTO entity_validations')) {
        const nextLines = [];
        let idx = lines.indexOf(line);

        // Collect the full INSERT statement
        while (idx < lines.length && !lines[idx].trim().endsWith(';')) {
          nextLines.push(lines[idx]);
          idx++;
        }
        nextLines.push(lines[idx]); // Add the final line with semicolon

        const fullStatement = nextLines.join('\n');

        // Extract entity key and display name from WHERE clause
        const entityMatch = fullStatement.match(/WHERE e\.entity_key = '([^']+)'/);
        const fieldMatch = fullStatement.match(/AND ef\.display_name = '([^']+)'/);
        const typeMatch = fullStatement.match(/validation_type, '([^']+)'/);

        if (entityMatch && fieldMatch && typeMatch) {
          mongoValidations.push({
            mongoEntity: currentEntity,
            entityKey: entityMatch[1],
            displayName: fieldMatch[1],
            validationType: typeMatch[1],
            statement: fullStatement
          });
        }
      }
    }

    console.log(`\n📊 Found ${mongoValidations.length} validation rules in MongoDB SQL`);

    // Analyze failures
    let entityKeyMismatches = 0;
    let fieldNameMismatches = 0;
    let syntaxErrors = 0;
    let successfulMatches = 0;

    const entityMismatches = new Set();
    const fieldMismatches = [];
    const syntaxIssues = [];

    console.log('\n🔍 Analyzing each validation rule:');

    mongoValidations.forEach((validation, index) => {
      const { entityKey, displayName, validationType } = validation;

      // Check entity key match
      if (!dbEntitiesByKey[entityKey]) {
        entityKeyMismatches++;
        entityMismatches.add(`${entityKey} (MongoDB: ${validation.mongoEntity?.mongoName})`);
        return;
      }

      // Check field name match
      if (!dbFieldsByEntity[entityKey] || !dbFieldsByEntity[entityKey].has(displayName)) {
        fieldNameMismatches++;
        fieldMismatches.push({
          entity: entityKey,
          field: displayName,
          availableFields: Array.from(dbFieldsByEntity[entityKey] || []).slice(0, 5)
        });
        return;
      }

      // Check for syntax issues (like the enum values with quotes)
      if (validation.statement.includes(`'["26'","40'"`)) {
        syntaxErrors++;
        syntaxIssues.push({
          entity: entityKey,
          field: displayName,
          type: validationType,
          issue: 'Invalid JSON in enum_values (quote escaping)'
        });
        return;
      }

      if (validation.statement.length > 2000) {
        syntaxErrors++;
        syntaxIssues.push({
          entity: entityKey,
          field: displayName,
          type: validationType,
          issue: 'Pattern too long for varchar(1000) field'
        });
        return;
      }

      successfulMatches++;
    });

    console.log('\n📈 FAILURE ANALYSIS SUMMARY:');
    console.log('='.repeat(50));
    console.log(`Total MongoDB validation rules: ${mongoValidations.length}`);
    console.log(`✅ Should succeed: ${successfulMatches}`);
    console.log(`❌ Entity key mismatches: ${entityKeyMismatches}`);
    console.log(`❌ Field name mismatches: ${fieldNameMismatches}`);
    console.log(`❌ Syntax/format errors: ${syntaxErrors}`);

    console.log('\n🔑 ENTITY KEY MAPPING ISSUES:');
    console.log('MongoDB → PostgreSQL entity key mismatches:');
    Array.from(entityMismatches).forEach(mismatch => {
      console.log(`  ❌ ${mismatch}`);
    });

    console.log('\nAvailable PostgreSQL entity keys:');
    Object.keys(dbEntitiesByKey).forEach(key => {
      console.log(`  ✅ ${key}`);
    });

    console.log('\n📝 FIELD NAME MAPPING ISSUES (first 10):');
    fieldMismatches.slice(0, 10).forEach(mismatch => {
      console.log(`  ❌ ${mismatch.entity}.${mismatch.field}`);
      console.log(`    Available fields: ${mismatch.availableFields.join(', ')}...`);
    });

    console.log('\n🐛 SYNTAX/FORMAT ISSUES:');
    syntaxIssues.forEach(issue => {
      console.log(`  ❌ ${issue.entity}.${issue.field} (${issue.type}): ${issue.issue}`);
    });

    // Generate mapping suggestions
    console.log('\n🔧 RECOMMENDED FIXES:');
    console.log('1. Entity Key Mapping:');

    const mongoToPostgresMapping = {
      'Load': 'load',
      'Trailers': 'trailers',
      'Truck Owner': 'truck_owner',
      'Trucks': 'trucks',
      'Users': 'users',
      'Charge Profile': 'charge_profile',
      'Chassis Owner': 'chassis_owner',
      'Chassis': 'chassis',
      'People': 'people',
      'Organization': 'organization',
      'Drivers': 'drivers',
      'PerDiem': 'perdiem'
    };

    Object.entries(mongoToPostgresMapping).forEach(([mongo, postgres]) => {
      console.log(`   "${mongo}" → "${postgres}"`);
    });

    console.log('\n2. Fix JSON escaping in enum values');
    console.log('3. Truncate long regex patterns to fit varchar(1000)');

    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Create entity key mapping in the MongoDB extraction script');
    console.log('2. Fix JSON escaping for enum values');
    console.log('3. Handle long patterns by truncating or increasing field size');
    console.log(`4. Expected success rate after fixes: ~${Math.round((successfulMatches / mongoValidations.length) * 100)}% → ~${Math.round(((successfulMatches + entityKeyMismatches) / mongoValidations.length) * 100)}%`);

    // Show the actual counts we could achieve
    const potentialSuccess = successfulMatches + entityKeyMismatches;
    console.log(`\n💡 POTENTIAL IMPORT SUCCESS: ${potentialSuccess}/${mongoValidations.length} rules (${Math.round((potentialSuccess / mongoValidations.length) * 100)}%)`);

  } catch (error) {
    console.error('❌ Error analyzing import failures:', error.message);
  } finally {
    await pool.end();
  }
}

analyzeImportFailures();