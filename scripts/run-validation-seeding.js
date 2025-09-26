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

    // Split the SQL into individual statements and execute them
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0 && !stmt.trim().startsWith('--'));

    console.log('📊 Found', statements.length, 'SQL statements to execute');

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement && !statement.startsWith('--')) {
        try {
          await pool.query(statement + ';');
          successCount++;
          if (successCount % 50 === 0) {
            console.log(`✅ Processed ${successCount} statements...`);
          }
        } catch (error) {
          errorCount++;
          console.warn(`⚠️  Statement ${i + 1} failed:`, error.message.substring(0, 100));
        }
      }
    }

    console.log(`✅ Validation seeding completed!`);
    console.log(`📈 Success: ${successCount} statements`);
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

    console.log('\n📋 Final validation counts by type:');
    let totalCount = 0;
    result.rows.forEach(row => {
      console.log(`  ${row.validation_type}: ${row.count}`);
      totalCount += parseInt(row.count);
    });
    console.log(`  Total: ${totalCount}`);

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
      LIMIT 5;
    `);

    console.log('\n📝 Sample validation rules:');
    sampleResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.entity_name}.${row.display_name} - ${row.validation_type}`);
      if (row.pattern) console.log(`   Pattern: ${row.pattern}`);
      if (row.enum_values) console.log(`   Enum: ${JSON.stringify(row.enum_values)}`);
      if (row.lookup_id) console.log(`   Lookup: ${row.lookup_id}.${row.lookup_field}`);
    });

  } catch (error) {
    console.error('❌ Error running validation seeding:', error.message);
  } finally {
    await pool.end();
  }
}

runValidationSeeding();