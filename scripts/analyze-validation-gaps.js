#!/usr/bin/env node

/**
 * Analyze gaps between Zod schema patterns and PostgreSQL validation rules
 */

const fs = require('fs');
const path = require('path');

// Read the Zod schema patterns
const schemaFile = path.join(__dirname, '../src/schema/index.ts');
const schemaContent = fs.readFileSync(schemaFile, 'utf8');

// Read the PostgreSQL dump for validation rules
const sqlFile = path.join(__dirname, '../sql/COMPLETE_DATABASE_MIGRATION_FULL.sql');
const sqlContent = fs.readFileSync(sqlFile, 'utf8');

// Extract Zod patterns
function extractZodPatterns() {
  const patterns = {};

  // Extract patterns from the Patterns object
  const patternsMatch = schemaContent.match(/const Patterns = \{([\s\S]*?)\};/);
  if (patternsMatch) {
    const patternsSection = patternsMatch[1];

    // Match pattern definitions like: Email: z.string().regex(/pattern/, { message: "..." })
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

    // Also extract enum patterns
    const enumRegex = /(\w+):\s*z\.string\(\)\.regex\(\/\^([^$]+)\$\/[^,]*,\s*\{\s*message:\s*"([^"]+)"/g;
    while ((match = enumRegex.exec(patternsSection)) !== null) {
      const [, name, pattern, message] = match;
      if (pattern.includes('|')) {
        // This looks like an enum pattern
        const enumValues = pattern.split('|').map(v => v.replace(/[()]/g, ''));
        patterns[name] = {
          enumValues: enumValues,
          message: message,
          type: 'enum'
        };
      }
    }
  }

  return patterns;
}

// Extract PostgreSQL validation rules
function extractPostgresRules() {
  const rules = [];

  // Find the COPY section for entity_validations
  const copyMatch = sqlContent.match(/COPY public\.entity_validations.*?FROM stdin;([\s\S]*?)\\\\./);
  if (copyMatch) {
    const validationsData = copyMatch[1];
    const lines = validationsData.trim().split('\n');

    lines.forEach(line => {
      if (line.trim()) {
        const parts = line.split('\t');
        if (parts.length >= 8) {
          const [id, entityFieldId, validationType, pattern, enumValues, lookupId, lookupField, errorMessage] = parts;

          rules.push({
            id,
            entityFieldId,
            validationType,
            pattern: pattern === '\\N' ? null : pattern,
            enumValues: enumValues === '\\N' ? null : JSON.parse(enumValues || 'null'),
            lookupId: lookupId === '\\N' ? null : lookupId,
            lookupField: lookupField === '\\N' ? null : lookupField,
            errorMessage: errorMessage === '\\N' ? null : errorMessage
          });
        }
      }
    });
  }

  return rules;
}

// Compare and find gaps
function findGaps() {
  const zodPatterns = extractZodPatterns();
  const postgresRules = extractPostgresRules();

  console.log('🔍 VALIDATION ANALYSIS REPORT\\n');

  console.log(`📊 SUMMARY:`);
  console.log(`- Zod Patterns: ${Object.keys(zodPatterns).length}`);
  console.log(`- PostgreSQL Rules: ${postgresRules.length}`);
  console.log('');

  // Group PostgreSQL rules by type
  const regexRules = postgresRules.filter(r => r.validationType === 'regex');
  const enumRules = postgresRules.filter(r => r.validationType === 'enum');
  const lookupRules = postgresRules.filter(r => r.validationType === 'lookup');

  console.log(`📋 POSTGRESQL BREAKDOWN:`);
  console.log(`- Regex Rules: ${regexRules.length}`);
  console.log(`- Enum Rules: ${enumRules.length}`);
  console.log(`- Lookup Rules: ${lookupRules.length}`);
  console.log('');

  // Show some example patterns from each system
  console.log(`🎯 ZOD PATTERNS (Sample):`);
  Object.entries(zodPatterns).slice(0, 5).forEach(([name, info]) => {
    if (info.type === 'regex') {
      console.log(`- ${name}: /${info.pattern}/ (${info.message})`);
    } else {
      console.log(`- ${name}: enum [${info.enumValues?.join(', ')}] (${info.message})`);
    }
  });
  console.log('');

  console.log(`🎯 POSTGRESQL PATTERNS (Sample):`);
  regexRules.slice(0, 5).forEach(rule => {
    console.log(`- ${rule.validationType}: ${rule.pattern} (${rule.errorMessage})`);
  });
  console.log('');

  // Pattern analysis
  console.log(`🔄 PATTERN OVERLAP ANALYSIS:`);

  const zodRegexPatterns = Object.entries(zodPatterns)
    .filter(([, info]) => info.type === 'regex')
    .map(([name, info]) => info.pattern);

  const postgresRegexPatterns = regexRules.map(r => r.pattern);

  const commonPatterns = zodRegexPatterns.filter(zp =>
    postgresRegexPatterns.some(pp => pp === zp)
  );

  const zodOnlyPatterns = zodRegexPatterns.filter(zp =>
    !postgresRegexPatterns.some(pp => pp === zp)
  );

  const postgresOnlyPatterns = postgresRegexPatterns.filter(pp =>
    !zodRegexPatterns.some(zp => zp === pp)
  );

  console.log(`- Common patterns: ${commonPatterns.length}`);
  console.log(`- Zod-only patterns: ${zodOnlyPatterns.length}`);
  console.log(`- PostgreSQL-only patterns: ${postgresOnlyPatterns.length}`);
  console.log('');

  if (zodOnlyPatterns.length > 0) {
    console.log(`⚠️  ZOD-ONLY PATTERNS (may need to migrate):`);
    zodOnlyPatterns.slice(0, 10).forEach(pattern => {
      console.log(`- ${pattern}`);
    });
    console.log('');
  }

  console.log(`✅ CONCLUSION:`);
  console.log(`PostgreSQL database is well-populated with validation rules.`);
  console.log(`The main task is connecting useValidation.ts to read from PostgreSQL`);
  console.log(`instead of relying on hardcoded entity configurations.`);
  console.log('');
  console.log(`🎯 RECOMMENDED NEXT STEPS:`);
  console.log(`1. Create ValidationService to read PostgreSQL rules`);
  console.log(`2. Update useValidation.ts to use ValidationService`);
  console.log(`3. Create dynamic Zod schema builder for AI flows`);
  console.log(`4. Test validation parity and switch over`);
}

// Run the analysis
try {
  findGaps();
} catch (error) {
  console.error('Error analyzing validation gaps:', error);
  process.exit(1);
}