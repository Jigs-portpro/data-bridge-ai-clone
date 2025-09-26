const { Pool } = require('pg');

async function createSampleValidations() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:mysecretpassword@localhost:5432/portpro_data_bridge',
  });

  try {
    console.log('🔄 Creating sample validation rules...');

    // Get some entity fields to work with
    const fieldsResult = await pool.query(`
      SELECT ef.id, ef.field_name, ef.display_name, e.name as entity_name, e.entity_key
      FROM entity_fields ef
      JOIN entities e ON ef.entity_id = e.id
      ORDER BY e.name, ef.field_name
      LIMIT 20;
    `);

    console.log('📋 Available fields:');
    fieldsResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.entity_name}.${row.display_name} (${row.field_name})`);
    });

    // Create sample validations
    const validationRules = [
      // Regex patterns
      {
        entity_key: 'load',
        field_name: 'container_no',
        validation_type: 'regex',
        pattern: '^[A-Z]{4}[0-9]{7}$',
        error_message: 'Container number must be 4 letters followed by 7 digits'
      },
      {
        entity_key: 'load',
        field_name: 'shipper',
        validation_type: 'regex',
        pattern: '^[A-Za-z0-9\\s,.-]+$',
        error_message: 'Shipper name contains invalid characters'
      },
      // Enum validations
      {
        entity_key: 'load',
        field_name: 'type_of_load',
        validation_type: 'enum',
        enum_values: ['Import', 'Export', 'Road'],
        error_message: 'Load type must be Import, Export, or Road'
      },
      {
        entity_key: 'trailers',
        field_name: 'trailer_size',
        validation_type: 'enum',
        enum_values: ['26\'', '40\'', '45\'', '48\'', '53\''],
        error_message: 'Invalid trailer size'
      },
      // Lookup validations
      {
        entity_key: 'load',
        field_name: 'customer',
        validation_type: 'lookup',
        lookup_id: 'tmsCustomers',
        lookup_field: 'company_name',
        error_message: 'Customer must be a valid TMS customer'
      },
      {
        entity_key: 'load',
        field_name: 'consignee',
        validation_type: 'lookup',
        lookup_id: 'branches',
        lookup_field: 'branch_name',
        error_message: 'Consignee must be a valid branch'
      }
    ];

    let successCount = 0;
    let skipCount = 0;

    for (const rule of validationRules) {
      try {
        // Find the entity field
        const fieldResult = await pool.query(`
          SELECT ef.id
          FROM entity_fields ef
          JOIN entities e ON ef.entity_id = e.id
          WHERE e.entity_key = $1 AND ef.field_name = $2
        `, [rule.entity_key, rule.field_name]);

        if (fieldResult.rows.length === 0) {
          console.log(`⚠️  Skipping ${rule.entity_key}.${rule.field_name} - field not found`);
          skipCount++;
          continue;
        }

        const entityFieldId = fieldResult.rows[0].id;

        // Insert the validation
        if (rule.validation_type === 'regex') {
          await pool.query(`
            INSERT INTO entity_validations (entity_field_id, validation_type, pattern, error_message)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (entity_field_id) DO UPDATE SET
              validation_type = EXCLUDED.validation_type,
              pattern = EXCLUDED.pattern,
              error_message = EXCLUDED.error_message,
              updated_at = CURRENT_TIMESTAMP
          `, [entityFieldId, rule.validation_type, rule.pattern, rule.error_message]);

        } else if (rule.validation_type === 'enum') {
          await pool.query(`
            INSERT INTO entity_validations (entity_field_id, validation_type, enum_values, error_message)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (entity_field_id) DO UPDATE SET
              validation_type = EXCLUDED.validation_type,
              enum_values = EXCLUDED.enum_values,
              error_message = EXCLUDED.error_message,
              updated_at = CURRENT_TIMESTAMP
          `, [entityFieldId, rule.validation_type, JSON.stringify(rule.enum_values), rule.error_message]);

        } else if (rule.validation_type === 'lookup') {
          await pool.query(`
            INSERT INTO entity_validations (entity_field_id, validation_type, lookup_id, lookup_field, error_message)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (entity_field_id) DO UPDATE SET
              validation_type = EXCLUDED.validation_type,
              lookup_id = EXCLUDED.lookup_id,
              lookup_field = EXCLUDED.lookup_field,
              error_message = EXCLUDED.error_message,
              updated_at = CURRENT_TIMESTAMP
          `, [entityFieldId, rule.validation_type, rule.lookup_id, rule.lookup_field, rule.error_message]);
        }

        console.log(`✅ Created ${rule.validation_type} validation for ${rule.entity_key}.${rule.field_name}`);
        successCount++;

      } catch (error) {
        console.warn(`❌ Failed to create validation for ${rule.entity_key}.${rule.field_name}:`, error.message);
      }
    }

    // Check final results
    const finalResult = await pool.query(`
      SELECT
        validation_type,
        COUNT(*) as count
      FROM entity_validations
      GROUP BY validation_type
      ORDER BY validation_type;
    `);

    console.log(`\n✅ Sample validation seeding completed!`);
    console.log(`📈 Success: ${successCount} validations created`);
    console.log(`⚠️  Skipped: ${skipCount} (field not found)`);

    console.log('\n📋 Validation counts by type:');
    let totalCount = 0;
    finalResult.rows.forEach(row => {
      console.log(`  ${row.validation_type}: ${row.count}`);
      totalCount += parseInt(row.count);
    });
    console.log(`  📊 Total: ${totalCount}`);

    // Show all created validations
    const allValidations = await pool.query(`
      SELECT
        ev.validation_type,
        ev.pattern,
        ev.enum_values,
        ev.lookup_id,
        ev.lookup_field,
        ev.error_message,
        ef.field_name,
        ef.display_name,
        e.name as entity_name,
        e.entity_key
      FROM entity_validations ev
      JOIN entity_fields ef ON ev.entity_field_id = ef.id
      JOIN entities e ON ef.entity_id = e.id
      ORDER BY e.name, ef.display_name;
    `);

    console.log('\n📝 All validation rules in database:');
    allValidations.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.entity_name}.${row.display_name} (${row.validation_type})`);
      if (row.pattern) console.log(`   Pattern: ${row.pattern}`);
      if (row.enum_values) console.log(`   Enum: ${JSON.stringify(row.enum_values)}`);
      if (row.lookup_id) console.log(`   Lookup: ${row.lookup_id}.${row.lookup_field}`);
      console.log(`   Error: ${row.error_message}`);
      console.log('');
    });

    console.log('🎉 The entity validation system is now ready for use!');
    console.log('🔗 You can access the admin interface to manage these validations.');
    console.log('📊 Test the API: GET http://localhost:9002/api/entity-validations');

  } catch (error) {
    console.error('❌ Error creating sample validations:', error.message);
  } finally {
    await pool.end();
  }
}

createSampleValidations();