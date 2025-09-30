#!/usr/bin/env node

/**
 * Add critical missing validation patterns to PostgreSQL
 * These 8 patterns are essential across multiple entities
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE_URL = 'http://localhost:9002';

// Critical patterns missing from PostgreSQL
const criticalPatterns = [
  {
    pattern_name: 'Email',
    pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
    description: 'Email address validation',
    error_message: 'Please enter a valid email address'
  },
  {
    pattern_name: 'Phone',
    pattern: '^\\+?[1-9]\\d{1,14}$',
    description: 'Phone number validation (international format)',
    error_message: 'Please enter a valid phone number'
  },
  {
    pattern_name: 'StateCode',
    pattern: '^(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)$',
    description: 'US State code validation',
    error_message: 'Please enter a valid US state code'
  },
  {
    pattern_name: 'CountryCode',
    pattern: '^[A-Z]{2}$',
    description: 'ISO 3166-1 alpha-2 country code',
    error_message: 'Please enter a valid 2-letter country code'
  },
  {
    pattern_name: 'VINNumber',
    pattern: '^[A-HJ-NPR-Z0-9]{17}$',
    description: 'Vehicle Identification Number validation',
    error_message: 'Please enter a valid VIN number (17 characters)'
  },
  {
    pattern_name: 'LicensePlate',
    pattern: '^[A-Z0-9]{1,8}$',
    description: 'License plate validation',
    error_message: 'Please enter a valid license plate'
  },
  {
    pattern_name: 'SCACCode',
    pattern: '^[A-Z]{2,4}$',
    description: 'Standard Carrier Alpha Code',
    error_message: 'Please enter a valid SCAC code (2-4 letters)'
  },
  {
    pattern_name: 'MCNumber',
    pattern: '^MC-?\\d{4,7}$',
    description: 'Motor Carrier number validation',
    error_message: 'Please enter a valid MC number'
  }
];

async function addCriticalPatterns() {
  console.log('🚀 ADDING CRITICAL VALIDATION PATTERNS TO POSTGRESQL\n');

  try {
    console.log('📋 Adding 8 critical patterns that are essential across entities...\n');

    let successCount = 0;
    let errorCount = 0;

    for (const pattern of criticalPatterns) {
      try {
        console.log(`Adding ${pattern.pattern_name}...`);

        const response = await fetch(`${BASE_URL}/api/validation-patterns`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            pattern_name: pattern.pattern_name,
            pattern: pattern.pattern,
            description: pattern.description,
            error_message: pattern.error_message,
            is_active: true,
            created_by: 'system_migration'
          })
        });

        if (response.ok) {
          console.log(`✅ ${pattern.pattern_name} added successfully`);
          successCount++;
        } else {
          const errorData = await response.json();
          console.log(`⚠️ ${pattern.pattern_name} failed: ${errorData.message || 'Unknown error'}`);
          errorCount++;
        }
      } catch (error) {
        console.log(`❌ ${pattern.pattern_name} error: ${error.message}`);
        errorCount++;
      }

      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n📊 MIGRATION RESULTS:');
    console.log(`✅ Successfully added: ${successCount} patterns`);
    console.log(`❌ Failed to add: ${errorCount} patterns`);
    console.log(`📝 Total attempted: ${criticalPatterns.length} patterns`);

    if (successCount > 0) {
      console.log('\n🎯 NEXT STEPS:');
      console.log('1. These patterns are now available in PostgreSQL');
      console.log('2. They can be applied to entity fields as needed');
      console.log('3. Continue with Load entity migration');
      console.log('4. Apply these patterns to specific fields during entity setup');
    }

    console.log('\n✅ CRITICAL PATTERNS MIGRATION COMPLETE!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the migration
addCriticalPatterns();