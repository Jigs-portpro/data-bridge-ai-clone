#!/usr/bin/env node

/**
 * Test ValidationService with Drivers entity
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE_URL = 'http://localhost:9002';

async function testDriversValidation() {
  console.log('🧪 TESTING DRIVERS ENTITY VALIDATION WITH VALIDATIONSERVICE\n');

  try {
    // Get Drivers entity info
    console.log('📋 Step 1: Getting Drivers entity...');
    const entitiesResponse = await fetch(`${BASE_URL}/api/entities`);
    const entitiesData = await entitiesResponse.json();
    const driversEntity = entitiesData.data.find(e => e.entity_key === 'drivers');

    if (!driversEntity) {
      throw new Error('Drivers entity not found');
    }
    console.log(`✅ Found Drivers entity: ${driversEntity.name} (ID: ${driversEntity.id})`);

    // Get Drivers fields
    console.log('\n📝 Step 2: Getting Drivers fields...');
    const fieldsResponse = await fetch(`${BASE_URL}/api/entity-fields`);
    const fieldsData = await fieldsResponse.json();
    const driversFields = fieldsData.data.filter(f => f.entity_id === driversEntity.id);

    console.log(`✅ Found ${driversFields.length} fields for Drivers entity`);

    // Get Drivers validation rules
    console.log('\n🔍 Step 3: Getting Drivers validation rules...');
    const validationsResponse = await fetch(`${BASE_URL}/api/entity-validations`);
    const validationsData = await validationsResponse.json();
    const driversValidations = validationsData.data.filter(v =>
      v.entity_name === 'Drivers' ||
      driversFields.some(f => f.id === v.entity_field_id)
    );

    console.log(`✅ Found ${driversValidations.length} validation rules for Drivers entity`);
    console.log(`- Required fields: ${driversFields.filter(f => f.is_required).length}`);
    console.log(`- Fields with constraints: ${driversFields.filter(f => f.min_length || f.max_length).length}`);

    if (driversValidations.length > 0) {
      const regexRules = driversValidations.filter(v => v.validation_type === 'regex');
      const enumRules = driversValidations.filter(v => v.validation_type === 'enum');
      const lookupRules = driversValidations.filter(v => v.validation_type === 'lookup');
      console.log(`- Regex patterns: ${regexRules.length}`);
      console.log(`- Enum validations: ${enumRules.length}`);
      console.log(`- Lookup validations: ${lookupRules.length}`);
    }

    console.log('\n🎯 RESULT:');
    console.log(`Drivers entity ready for ValidationService integration with ${driversFields.length} fields and ${driversValidations.length} validation rules.`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testDriversValidation();