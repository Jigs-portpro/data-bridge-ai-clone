const { Pool } = require('pg');

async function checkExternalIdValidations() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:mysecretpassword@localhost:5432/portpro_data_bridge',
  });

  try {
    console.log('🔍 Checking externalId validation rules in PostgreSQL...');

    // Check for external ID validations
    const validationsResult = await pool.query(`
      SELECT
        e.entity_key,
        e.name as entity_name,
        ef.display_name,
        ef.field_name,
        ev.validation_type,
        ev.pattern,
        ev.enum_values,
        ev.lookup_id
      FROM entities e
      JOIN entity_fields ef ON e.id = ef.entity_id
      JOIN entity_validations ev ON ef.id = ev.entity_field_id
      WHERE ef.display_name ILIKE '%external%id%' OR ef.field_name ILIKE '%external%id%'
      ORDER BY e.entity_key, ef.display_name;
    `);

    console.log(`Found ${validationsResult.rows.length} externalId validation rules:`);
    validationsResult.rows.forEach(row => {
      console.log(`  ${row.entity_key}.${row.display_name}:`);
      console.log(`    Field: ${row.field_name}`);
      console.log(`    Type: ${row.validation_type}`);
      if (row.pattern) console.log(`    Pattern: ${row.pattern}`);
      if (row.enum_values) console.log(`    Enum: ${row.enum_values}`);
      if (row.lookup_id) console.log(`    Lookup: ${row.lookup_id}`);
      console.log('');
    });

    // Check all external ID fields (without validations)
    const fieldsResult = await pool.query(`
      SELECT
        e.entity_key,
        e.name as entity_name,
        ef.display_name,
        ef.field_name
      FROM entities e
      JOIN entity_fields ef ON e.id = ef.entity_id
      WHERE ef.display_name ILIKE '%external%id%' OR ef.field_name ILIKE '%external%id%'
      ORDER BY e.entity_key, ef.display_name;
    `);

    console.log(`\n📋 All externalId fields in database (${fieldsResult.rows.length} total):`);
    fieldsResult.rows.forEach(row => {
      console.log(`  ${row.entity_key}.${row.display_name} (${row.field_name})`);
    });

    console.log('\n🔍 Will check export-entities API with curl separately...');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkExternalIdValidations();