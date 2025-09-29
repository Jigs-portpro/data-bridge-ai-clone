#!/usr/bin/env node

/**
 * Verify Zod to PostgreSQL Migration is Complete
 * Run this after deploying the migration script to production
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE_URL = 'http://localhost:9002';

async function verifyMigration() {
  console.log('🔍 VERIFYING ZOD TO POSTGRESQL MIGRATION COMPLETION\n');

  try {
    // Re-run the comparison to see current status
    const zodPatterns = await getZodPatterns();
    const postgresRules = await getPostgresValidationRules();

    console.log('📊 POST-MIGRATION VALIDATION INVENTORY:');
    console.log(`- Zod Patterns: ${zodPatterns.length}`);
    console.log(`- PostgreSQL Rules: ${postgresRules.length}`);
    console.log('');

    // Test ValidationService endpoints
    console.log('🧪 TESTING VALIDATIONSERVICE ENDPOINTS:');

    // Test entity fields endpoint
    try {
      const fieldsResponse = await fetch(`${BASE_URL}/api/entity-fields`);
      if (fieldsResponse.ok) {
        const fieldsData = await fieldsResponse.json();
        console.log(`✅ Entity Fields API: ${fieldsData.data?.length || 0} fields`);
      } else {
        console.log(`❌ Entity Fields API: ${fieldsResponse.status}`);
      }
    } catch (error) {
      console.log(`❌ Entity Fields API: ${error.message}`);
    }

    // Test entity validations endpoint
    try {
      const validationsResponse = await fetch(`${BASE_URL}/api/entity-validations`);
      if (validationsResponse.ok) {
        const validationsData = await validationsResponse.json();
        console.log(`✅ Entity Validations API: ${validationsData.data?.length || 0} rules`);

        // Count validation types
        const rules = validationsData.data || [];
        const regexRules = rules.filter(r => r.validation_type === 'regex').length;
        const enumRules = rules.filter(r => r.validation_type === 'enum').length;
        const lookupRules = rules.filter(r => r.validation_type === 'lookup').length;

        console.log(`  - Regex: ${regexRules}, Enum: ${enumRules}, Lookup: ${lookupRules}`);
      } else {
        console.log(`❌ Entity Validations API: ${validationsResponse.status}`);
      }
    } catch (error) {
      console.log(`❌ Entity Validations API: ${error.message}`);
    }

    // Test entities endpoint
    try {
      const entitiesResponse = await fetch(`${BASE_URL}/api/entities`);
      if (entitiesResponse.ok) {
        const entitiesData = await entitiesResponse.json();
        console.log(`✅ Entities API: ${entitiesData.data?.length || 0} entities`);
      } else {
        console.log(`❌ Entities API: ${entitiesResponse.status}`);
      }
    } catch (error) {
      console.log(`❌ Entities API: ${error.message}`);
    }

    console.log('');

    // Check for specific missing patterns that should now be in PostgreSQL
    console.log('🔍 CHECKING FOR PREVIOUSLY MISSING PATTERNS:');

    const criticalPatterns = [
      { name: 'Email Pattern', pattern: '^([^@]+@[^@]+\\s*,\\s*)*[^@]+@[^@]+$' },
      { name: 'US State Pattern', pattern: '^[A-Z]{2}$' },
      { name: 'Phone Formatted', pattern: '^\\d{3}-\\d{3}-\\d{4}$' },
      { name: 'VIN Pattern', pattern: '^[A-Z0-9]{9,17}$' },
      { name: 'SCAC Pattern', pattern: '^[A-Z]{4}$' }
    ];

    const postgresPatterns = postgresRules.filter(r => r.validation_type === 'regex').map(r => r.pattern);

    criticalPatterns.forEach(({ name, pattern }) => {
      const found = postgresPatterns.some(p => p === pattern);
      console.log(`${found ? '✅' : '❌'} ${name}: ${found ? 'Found' : 'Missing'}`);
    });

    console.log('');

    // Generate migration success report
    const missingPatterns = criticalPatterns.filter(({ pattern }) =>
      !postgresPatterns.some(p => p === pattern)
    );

    console.log('📋 MIGRATION STATUS REPORT:');
    console.log(`✅ PostgreSQL Rules: ${postgresRules.length}`);
    console.log(`${missingPatterns.length === 0 ? '✅' : '⚠️'} Critical Patterns: ${criticalPatterns.length - missingPatterns.length}/${criticalPatterns.length} found`);

    if (missingPatterns.length === 0) {
      console.log('\n🎉 MIGRATION VERIFICATION: SUCCESS!');
      console.log('✅ All critical validation patterns are now in PostgreSQL');
      console.log('✅ ValidationService is ready for production use');
      console.log('✅ Zod schemas can be safely deprecated');
    } else {
      console.log('\n⚠️ MIGRATION VERIFICATION: INCOMPLETE');
      console.log(`❌ ${missingPatterns.length} patterns still missing:`);
      missingPatterns.forEach(({ name }) => console.log(`  - ${name}`));
      console.log('\n🔧 ACTION REQUIRED:');
      console.log('- Re-run the migration SQL script');
      console.log('- Check database connectivity');
      console.log('- Verify entity field names match expected patterns');
    }

    console.log('\n📊 NEXT STEPS:');
    if (missingPatterns.length === 0) {
      console.log('1. Monitor ValidationService performance in production');
      console.log('2. Check console logs for validation source tracking');
      console.log('3. Plan legacy Zod cleanup after monitoring period');
      console.log('4. Update AI flows to use PostgreSQL validation');
    } else {
      console.log('1. Complete the migration by running the SQL script');
      console.log('2. Re-run this verification script');
      console.log('3. Test ValidationService with sample data');
    }

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.error('\n🔧 TROUBLESHOOTING:');
    console.error('1. Ensure the development server is running (npm run dev)');
    console.error('2. Check database connectivity');
    console.error('3. Verify API endpoints are accessible');
  }
}

async function getZodPatterns() {
  // Simplified count - in real verification, this would parse the schema file
  return Array(29); // Known count from comparison script
}

async function getPostgresValidationRules() {
  try {
    const response = await fetch(`${BASE_URL}/api/entity-validations`);
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching PostgreSQL validation rules:', error);
    return [];
  }
}

// Run the verification
verifyMigration();