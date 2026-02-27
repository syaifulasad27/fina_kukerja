#!/usr/bin/env node
/**
 * Database Connection Test for Kukerja-Backend
 * Phase 3: Connection validation and collection discovery
 */
const fs = require('fs');
const { MongoClient } = require('mongodb');

function loadEnv(file){
  if(!fs.existsSync(file)) return {};
  const out={};
  for(const line of fs.readFileSync(file,'utf8').split(/\r?\n/)){
    if(!line || line.trim().startsWith('#')) continue;
    const i=line.indexOf('='); if(i<=0) continue;
    const k=line.slice(0,i).trim(); let v=line.slice(i+1).trim();
    if ((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) v=v.slice(1,-1);
    out[k]=v;
  }
  return out;
}

(async() => {
  const env = loadEnv('/root/.openclaw/workspace/fina_kukerja/.env');
  const uri = process.env.KUKERJA_MONGO_RO_URI || env.KUKERJA_MONGO_RO_URI;
  
  if(!uri){
    console.error('ERROR: KUKERJA_MONGO_RO_URI not set');
    process.exit(1);
  }

  console.log('=== KUKERJA DATABASE CONNECTION TEST ===\n');
  console.log('URI Pattern:', uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
  
  // Extract database name from URI
  const dbNameMatch = uri.match(/\/([^/?]+)(\?|$)/);
  const dbName = dbNameMatch ? dbNameMatch[1] : 'test';
  console.log('Database:', dbName);
  console.log('');

  const client = new MongoClient(uri, { 
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB successfully\n');
    
    const db = client.db(dbName);
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log(`📁 Found ${collections.length} collections:\n`);
    
    // Sort and display
    const sortedCollections = collections.sort((a,b) => a.name.localeCompare(b.name));
    
    // Check document counts
    console.log('Collection Name                          | Document Count');
    console.log('-'.repeat(60));
    
    for(const coll of sortedCollections){
      try {
        const count = await db.collection(coll.name).countDocuments();
        const namePadded = coll.name.padEnd(40);
        console.log(`${namePadded} | ${count}`);
      } catch(e) {
        console.log(`${coll.name.padEnd(40)} | ERROR: ${e.message}`);
      }
    }
    
    console.log('\n=== PRIORITY COLLECTIONS FOR FINA ===');
    const priorityCollections = [
      'payouts.salary',
      'payouts.salary.results',
      'payouts.salary.finalize',
      'bpjs.kesehatan.result',
      'bpjs.ketenagakerjaan.result',
      'pph.monthly',
      'pph.annual',
      'finance.record',
      'reimbursement.transactions',
      'user'
    ];
    
    console.log('Collection                               | Status');
    console.log('-'.repeat(60));
    
    for(const collName of priorityCollections){
      const exists = collections.some(c => c.name === collName);
      const status = exists ? '✅ EXISTS' : '❌ NOT FOUND';
      console.log(`${collName.padEnd(40)} | ${status}`);
    }
    
    // Sample data check
    console.log('\n=== SAMPLE DATA VERIFICATION ===');
    
    for(const collName of ['payouts.salary', 'user', 'finance.record']){
      if(collections.some(c => c.name === collName)){
        try {
          const sample = await db.collection(collName).findOne();
          if(sample){
            console.log(`\n${collName}:`);
            console.log('  _id:', sample._id);
            console.log('  Keys:', Object.keys(sample).slice(0, 10).join(', ') + (Object.keys(sample).length > 10 ? '...' : ''));
          } else {
            console.log(`\n${collName}: No documents found`);
          }
        } catch(e) {
          console.log(`\n${collName}: ERROR - ${e.message}`);
        }
      }
    }
    
    console.log('\n✅ Connection test completed successfully!');
    
  } catch(err) {
    console.error('\n❌ ERROR:', err.message);
    if(err.message.includes('authentication')){
      console.error('\nHint: Check credentials in KUKERJA_MONGO_RO_URI');
    } else if(err.message.includes('connect')){
      console.error('\nHint: Check network connectivity and MongoDB server status');
    }
    process.exit(1);
  } finally {
    await client.close();
    console.log('\nConnection closed');
  }
})();
