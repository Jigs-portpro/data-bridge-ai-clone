#!/usr/bin/env node

/**
 * Test remaining entities for ValidationService migration
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE_URL = 'http://localhost:9002';

// Entities already migrated
const migratedEntities = ['organization', 'load', 'chassis', 'carrier', 'drivers'];

// Priority order for remaining entities
const priorityEntities = [
  'trucks', 'trailers', 'users', 'people',
  'chassis_owner', 'truck_owner', 'charge_profile',
  'perdiem', 'tariff'
];

async function testRemainingEntities() {
  console.log('🔍 ANALYZING REMAINING ENTITIES FOR VALIDATIONSERVICE MIGRATION\n');

  try {
    // Get all entities
    console.log('📋 Step 1: Getting all entities...');
    const entitiesResponse = await fetch(`${BASE_URL}/api/entities`);
    const entitiesData = await entitiesResponse.json();
    const allEntities = entitiesData.data;

    // Get all fields
    console.log('📝 Step 2: Getting all entity fields...');
    const fieldsResponse = await fetch(`${BASE_URL}/api/entity-fields`);
    const fieldsData = await fieldsResponse.json();
    const allFields = fieldsData.data;

    // Get all validation rules
    console.log('🔍 Step 3: Getting all validation rules...');
    const validationsResponse = await fetch(`${BASE_URL}/api/entity-validations`);
    const validationsData = await validationsResponse.json();
    const allValidations = validationsData.data;

    console.log('\n📊 REMAINING ENTITIES ANALYSIS:\n');

    for (const entityKey of priorityEntities) {
      const entity = allEntities.find(e => e.entity_key === entityKey);

      if (!entity) {
        console.log(`❌ ${entityKey} - Entity not found in database`);
        continue;
      }

      const entityFields = allFields.filter(f => f.entity_id === entity.id);
      const entityValidations = allValidations.filter(v =>
        v.entity_name === entity.name ||
        entityFields.some(f => f.id === v.entity_field_id)
      );

      const requiredFields = entityFields.filter(f => f.is_required).length;
      const constrainedFields = entityFields.filter(f => f.min_length || f.max_length).length;

      const regexRules = entityValidations.filter(v => v.validation_type === 'regex').length;
      const enumRules = entityValidations.filter(v => v.validation_type === 'enum').length;
      const lookupRules = entityValidations.filter(v => v.validation_type === 'lookup').length;

      console.log(`📁 ${entity.name.toUpperCase()} (${entityKey}):`);
      console.log(`   ├─ Fields: ${entityFields.length} total, ${requiredFields} required, ${constrainedFields} with constraints`);
      console.log(`   ├─ Validation Rules: ${entityValidations.length} total (${regexRules} regex, ${enumRules} enum, ${lookupRules} lookup)`);

      // Priority assessment
      let priority = 'Low';
      if (entityFields.length > 15 || entityValidations.length > 5) {
        priority = 'High';
      } else if (entityFields.length > 8 || entityValidations.length > 2) {
        priority = 'Medium';
      }

      console.log(`   └─ Migration Priority: ${priority}\n`);
    }

    // Summary
    const remainingEntitiesData = priorityEntities.map(entityKey => {
      const entity = allEntities.find(e => e.entity_key === entityKey);
      if (!entity) return null;

      const entityFields = allFields.filter(f => f.entity_id === entity.id);
      const entityValidations = allValidations.filter(v =>
        v.entity_name === entity.name ||
        entityFields.some(f => f.id === v.entity_field_id)
      );

      return {
        key: entityKey,
        name: entity.name,
        fieldCount: entityFields.length,
        validationCount: entityValidations.length
      };
    }).filter(Boolean);

    console.log('📊 MIGRATION SUMMARY:');
    console.log(`✅ Already migrated: ${migratedEntities.length} entities`);
    console.log(`⏳ Remaining to migrate: ${remainingEntitiesData.length} entities`);

    const totalRemainingFields = remainingEntitiesData.reduce((sum, e) => sum + e.fieldCount, 0);
    const totalRemainingValidations = remainingEntitiesData.reduce((sum, e) => sum + e.validationCount, 0);

    console.log(`📝 Total remaining fields: ${totalRemainingFields}`);
    console.log(`🔍 Total remaining validation rules: ${totalRemainingValidations}`);

    console.log('\n🎯 RECOMMENDED MIGRATION ORDER:');
    const sortedByComplexity = remainingEntitiesData
      .sort((a, b) => (b.fieldCount + b.validationCount) - (a.fieldCount + a.validationCount));

    sortedByComplexity.forEach((entity, index) => {
      console.log(`${index + 1}. ${entity.name} (${entity.fieldCount} fields, ${entity.validationCount} rules)`);
    });

    console.log('\n✅ ANALYSIS COMPLETE! Ready to start migration.');

  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the analysis
testRemainingEntities();