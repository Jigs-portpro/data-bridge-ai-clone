const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:mysecretpassword@localhost:5432/portpro_data_bridge',
  });

  try {
    console.log('🔄 Connecting to database...');

    // Read the SQL file
    const sqlPath = path.join(__dirname, '../sql/003_create_entity_validations_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🔄 Running entity_validations table creation...');
    await pool.query(sql);
    console.log('✅ entity_validations table created successfully');

    // Check if table was created
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'entity_validations'
      ORDER BY ordinal_position;
    `);

    console.log('📋 Table schema:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (${row.is_nullable})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

runMigration();