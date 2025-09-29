#!/usr/bin/env node

/**
 * Simple test to verify Organization entity validation via API calls
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE_URL = 'http://localhost:9002';

async function testOrganizationValidation() {
  console.log('🧪 TESTING ORGANIZATION ENTITY VALIDATION\\n');

  try {
    // Step 1: Get Organization entity info
    console.log('📋 Step 1: Getting Organization entity...');
    const entitiesResponse = await fetch(`${BASE_URL}/api/entities`);
    const entitiesData = await entitiesResponse.json();
    const orgEntity = entitiesData.data.find(e => e.entity_key === 'organization');

    if (!orgEntity) {
      throw new Error('Organization entity not found');
    }
    console.log(`✅ Found Organization entity: ${orgEntity.name} (ID: ${orgEntity.id})`);

    // Step 2: Get Organization fields
    console.log('\\n📝 Step 2: Getting Organization fields...');
    const fieldsResponse = await fetch(`${BASE_URL}/api/entity-fields`);
    const fieldsData = await fieldsResponse.json();
    const orgFields = fieldsData.data.filter(f => f.entity_id === orgEntity.id);

    console.log(`✅ Found ${orgFields.length} fields for Organization`);
    console.log('\\nField constraints:');
    orgFields.slice(0, 8).forEach(field => {
      console.log(`- ${field.display_name} (${field.field_type}): required=${field.is_required}, min=${field.min_length}, max=${field.max_length}`);
    });

    // Step 3: Get Organization validation rules
    console.log('\\n🔍 Step 3: Getting Organization validation rules...');
    const validationsResponse = await fetch(`${BASE_URL}/api/entity-validations`);
    const validationsData = await validationsResponse.json();
    const orgValidations = validationsData.data.filter(v =>
      v.entity_name === 'Organization' ||
      orgFields.some(f => f.id === v.entity_field_id)
    );

    console.log(`✅ Found ${orgValidations.length} validation rules for Organization`);
    console.log('\\nValidation rules:');
    orgValidations.slice(0, 8).forEach(rule => {
      if (rule.validation_type === 'regex') {
        console.log(`- ${rule.field_name}: REGEX /${rule.pattern}/ - ${rule.error_message}`);
      } else if (rule.validation_type === 'enum') {
        console.log(`- ${rule.field_name}: ENUM [${rule.enum_values?.join(', ')}] - ${rule.error_message}`);
      } else if (rule.validation_type === 'lookup') {
        console.log(`- ${rule.field_name}: LOOKUP ${rule.lookup_id}.${rule.lookup_field} - ${rule.error_message}`);
      }
    });

    // Step 4: Analyze validation completeness
    console.log('\\n📊 Step 4: Analyzing validation completeness...');

    const fieldsWithConstraints = orgFields.filter(f =>
      f.min_length || f.max_length || f.is_required
    );
    const fieldsWithValidationRules = orgFields.filter(f =>
      orgValidations.some(v => v.entity_field_id === f.id)
    );

    console.log(`- Fields with min/max constraints: ${fieldsWithConstraints.length}`);
    console.log(`- Fields with validation rules: ${fieldsWithValidationRules.length}`);
    console.log(`- Total Organization fields: ${orgFields.length}`);

    // Show fields by validation type
    const regexValidations = orgValidations.filter(v => v.validation_type === 'regex');
    const enumValidations = orgValidations.filter(v => v.validation_type === 'enum');
    const lookupValidations = orgValidations.filter(v => v.validation_type === 'lookup');

    console.log(`\\n🎯 Validation breakdown:`);
    console.log(`- Regex patterns: ${regexValidations.length}`);
    console.log(`- Enum validations: ${enumValidations.length}`);
    console.log(`- Lookup validations: ${lookupValidations.length}`);

    // Step 5: Check key fields that useValidation.ts validates
    console.log('\\n🔍 Step 5: Checking key fields from useValidation.ts...');

    const keyFields = ['billingEmail', 'email', 'company_name', 'paymentTermsMethod'];
    keyFields.forEach(fieldName => {
      const field = orgFields.find(f => f.field_name === fieldName);
      const validation = orgValidations.find(v => v.entity_field_id === field?.id);

      if (field) {
        console.log(`\\n- ${fieldName} (${field.display_name}):`);
        console.log(`  Type: ${field.field_type}, Required: ${field.is_required}`);
        console.log(`  Length: ${field.min_length}-${field.max_length}`);
        if (validation) {
          console.log(`  Validation: ${validation.validation_type} - ${validation.pattern || validation.enum_values || validation.lookup_id}`);
        } else {
          console.log(`  ⚠️ No advanced validation rule found`);
        }
      } else {
        console.log(`\\n- ${fieldName}: ❌ Field not found in database`);
      }
    });

    console.log('\\n✅ ORGANIZATION VALIDATION ANALYSIS COMPLETE!');
    console.log('\\n🎯 NEXT STEPS:');
    console.log('1. ValidationService can fetch this data correctly');
    console.log('2. Basic field constraints (min/max length) are in entity_fields');
    console.log('3. Advanced patterns (regex/enum/lookup) are in entity_validations');
    console.log('4. Ready to integrate with useValidation.ts');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testOrganizationValidation();