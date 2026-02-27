#!/usr/bin/env node
/**
 * Fina Get Data Script - Kukerja-Backend
 * Phase 3: Read data from kukerja MongoDB
 */
const fs = require('fs');
const { MongoClient } = require('mongodb');

// Load environment variables
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

// Load schema for validation
function loadSchema(){
  const schemaPath = '/root/.openclaw/workspace/fina_kukerja/schema/schema-map.json';
  if(!fs.existsSync(schemaPath)) return null;
  return JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
}

// Get allowed fields for collection
function allowedFieldsForCollection(collectionName){
  const schema = loadSchema();
  if(!schema || !schema.collections) return null;
  const coll = schema.collections.find(c => c.name === collectionName);
  if(!coll) return null;
  return new Set(coll.fields.map(f => f.name));
}

function usage(){
  console.log('Usage: node get_data.js --collection <name> [options]');
  console.log('');
  console.log('Options:');
  console.log('  --filter <json>    MongoDB filter (default: {deleted:{$ne:true}})');
  console.log('  --limit <n>        Max results (default: 20, max: 200)');
  console.log('  --sort <json>      Sort order (default: {_id:-1})');
  console.log('  --project <json>   Field projection');
  console.log('');
  console.log('Examples:');
  console.log('  node get_data.js --collection payouts.salary --limit 5');
  console.log('  node get_data.js --collection users --filter \'{"type":"Employee"}\'');
  process.exit(1);
}

function parseArgs(){
  const a=process.argv.slice(2);
  const o={
    limit: 20,
    filter: {deleted: {$ne: true}},
    sort: {_id: -1},
    project: null
  };
  for(let i=0; i<a.length; i++){
    if(a[i]==='--collection') o.collection=a[++i];
    else if(a[i]==='--filter') o.filter=JSON.parse(a[++i]);
    else if(a[i]==='--limit') o.limit=parseInt(a[++i], 10);
    else if(a[i]==='--sort') o.sort=JSON.parse(a[++i]);
    else if(a[i]==='--project') o.project=JSON.parse(a[++i]);
  }
  if(!o.collection) usage();
  return o;
}

function maskSensitiveData(doc){
  const masked = {...doc};
  // Mask NIK
  if(masked.nik && typeof masked.nik === 'string'){
    masked.nik = masked.nik.substring(0,2) + 'xxxxxxxxxx' + masked.nik.substring(-4);
  }
  // Mask NPWP
  if(masked.npwp && typeof masked.npwp === 'string'){
    masked.npwp = masked.npwp.substring(0,2) + '.xxx.xxx.x-xxx.' + masked.npwp.substring(-3);
  }
  // Mask other sensitive fields
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];
  for(const field of sensitiveFields){
    if(masked[field]) masked[field] = '***REDACTED***';
  }
  return masked;
}

(async()=>{
  const {collection, filter, limit, sort, project} = parseArgs();
  
  // Validate collection exists in schema
  const allowed = allowedFieldsForCollection(collection);
  if(!allowed){
    console.error(`ERROR: Collection '${collection}' not found in schema-map`);
    console.error('Available collections:');
    const schema = loadSchema();
    if(schema && schema.collections){
      schema.collections.forEach(c => console.error(`  - ${c.name}`));
    }
    process.exit(1);
  }

  // Validate filter fields
  for(const k of Object.keys(filter || {})){
    if(k.startsWith('$')) continue; // Allow MongoDB operators
    if(k === 'deleted') continue; // Allow soft-delete filter
    if(!allowed.has(k)){
      console.error(`ERROR: Invalid filter field '${k}' for collection '${collection}'`);
      console.error(`Allowed fields: ${Array.from(allowed).join(', ')}`);
      process.exit(1);
    }
  }

  // Load environment
  const env = loadEnv('/root/.openclaw/workspace/fina_kukerja/.env');
  const uri = process.env.KUKERJA_MONGO_RO_URI || env.KUKERJA_MONGO_RO_URI;
  
  if(!uri){
    console.error('ERROR: Missing KUKERJA_MONGO_RO_URI environment variable');
    process.exit(1);
  }

  const dbName = 'test'; // From connection string
  console.log(`Connecting to database: ${dbName}`);
  console.log(`Collection: ${collection}`);
  console.log(`Filter: ${JSON.stringify(filter)}`);
  console.log('---');

  const client = new MongoClient(uri, { 
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000
  });

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');
    
    const db = client.db(dbName);
    const coll = db.collection(collection);
    
    // Build query
    let query = coll.find(filter || {}).sort(sort || {_id: -1}).limit(Math.max(1, Math.min(limit, 200)));
    if(project) query = query.project(project);
    
    const docs = await query.toArray();
    console.log(`✓ Retrieved ${docs.length} documents`);
    console.log('---');
    
    // Mask sensitive data and output
    const safeDocs = docs.map(maskSensitiveData);
    console.log(JSON.stringify({
      ok: true, 
      collection, 
      count: docs.length, 
      docs: safeDocs
    }, null, 2));
    
  } catch(err) {
    console.error('ERROR:', err.message);
    if(err.message.includes('authentication')){
      console.error('Hint: Check if KUKERJA_MONGO_RO_URI credentials are correct');
    }
    if(err.message.includes('connect')){
      console.error('Hint: Check network connectivity and MongoDB server status');
    }
    process.exit(1);
  } finally {
    await client.close();
    console.log('✓ Connection closed');
  }
})();
