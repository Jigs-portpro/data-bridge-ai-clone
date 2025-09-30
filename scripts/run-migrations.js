const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function runMigration(filename) {
  const sqlPath = path.join(__dirname, '../sql', filename);

  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ Migration file not found: ${filename}`);
    return false;
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    console.log(`🔄 Running migration: ${filename}`);
    await pool.query(sql);
    console.log(`✅ Migration completed: ${filename}`);
    return true;
  } catch (error) {
    console.error(`❌ Migration failed: ${filename}`);
    console.error(error.message);
    return false;
  }
}

async function main() {
  try {
    console.log('🚀 Starting database migrations...\n');

    // Test connection
    await pool.query('SELECT 1');
    console.log('✅ Database connection established\n');

    // Run migrations in order
    const migrations = [
      '001_create_entities_tables.sql',
      '002_seed_entities.sql'
    ];

    for (const migration of migrations) {
      const success = await runMigration(migration);
      if (!success) {
        console.log('\n❌ Migration process stopped due to error');
        process.exit(1);
      }
    }

    console.log('\n🎉 All migrations completed successfully!');

    // Verify entities were created
    const result = await pool.query('SELECT entity_key, name FROM entities ORDER BY name');
    console.log(`\n📊 Created ${result.rows.length} entities:`);
    result.rows.forEach(row => {
      console.log(`   • ${row.name} (${row.entity_key})`);
    });

  } catch (error) {
    console.error('❌ Migration process failed:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();