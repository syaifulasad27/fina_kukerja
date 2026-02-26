#!/usr/bin/env node
const fs = require('fs');
const { MongoClient } = require('mongodb');
const { allowedFieldsForCollection } = require('./schema_validate');

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
function usage(){
  console.log('Usage: node get_data.js --collection <name> [--filter <json>] [--limit 20] [--sort <json>]');
  process.exit(1);
}
function parse(){
  const a=process.argv.slice(2), o={limit:20, filter:{deleted:{$ne:true}}, sort:{_id:-1}};
  for(let i=0;i<a.length;i++){
    if(a[i]==='--collection') o.collection=a[++i];
    else if(a[i]==='--filter') o.filter=JSON.parse(a[++i]);
    else if(a[i]==='--limit') o.limit=parseInt(a[++i],10);
    else if(a[i]==='--sort') o.sort=JSON.parse(a[++i]);
  }
  if(!o.collection) usage();
  return o;
}

(async()=>{
  const {collection,filter,limit,sort}=parse();
  const allowed = allowedFieldsForCollection(collection);
  if(!allowed) throw new Error(`collection not found in schema-map: ${collection}`);

  // validate top-level filter keys only (simple safe guard)
  for(const k of Object.keys(filter||{})){
    if(k.startsWith('$')) continue;
    if(!allowed.has(k)) throw new Error(`invalid filter field: ${k}`);
  }

  const env = loadEnv('/root/.openclaw/workspace/fina_kukerja/.env');
  const uri = process.env.FINA_MONGO_RO_URI || env.FINA_MONGO_RO_URI || env.MONGODB_URI;
  if(!uri) throw new Error('Missing FINA_MONGO_RO_URI/MONGODB_URI');

  const dbName = 'finance_dashboard';
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  const db = client.db(dbName);
  const docs = await db.collection(collection).find(filter||{}).sort(sort||{}).limit(Math.max(1,Math.min(limit,200))).toArray();
  console.log(JSON.stringify({ok:true, collection, count:docs.length, docs}, null, 2));
  await client.close();
})().catch(e=>{ console.error('ERROR:', e.message); process.exit(1); });
