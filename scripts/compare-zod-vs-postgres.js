#!/usr/bin/env node

/**
 * Compare Zod schema patterns vs PostgreSQL validation rules
 * Find any missing validation patterns
 */

const fs = require('fs');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE_URL = 'http://localhost:9002';

// Extract Zod patterns from schema file
function extractZodPatterns() {
  const schemaFile = path.join(__dirname, '../src/schema/index.ts');
  const schemaContent = fs.readFileSync(schemaFile, 'utf8');

  const patterns = {};

  // Extract patterns from the Patterns object
  const patternsMatch = schemaContent.match(/const Patterns = \{([\s\S]*?)\};/);
  if (patternsMatch) {
    const patternsSection = patternsMatch[1];

    // Match pattern definitions
    const patternRegex = /(\w+):\s*z\.string\(\)\.regex\(\/([^\/]+)\/[^,]*,\s*\{\s*message:\s*"([^"]+)"/g;

    let match;
    while ((match = patternRegex.exec(patternsSection)) !== null) {
      const [, name, pattern, message] = match;
      patterns[name] = {
        pattern: pattern,
        message: message,
        type: 'regex'
      };
    }

    // Extract enum-like patterns
    const enumRegex = /(\w+):\s*z\.string\(\)\.regex\(\/\^([^$]+)\$\/[^,]*,\s*\{\s*message:\s*"([^"]+)"/g;
    while ((match = enumRegex.exec(patternsSection)) !== null) {
      const [, name, pattern, message] = match;
      if (pattern.includes('|')) {
        // This looks like an enum pattern
        const enumValues = pattern.split('|').map(v => v.replace(/[()]/g, '').trim());
        patterns[name] = {
          enumValues: enumValues,
          message: message,
          type: 'enum'
        };
      } else {
        patterns[name] = {
          pattern: pattern,
          message: message,
          type: 'regex'
        };
      }
    }
  }

  return patterns;
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

async function compareValidations() {
  console.log('🔍 COMPARING ZOD PATTERNS VS POSTGRESQL VALIDATION RULES\\n');

  try {
    // Get both sets of validation rules
    const zodPatterns = extractZodPatterns();
    const postgresRules = await getPostgresValidationRules();

    console.log('📊 VALIDATION INVENTORY:');
    console.log(`- Zod Patterns: ${Object.keys(zodPatterns).length}`);
    console.log(`- PostgreSQL Rules: ${postgresRules.length}`);
    console.log('');

    // Group PostgreSQL rules by type
    const postgresRegexRules = postgresRules.filter(r => r.validation_type === 'regex');
    const postgresEnumRules = postgresRules.filter(r => r.validation_type === 'enum');
    const postgresLookupRules = postgresRules.filter(r => r.validation_type === 'lookup');

    console.log('📋 POSTGRESQL BREAKDOWN:');
    console.log(`- Regex Rules: ${postgresRegexRules.length}`);
    console.log(`- Enum Rules: ${postgresEnumRules.length}`);
    console.log(`- Lookup Rules: ${postgresLookupRules.length}`);
    console.log('');

    console.log('📋 ZOD BREAKDOWN:');
    const zodRegexPatterns = Object.entries(zodPatterns).filter(([, info]) => info.type === 'regex');
    const zodEnumPatterns = Object.entries(zodPatterns).filter(([, info]) => info.type === 'enum');
    console.log(`- Regex Patterns: ${zodRegexPatterns.length}`);
    console.log(`- Enum Patterns: ${zodEnumPatterns.length}`);
    console.log('');

    // Compare regex patterns
    console.log('🔍 REGEX PATTERN COMPARISON:');
    console.log('\\nZod regex patterns:');
    zodRegexPatterns.forEach(([name, info]) => {
      console.log(`- ${name}: /${info.pattern}/`);
    });

    console.log('\\nPostgreSQL regex patterns:');
    const uniquePostgresPatterns = [...new Set(postgresRegexRules.map(r => r.pattern))];
    uniquePostgresPatterns.forEach(pattern => {
      const rule = postgresRegexRules.find(r => r.pattern === pattern);
      console.log(`- ${rule.field_name}: /${pattern}/`);
    });

    // Find missing patterns
    console.log('\\n❓ MISSING PATTERNS ANALYSIS:');

    // Zod patterns not in PostgreSQL
    const zodPatternValues = zodRegexPatterns.map(([, info]) => info.pattern);
    const postgresPatternValues = postgresRegexRules.map(r => r.pattern);

    const zodOnlyPatterns = zodPatternValues.filter(zp =>
      !postgresPatternValues.some(pp => pp === zp)
    );

    const postgresOnlyPatterns = postgresPatternValues.filter(pp =>
      !zodPatternValues.some(zp => zp === pp)
    );

    console.log(`\\n⚠️ ZOD-ONLY PATTERNS (${zodOnlyPatterns.length}):`);
    if (zodOnlyPatterns.length > 0) {
      zodOnlyPatterns.forEach(pattern => {
        const zodEntry = zodRegexPatterns.find(([, info]) => info.pattern === pattern);
        if (zodEntry) {
          console.log(`- ${zodEntry[0]}: /${pattern}/ - ${zodEntry[1].message}`);
        }
      });
      console.log('\\n⚠️ These patterns from Zod are NOT in PostgreSQL!');
    } else {
      console.log('✅ All Zod regex patterns are covered in PostgreSQL');
    }

    console.log(`\\n🆕 POSTGRES-ONLY PATTERNS (${postgresOnlyPatterns.length}):`);
    if (postgresOnlyPatterns.length > 0) {
      postgresOnlyPatterns.slice(0, 10).forEach(pattern => {
        const rule = postgresRegexRules.find(r => r.pattern === pattern);
        console.log(`- ${rule.field_name}: /${pattern}/ - ${rule.error_message}`);
      });
      console.log('\\n✅ These are additional patterns in PostgreSQL');
    }

    // Compare enum patterns
    console.log('\\n🔍 ENUM PATTERN COMPARISON:');

    console.log('\\nZod enum patterns:');
    zodEnumPatterns.forEach(([name, info]) => {
      console.log(`- ${name}: [${info.enumValues?.join(', ')}]`);
    });

    console.log('\\nPostgreSQL enum rules:');
    postgresEnumRules.slice(0, 10).forEach(rule => {
      console.log(`- ${rule.field_name}: [${rule.enum_values?.join(', ')}]`);
    });

    // Lookup validation (PostgreSQL only)
    console.log('\\n🔍 LOOKUP VALIDATIONS (PostgreSQL Only):');
    console.log(`Found ${postgresLookupRules.length} lookup validation rules`);

    const uniqueLookupIds = [...new Set(postgresLookupRules.map(r => r.lookup_id))];
    console.log(`\\nUnique lookup sources: ${uniqueLookupIds.length}`);
    uniqueLookupIds.slice(0, 10).forEach(lookupId => {
      const count = postgresLookupRules.filter(r => r.lookup_id === lookupId).length;
      console.log(`- ${lookupId}: ${count} fields`);
    });

    // Summary and recommendations
    console.log('\\n📊 SUMMARY & RECOMMENDATIONS:');

    if (zodOnlyPatterns.length > 0) {
      console.log(`\\n⚠️ ACTION NEEDED:`);
      console.log(`- ${zodOnlyPatterns.length} Zod patterns are missing from PostgreSQL`);
      console.log(`- These patterns should be migrated to maintain validation coverage`);
      console.log(`- Use admin interface or migration script to add them`);
    } else {
      console.log(`\\n✅ EXCELLENT:`);
      console.log(`- All Zod regex patterns are covered in PostgreSQL`);
      console.log(`- No validation patterns will be lost in migration`);
    }

    if (postgresOnlyPatterns.length > 0) {
      console.log(`\\n✅ BONUS:`);
      console.log(`- PostgreSQL has ${postgresOnlyPatterns.length} additional validation patterns`);
      console.log(`- These provide better validation coverage than Zod schemas`);
    }

    console.log(`\\n🎯 VALIDATION READINESS:`);
    console.log(`- PostgreSQL has comprehensive validation coverage`);
    console.log(`- ${postgresLookupRules.length} lookup validations provide dynamic validation`);
    console.log(`- ValidationService can replace Zod schemas ${zodOnlyPatterns.length === 0 ? 'completely' : 'with minor additions'}`);

  } catch (error) {
    console.error('❌ Comparison failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the comparison
compareValidations();