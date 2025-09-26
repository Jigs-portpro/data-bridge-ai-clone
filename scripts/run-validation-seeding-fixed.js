const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runValidationSeeding() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:mysecretpassword@localhost:5432/portpro_data_bridge',
  });

  try {
    console.log('🔄 Connecting to database...');

    // Read the generated SQL file
    const sqlPath = path.join(__dirname, '../sql/004_seed_entity_validations_from_mongodb.sql');

    if (!fs.existsSync(sqlPath)) {
      console.error('❌ Seeding SQL file not found at:', sqlPath);
      process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🔄 Running validation rules seeding...');
    console.log('📄 SQL file size:', (sql.length / 1024).toFixed(1) + ' KB');

    // Extract only INSERT statements
    const lines = sql.split('\n');
    const insertStatements = [];
    let currentStatement = '';

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('--')) {
        continue;
      }

      // If line starts with INSERT, start a new statement
      if (trimmed.startsWith('INSERT')) {
        if (currentStatement) {
          insertStatements.push(currentStatement.trim());
        }
        currentStatement = line;
      } else if (currentStatement) {
        // Continue building current statement
        currentStatement += '\n' + line;
      }

      // If line ends with semicolon, complete the statement
      if (trimmed.endsWith(';')) {
        if (currentStatement) {
          insertStatements.push(currentStatement.trim());
          currentStatement = '';
        }
      }
    }

    // Add final statement if exists
    if (currentStatement && currentStatement.trim()) {
      insertStatements.push(currentStatement.trim());
    }

    console.log('📊 Found', insertStatements.length, 'INSERT statements to execute');

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < insertStatements.length; i++) {
      const statement = insertStatements[i];

      try {
        const result = await pool.query(statement);
        if (result.rowCount > 0) {
          successCount++;
        } else {
          skippedCount++;
          console.log(`⚠️  Statement ${i + 1} matched 0 rows (field/entity not found)`);
        }

        if ((successCount + skippedCount) % 25 === 0) {
          console.log(`✅ Processed ${successCount + skippedCount} statements...`);
        }
      } catch (error) {
        errorCount++;
        console.warn(`❌ Statement ${i + 1} failed:`, error.message.substring(0, 80) + '...');

        // Show the problematic statement for debugging
        if (errorCount <= 3) {
          console.log('   Statement:', statement.substring(0, 150) + '...');
        }
      }
    }

    console.log(`\n✅ Validation seeding completed!`);
    console.log(`📈 Success: ${successCount} validations inserted`);
    console.log(`⚠️  Skipped: ${skippedCount} (no matching entity/field)`);
    console.log(`❌ Errors: ${errorCount} statements`);

    // Check final count
    const result = await pool.query(`
      SELECT
        validation_type,
        COUNT(*) as count
      FROM entity_validations
      GROUP BY validation_type
      ORDER BY validation_type;
    `);

    console.log('\n📋 Validation counts by type:');
    let totalCount = 0;
    result.rows.forEach(row => {
      console.log(`  ${row.validation_type}: ${row.count}`);
      totalCount += parseInt(row.count);
    });
    console.log(`  📊 Total: ${totalCount}`);

    // Show sample validations
    const sampleResult = await pool.query(`
      SELECT
        ev.validation_type,
        ev.pattern,
        ev.enum_values,
        ev.lookup_id,
        ev.lookup_field,
        ef.display_name,
        e.name as entity_name
      FROM entity_validations ev
      JOIN entity_fields ef ON ev.entity_field_id = ef.id
      JOIN entities e ON ef.entity_id = e.id
      ORDER BY ev.created_at
      LIMIT 8;
    `);

    console.log('\n📝 Sample validation rules created:');
    sampleResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.entity_name}.${row.display_name} (${row.validation_type})`);
      if (row.pattern) console.log(`   Pattern: ${row.pattern.substring(0, 50)}${row.pattern.length > 50 ? '...' : ''}`);
      if (row.enum_values) console.log(`   Enum: ${JSON.stringify(row.enum_values)}`);
      if (row.lookup_id) console.log(`   Lookup: ${row.lookup_id}.${row.lookup_field}`);
    });

    if (totalCount >= 100) {
      console.log('\n🎉 Great success! The entity validation system is now populated with', totalCount, 'validation rules.');
      console.log('🔗 You can now access the admin interface to manage these validations.');
    }

  } catch (error) {
    console.error('❌ Error running validation seeding:', error.message);
  } finally {
    await pool.end();
  }
}

runValidationSeeding();