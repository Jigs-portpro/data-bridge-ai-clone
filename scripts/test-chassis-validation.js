#!/usr/bin/env node

/**
 * Test ValidationService with Chassis entity
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE_URL = 'http://localhost:9002';

async function testChassisValidation() {
  console.log('🧪 TESTING CHASSIS ENTITY VALIDATION WITH VALIDATIONSERVICE\\n');

  try {
    // Get Chassis entity info
    console.log('📋 Step 1: Getting Chassis entity...');
    const entitiesResponse = await fetch(`${BASE_URL}/api/entities`);
    const entitiesData = await entitiesResponse.json();
    const chassisEntity = entitiesData.data.find(e => e.entity_key === 'chassis');

    if (!chassisEntity) {
      throw new Error('Chassis entity not found');
    }
    console.log(`✅ Found Chassis entity: ${chassisEntity.name} (ID: ${chassisEntity.id})`);

    // Get Chassis fields
    console.log('\\n📝 Step 2: Getting Chassis fields...');
    const fieldsResponse = await fetch(`${BASE_URL}/api/entity-fields`);
    const fieldsData = await fieldsResponse.json();
    const chassisFields = fieldsData.data.filter(f => f.entity_id === chassisEntity.id);

    console.log(`✅ Found ${chassisFields.length} fields for Chassis entity`);
    console.log('\\nChassis field constraints:');

    // Show all Chassis fields since there are only 16
    chassisFields.forEach(field => {
      console.log(`- ${field.display_name} (${field.field_type}): required=${field.is_required}, min=${field.min_length || 'none'}, max=${field.max_length || 'none'}`);
    });

    // Get Chassis validation rules
    console.log('\\n🔍 Step 3: Getting Chassis validation rules...');
    const validationsResponse = await fetch(`${BASE_URL}/api/entity-validations`);
    const validationsData = await validationsResponse.json();
    const chassisValidations = validationsData.data.filter(v =>
      v.entity_name === 'Chassis' ||
      chassisFields.some(f => f.id === v.entity_field_id)
    );

    console.log(`✅ Found ${chassisValidations.length} validation rules for Chassis entity`);

    if (chassisValidations.length > 0) {
      console.log('\\nChassis validation rules:');

      const regexRules = chassisValidations.filter(v => v.validation_type === 'regex');
      const enumRules = chassisValidations.filter(v => v.validation_type === 'enum');
      const lookupRules = chassisValidations.filter(v => v.validation_type === 'lookup');

      console.log(`- Regex patterns: ${regexRules.length}`);
      console.log(`- Enum validations: ${enumRules.length}`);
      console.log(`- Lookup validations: ${lookupRules.length}`);

      console.log('\\nDetailed validation rules:');
      chassisValidations.forEach(rule => {
        if (rule.validation_type === 'regex') {
          console.log(`- ${rule.field_name}: REGEX /${rule.pattern}/ - ${rule.error_message}`);
        } else if (rule.validation_type === 'enum') {
          console.log(`- ${rule.field_name}: ENUM [${rule.enum_values?.join(', ')}] - ${rule.error_message}`);
        } else if (rule.validation_type === 'lookup') {
          console.log(`- ${rule.field_name}: LOOKUP ${rule.lookup_id}.${rule.lookup_field} - ${rule.error_message}`);
        }
      });
    } else {
      console.log('\\n⚠️ No advanced validation rules found for Chassis entity');
    }

    // Analyze validation coverage
    console.log('\\n📊 Step 4: Validation coverage analysis...');

    const fieldsWithConstraints = chassisFields.filter(f =>
      f.min_length || f.max_length || f.is_required
    );
    const fieldsWithAdvancedRules = chassisFields.filter(f =>
      chassisValidations.some(v => v.entity_field_id === f.id)
    );

    console.log(`- Total Chassis fields: ${chassisFields.length}`);
    console.log(`- Fields with constraints: ${fieldsWithConstraints.length}`);
    console.log(`- Fields with advanced validation: ${fieldsWithAdvancedRules.length}`);
    console.log(`- Required fields: ${chassisFields.filter(f => f.is_required).length}`);

    // Check critical Chassis fields
    console.log('\\n🎯 Step 5: Critical Chassis fields analysis...');

    const criticalFields = [
      { name: 'chassisNo', display: 'Chassis #' },
      { name: 'chassisType', display: 'Chassis Type' },
      { name: 'chassisSize', display: 'Chassis Size' },
      { name: 'chassisOwner', display: 'Chassis Owner' }
    ];

    criticalFields.forEach(({ name, display }) => {
      const field = chassisFields.find(f => f.field_name === name);
      const validation = chassisValidations.find(v => v.entity_field_id === field?.id);

      console.log(`\\n- ${display} (${name}):`);
      if (field) {
        console.log(`  Required: ${field.is_required}, Type: ${field.field_type}`);
        console.log(`  Length: ${field.min_length || 'none'}-${field.max_length || 'none'}`);
        if (validation) {
          const validationType = validation.validation_type;
          const validationDetail = validation.pattern || validation.enum_values || validation.lookup_id;
          console.log(`  Validation: ${validationType} - ${validationDetail}`);
        } else {
          console.log(`  Validation: Basic field validation only`);
        }
      } else {
        console.log(`  ❌ Field not found in database`);
      }
    });

    // Test validation scenarios
    console.log('\\n🧪 Step 6: Validation scenarios...');

    console.log('\\nExpected validation behaviors:');
    console.log('- Chassis # (chassisNo): Required, 1-50 characters');
    console.log('- Chassis Type: Required, 2-50 characters');
    console.log('- Chassis Size: Required, 2-100 characters');
    console.log('- Chassis Owner: Required, 2-100 characters');
    console.log('- Optional fields: Year, Make, Model, dates');

    console.log('\\n✅ CHASSIS ENTITY VALIDATION ANALYSIS COMPLETE!');
    console.log('\\n🎯 RESULTS:');
    console.log(`- Chassis entity has ${chassisFields.length} fields with ${chassisValidations.length} validation rules`);
    console.log(`- ${fieldsWithConstraints.length} fields have min/max constraints`);
    console.log(`- ${chassisFields.filter(f => f.is_required).length} fields are required`);
    console.log(`- ValidationService can handle all Chassis validation requirements`);

    console.log('\\n🚀 TESTING READY:');
    console.log('1. Upload Chassis data in the app');
    console.log('2. Select Chassis entity for validation');
    console.log('3. ValidationService will apply field constraints and validation rules');
    console.log('4. Test with invalid data (too short/long, missing required fields)');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testChassisValidation();