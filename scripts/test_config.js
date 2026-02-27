#!/usr/bin/env node
/**
 * Fina Configuration Test Script
 * Phase 2: Verify kukerja-backend connection and schema
 */

const fs = require('fs');
const path = require('path');

// Simple dotenv parser
function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  for (const line of lines) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (match) {
      const key = match[1];
      let value = match[2].trim();
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

// Load environment variables
const envPath = path.join(__dirname, '..', '.env');
loadEnv(envPath);

// Configuration
const CONFIG = {
  dataSource: path.join(__dirname, '..', 'config', 'data-source.json'),
  schemaMap: path.join(__dirname, '..', 'schema', 'schema-map.json'),
  envFile: envPath
};

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, type = 'info') {
  const color = type === 'success' ? colors.green : 
                type === 'error' ? colors.red : 
                type === 'warning' ? colors.yellow : colors.blue;
  console.log(`${color}[${type.toUpperCase()}]${colors.reset} ${message}`);
}

function testConfig() {
  log('Starting configuration tests...', 'info');
  let passed = 0;
  let failed = 0;

  // Test 1: data-source.json exists and valid
  try {
    log('Testing data-source.json...');
    const dataSource = JSON.parse(fs.readFileSync(CONFIG.dataSource, 'utf8'));
    
    if (dataSource.project?.name !== 'kukerja-backend') {
      throw new Error('Project name should be kukerja-backend');
    }
    if (dataSource.database?.dbName !== 'kukerja') {
      throw new Error('Database name should be kukerja');
    }
    if (dataSource.database?.readUriEnv !== 'KUKERJA_MONGO_RO_URI') {
      throw new Error('Read URI env var should be KUKERJA_MONGO_RO_URI');
    }
    if (!dataSource.database?.collectionsAllowlist?.includes('payouts.salary')) {
      throw new Error('payouts.salary should be in allowlist');
    }
    
    log('✓ data-source.json is valid', 'success');
    passed++;
  } catch (err) {
    log(`✗ data-source.json: ${err.message}`, 'error');
    failed++;
  }

  // Test 2: schema-map.json exists and valid
  try {
    log('Testing schema-map.json...');
    const schemaMap = JSON.parse(fs.readFileSync(CONFIG.schemaMap, 'utf8'));
    
    if (!schemaMap.meta?.generatedAt) {
      throw new Error('Missing meta.generatedAt');
    }
    if (!Array.isArray(schemaMap.collections) || schemaMap.collections.length === 0) {
      throw new Error('No collections found in schema');
    }
    
    const requiredCollections = ['payouts.salary', 'pph.monthly', 'bpjs.kesehatan.result'];
    const collectionNames = schemaMap.collections.map(c => c.name);
    
    for (const coll of requiredCollections) {
      if (!collectionNames.includes(coll)) {
        throw new Error(`Required collection ${coll} not found`);
      }
    }
    
    log(`✓ schema-map.json is valid (${schemaMap.collections.length} collections)`, 'success');
    passed++;
  } catch (err) {
    log(`✗ schema-map.json: ${err.message}`, 'error');
    failed++;
  }

  // Test 3: Environment variables
  try {
    log('Testing environment variables...');
    
    const roUri = process.env.KUKERJA_MONGO_RO_URI;
    const rwUri = process.env.KUKERJA_MONGO_RW_URI;
    
    if (!roUri) {
      throw new Error('KUKERJA_MONGO_RO_URI not set');
    }
    if (!rwUri) {
      throw new Error('KUKERJA_MONGO_RW_URI not set');
    }
    if (!roUri.includes('/kukerja')) {
      log('Warning: RO URI may not point to kukerja database', 'warning');
    }
    
    log('✓ Environment variables are set', 'success');
    passed++;
  } catch (err) {
    log(`✗ Environment: ${err.message}`, 'error');
    failed++;
  }

  // Test 4: Validate constants mapping
  try {
    log('Testing constants mapping...');
    const dataSource = JSON.parse(fs.readFileSync(CONFIG.dataSource, 'utf8'));
    const constants = dataSource.constants;
    
    const requiredConstants = [
      'payoutsSalaryStatuses',
      'bpjsKetenagakerjaanTypes',
      'pphTerCategories'
    ];
    
    for (const constName of requiredConstants) {
      if (!constants?.[constName]) {
        throw new Error(`Missing constant: ${constName}`);
      }
    }
    
    log(`✓ Constants mapping valid (${Object.keys(constants).length} constants)`, 'success');
    passed++;
  } catch (err) {
    log(`✗ Constants: ${err.message}`, 'error');
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  log(`Tests completed: ${passed} passed, ${failed} failed`, failed > 0 ? 'error' : 'success');
  
  if (failed === 0) {
    log('\n✅ Configuration ready for kukerja-backend!', 'success');
    process.exit(0);
  } else {
    log('\n⚠️  Please fix the errors above before proceeding', 'error');
    process.exit(1);
  }
}

// Run tests
testConfig();
