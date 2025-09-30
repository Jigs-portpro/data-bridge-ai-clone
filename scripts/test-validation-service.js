#!/usr/bin/env node

/**
 * Test ValidationService with Organization entity
 * Verifies PostgreSQL validation rules work correctly
 */

import { validationService } from '../src/lib/validation/ValidationService.js';

// Test data for Organization entity
const testData = {
  // Valid data
  validOrganization: {
    'Company Name': 'Test Company LLC',
    'Address': '123 Main Street',
    'City': 'New York',
    'State': 'NY',
    'Country': 'US',
    'Zip Code': '12345',
    'Billing Email': 'billing@testcompany.com',
    'Organization Type': 'CUSTOMER'
  },

  // Invalid data (min length violations)
  invalidMinLength: {
    'Company Name': 'X', // min_length: 2
    'Address': '123', // min_length: 5
    'City': 'A', // min_length: 2
    'Billing Email': 'invalid-email'
  },

  // Invalid data (max length violations)
  invalidMaxLength: {
    'Company Name': 'A'.repeat(101), // max_length: 100
    'Address': 'A'.repeat(201), // max_length: 200
    'City': 'A'.repeat(51) // max_length: 50
  },

  // Invalid regex patterns
  invalidPatterns: {
    'Billing Email': 'not-an-email',
    'State': 'New York', // should be 2-letter code
    'Country': 'United States' // should be 2-letter code
  }
};

// Mock field mappings (display name -> source column)
const fieldMappings = {
  'Company Name': 'Company Name',
  'Address': 'Address',
  'City': 'City',
  'State': 'State',
  'Country': 'Country',
  'Zip Code': 'Zip Code',
  'Billing Email': 'Billing Email',
  'Organization Type': 'Organization Type'
};

// Mock lookup data sources (empty for now)
const lookupDataSources = {};

async function testValidationService() {
  console.log('🧪 TESTING VALIDATION SERVICE WITH ORGANIZATION ENTITY\\n');

  try {
    // Test 1: Get entity fields
    console.log('📋 Test 1: Fetching Organization entity fields...');
    const fields = await validationService.getEntityFields('organization');
    console.log(`✅ Found ${fields.length} fields for Organization entity`);

    // Show first few fields with constraints
    console.log('\\n📝 Sample fields with constraints:');
    fields.slice(0, 5).forEach(field => {
      console.log(`- ${field.display_name} (${field.field_type}): required=${field.is_required}, min=${field.min_length}, max=${field.max_length}`);
    });

    // Test 2: Get validation rules
    console.log('\\n\\n🔍 Test 2: Fetching Organization validation rules...');
    const rules = await validationService.getValidationRules('organization');
    console.log(`✅ Found ${rules.length} validation rules for Organization entity`);

    // Show sample rules
    console.log('\\n📝 Sample validation rules:');
    rules.slice(0, 5).forEach(rule => {
      console.log(`- ${rule.validation_type}: ${rule.pattern || rule.enum_values || rule.lookup_id} (${rule.error_message})`);
    });

    // Test 3: Validate valid data
    console.log('\\n\\n✅ Test 3: Validating VALID Organization data...');
    const validResult = await validationService.validateRow(
      'organization',
      testData.validOrganization,
      fieldMappings,
      lookupDataSources,
      1
    );
    console.log(`Result: ${validResult.isValid ? '✅ VALID' : '❌ INVALID'}`);
    if (!validResult.isValid) {
      console.log('Unexpected errors:', validResult.errors);
    }

    // Test 4: Validate min length violations
    console.log('\\n\\n❌ Test 4: Validating MIN LENGTH violations...');
    const minLengthResult = await validationService.validateRow(
      'organization',
      testData.invalidMinLength,
      fieldMappings,
      lookupDataSources,
      2
    );
    console.log(`Result: ${minLengthResult.isValid ? '⚠️ UNEXPECTED VALID' : '✅ CORRECTLY INVALID'}`);
    console.log(`Found ${minLengthResult.errors.length} validation errors:`);
    minLengthResult.errors.forEach(error => {
      console.log(`  - ${error.field}: ${error.message}`);
    });

    // Test 5: Validate max length violations
    console.log('\\n\\n❌ Test 5: Validating MAX LENGTH violations...');
    const maxLengthResult = await validationService.validateRow(
      'organization',
      testData.invalidMaxLength,
      fieldMappings,
      lookupDataSources,
      3
    );
    console.log(`Result: ${maxLengthResult.isValid ? '⚠️ UNEXPECTED VALID' : '✅ CORRECTLY INVALID'}`);
    console.log(`Found ${maxLengthResult.errors.length} validation errors:`);
    maxLengthResult.errors.forEach(error => {
      console.log(`  - ${error.field}: ${error.message}`);
    });

    // Test 6: Validate pattern violations
    console.log('\\n\\n❌ Test 6: Validating PATTERN violations...');
    const patternResult = await validationService.validateRow(
      'organization',
      testData.invalidPatterns,
      fieldMappings,
      lookupDataSources,
      4
    );
    console.log(`Result: ${patternResult.isValid ? '⚠️ UNEXPECTED VALID' : '✅ CORRECTLY INVALID'}`);
    console.log(`Found ${patternResult.errors.length} validation errors:`);
    patternResult.errors.forEach(error => {
      console.log(`  - ${error.field}: ${error.message}`);
    });

    // Test 7: Individual field validation
    console.log('\\n\\n🎯 Test 7: Individual field validation...');

    const emailErrors = await validationService.validateField(
      'organization',
      'billingEmail',
      'invalid-email',
      lookupDataSources
    );
    console.log(`Email validation errors (${emailErrors.length}):`);
    emailErrors.forEach(error => console.log(`  - ${error.message}`));

    const companyNameErrors = await validationService.validateField(
      'organization',
      'company_name',
      'A', // Too short
      lookupDataSources
    );
    console.log(`Company Name validation errors (${companyNameErrors.length}):`);
    companyNameErrors.forEach(error => console.log(`  - ${error.message}`));

    console.log('\\n\\n🎉 VALIDATION SERVICE TEST COMPLETED!');
    console.log('\\n📊 SUMMARY:');
    console.log(`- Entity fields loaded: ${fields.length}`);
    console.log(`- Validation rules loaded: ${rules.length}`);
    console.log(`- Basic validation: ${validResult.isValid ? 'WORKING' : 'NEEDS REVIEW'}`);
    console.log(`- Min length validation: ${minLengthResult.errors.length > 0 ? 'WORKING' : 'NEEDS REVIEW'}`);
    console.log(`- Max length validation: ${maxLengthResult.errors.length > 0 ? 'WORKING' : 'NEEDS REVIEW'}`);
    console.log(`- Pattern validation: ${patternResult.errors.length > 0 ? 'WORKING' : 'NEEDS REVIEW'}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testValidationService();