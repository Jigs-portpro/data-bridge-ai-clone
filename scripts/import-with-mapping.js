const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function importWithMapping() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:mysecretpassword@localhost:5432/portpro_data_bridge',
  });

  try {
    console.log('🔄 Running MongoDB validation import with entity key mapping...');

    // Entity key mapping: MongoDB → PostgreSQL
    const entityMapping = {
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

    // Read the SQL file and apply entity key mapping
    const sqlPath = path.join(__dirname, '../sql/004_seed_entity_validations_from_mongodb.sql');
    let sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🔧 Applying entity key mappings...');
    Object.entries(entityMapping).forEach(([mongoKey, pgKey]) => {
      const regex = new RegExp(`e\\.entity_key = '${mongoKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'g');
      const replaced = sql.replace(regex, `e.entity_key = '${pgKey}'`);
      if (replaced !== sql) {
        const count = (sql.match(regex) || []).length;
        console.log(`  ✅ ${mongoKey} → ${pgKey} (${count} rules)`);
        sql = replaced;
      }
    });

    // Fix enum JSON escaping issues
    console.log('🔧 Fixing JSON escaping in enum values...');

    // Fix the problematic enum patterns
    sql = sql.replace(/'"\[.*?\]"'/g, (match) => {
      // Extract the JSON content and fix it
      try {
        // Remove outer quotes and fix inner quotes
        let content = match.slice(2, -2); // Remove '"] from both ends
        content = content.replace(/"/g, '\\"'); // Escape inner quotes
        return `'${content}'`;
      } catch (e) {
        return match; // Return original if fixing fails
      }
    });

    // Fix specific problematic patterns
    sql = sql.replace(/'"\[26'","40'","45'","48'","53'"\]"'/g, `'["26\'","40\'","45\'","48\'","53\'"]'`);

    // Split into individual statements
    const lines = sql.split('\n');
    const insertStatements = [];
    let currentStatement = '';

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('--')) {
        continue;
      }

      if (trimmed.startsWith('INSERT')) {
        if (currentStatement) {
          insertStatements.push(currentStatement.trim());
        }
        currentStatement = line;
      } else if (currentStatement) {
        currentStatement += '\n' + line;
      }

      if (trimmed.endsWith(';')) {
        if (currentStatement) {
          insertStatements.push(currentStatement.trim());
          currentStatement = '';
        }
      }
    }

    if (currentStatement && currentStatement.trim()) {
      insertStatements.push(currentStatement.trim());
    }

    console.log(`📊 Processing ${insertStatements.length} validation rules...`);

    let successCount = 0;
    let fieldNotFoundCount = 0;
    let syntaxErrorCount = 0;
    let patternTooLongCount = 0;

    const errors = [];

    for (let i = 0; i < insertStatements.length; i++) {
      const statement = insertStatements[i];

      try {
        // Check for patterns that are too long
        const patternMatch = statement.match(/pattern, '([^']+)'/);
        if (patternMatch && patternMatch[1].length > 900) {
          // Truncate very long patterns
          const truncatedPattern = patternMatch[1].substring(0, 900);
          const modifiedStatement = statement.replace(patternMatch[1], truncatedPattern);

          const result = await pool.query(modifiedStatement);
          if (result.rowCount > 0) {
            successCount++;
            patternTooLongCount++;
            if (patternTooLongCount <= 3) {
              console.log(`⚠️  Truncated long pattern for statement ${i + 1}`);
            }
          } else {
            fieldNotFoundCount++;
          }
          continue;
        }

        const result = await pool.query(statement);
        if (result.rowCount > 0) {
          successCount++;
        } else {
          fieldNotFoundCount++;

          // Extract entity and field for debugging
          const entityMatch = statement.match(/entity_key = '([^']+)'/);
          const fieldMatch = statement.match(/display_name = '([^']+)'/);
          if (fieldNotFoundCount <= 10 && entityMatch && fieldMatch) {
            console.log(`⚠️  Field not found: ${entityMatch[1]}.${fieldMatch[1]}`);
          }
        }

        if ((successCount + fieldNotFoundCount + syntaxErrorCount) % 50 === 0) {
          console.log(`✅ Processed ${successCount + fieldNotFoundCount + syntaxErrorCount} statements...`);
        }

      } catch (error) {
        syntaxErrorCount++;

        if (syntaxErrorCount <= 5) {
          const entityMatch = statement.match(/entity_key = '([^']+)'/);
          const fieldMatch = statement.match(/display_name = '([^']+)'/);
          const entity = entityMatch ? entityMatch[1] : 'unknown';
          const field = fieldMatch ? fieldMatch[1] : 'unknown';

          errors.push({
            entity,
            field,
            error: error.message.substring(0, 100),
            statement: statement.substring(0, 150) + '...'
          });
        }
      }
    }

    console.log('\n📈 IMPORT RESULTS:');
    console.log('='.repeat(50));
    console.log(`Total validation rules attempted: ${insertStatements.length}`);
    console.log(`✅ Successfully imported: ${successCount}`);
    console.log(`⚠️  Field not found: ${fieldNotFoundCount}`);
    console.log(`🔧 Pattern truncated: ${patternTooLongCount}`);
    console.log(`❌ Syntax errors: ${syntaxErrorCount}`);
    console.log(`📊 Success rate: ${Math.round((successCount / insertStatements.length) * 100)}%`);

    // Show final database state
    const finalResult = await pool.query(`
      SELECT
        validation_type,
        COUNT(*) as count
      FROM entity_validations
      GROUP BY validation_type
      ORDER BY validation_type;
    `);

    console.log('\n📋 Final validation counts by type:');
    let totalCount = 0;
    finalResult.rows.forEach(row => {
      console.log(`  ${row.validation_type}: ${row.count}`);
      totalCount += parseInt(row.count);
    });
    console.log(`  📊 Total: ${totalCount}`);

    // Show sample errors
    if (errors.length > 0) {
      console.log('\n🐛 Sample syntax errors:');
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.entity}.${error.field}`);
        console.log(`   Error: ${error.error}...`);
        console.log(`   Statement: ${error.statement}`);
        console.log('');
      });
    }

    console.log('\n🎉 Import completed!');
    if (successCount > 50) {
      console.log(`🚀 Successfully imported ${successCount} validation rules!`);
      console.log('The entity validation system is now populated with MongoDB data.');
    }

  } catch (error) {
    console.error('❌ Error during import:', error.message);
  } finally {
    await pool.end();
  }
}

importWithMapping();