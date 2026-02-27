#!/usr/bin/env node
/**
 * Fina Propose Change Script - Kukerja-Backend
 * Phase 5: Write Operations Migration
 * 
 * Proposes a data change (create/update/soft_delete) that requires approval.
 * Changes are queued in pending-approvals.json for review.
 */
const fs = require('fs');
const crypto = require('crypto');
const { MongoClient } = require('mongodb');
const { validateUpdateKeys, validateDocumentKeys } = require('./schema_validate');

function loadEnvFromFile(filePath){
  if (!fs.existsSync(filePath)) return {};
  const out={};
  for (const line of fs.readFileSync(filePath,'utf8').split(/\r?\n/)){
    if (!line || line.trim().startsWith('#')) continue;
    const i=line.indexOf('='); if (i<=0) continue;
    const k=line.slice(0,i).trim(); let v=line.slice(i+1).trim();
    if ((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) v=v.slice(1,-1);
    out[k]=v;
  }
  return out;
}

const BASE = '/root/.openclaw/workspace/fina_kukerja';
const cfg = JSON.parse(fs.readFileSync(`${BASE}/config/data-source.json`, 'utf8'));
const queuePath = `${BASE}/runtime/pending-approvals.json`;
const auditPath = `${BASE}/runtime/audit-log.jsonl`;

function now() { return new Date().toISOString(); }
function rid() { return crypto.randomUUID(); }
function hash(obj){ return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex').slice(0,16); }
function appendAudit(evt){ fs.appendFileSync(auditPath, JSON.stringify(evt)+"\n"); }

function usage(){
  console.log('Usage: fina-propose <proposal.json> [actor]');
  console.log('       node propose_change.js --file <proposal.json> [--actor <name>]');
  console.log('');
  console.log('Proposal JSON format:');
  console.log(JSON.stringify({
    collection: 'payouts.salary',
    action: 'update',
    filter: { _id: '...' },
    update: { amount: 9000000 },
    note: 'Salary adjustment for January'
  }, null, 2));
  process.exit(1);
}

function parseArgs(){
  const a = process.argv.slice(2);
  const out = { actor: 'unknown' };
  for (let i=0;i<a.length;i++){
    if (a[i]==='--file') out.file=a[++i];
    else if (a[i]==='--actor') out.actor=a[++i];
  }
  if (!out.file && a[0] && !a[0].startsWith('--')) {
    out.file = a[0];
    if (a[1]) out.actor = a[1];
  }
  if (!out.file) usage();
  return out;
}

(async () => {
  const { file, actor } = parseArgs();
  
  if (!fs.existsSync(file)) {
    throw new Error(`Proposal file not found: ${file}`);
  }
  
  const raw = JSON.parse(fs.readFileSync(file,'utf8'));
  const allow = new Set(cfg.database.collectionsAllowlist || []);
  
  if (!allow.has(raw.collection)) {
    throw new Error(`Collection not allowed: ${raw.collection}. Allowed: ${Array.from(allow).slice(0,10).join(', ')}...`);
  }

  if (!['create','update','soft_delete'].includes(raw.action)) {
    throw new Error('Action must be: create | update | soft_delete');
  }
  
  if (raw.action === 'soft_delete') {
    raw.update = { ...(raw.update||{}), deleted: true, deletedAt: now() };
  }
  
  if (raw.action === 'update' && (!raw.update || typeof raw.update !== 'object')) {
    throw new Error('Update payload required for update action');
  }
  
  if (raw.action === 'create' && (!raw.document || typeof raw.document !== 'object')) {
    throw new Error('Document payload required for create action');
  }
  
  if (raw.action !== 'create' && (!raw.filter || typeof raw.filter !== 'object')) {
    throw new Error('Filter required for update/soft_delete actions');
  }

  // Schema validation (hard guardrail)
  if (raw.action === 'create') {
    const v = validateDocumentKeys(raw.collection, raw.document || {});
    if (!v.ok) throw new Error(v.error);
  } else {
    const v = validateUpdateKeys(raw.collection, raw.update || {});
    if (!v.ok) throw new Error(v.error);
  }

  // Load environment from fina_kukerja .env
  const envMap = loadEnvFromFile(`${BASE}/.env`);
  const uri = process.env.KUKERJA_MONGO_RO_URI || process.env.KUKERJA_MONGO_RW_URI || envMap.KUKERJA_MONGO_RO_URI;
  
  if (!uri) {
    throw new Error('Missing KUKERJA_MONGO_RO_URI/KUKERJA_MONGO_RW_URI environment variable');
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  const db = client.db(cfg.database.dbName);
  const col = db.collection(raw.collection);

  // Calculate impact
  let impactCount = 0;
  if (raw.action === 'create') {
    impactCount = 1;
  } else {
    impactCount = await col.countDocuments(raw.filter || {});
  }

  const approvalId = rid();
  let queue = { version:1, updatedAt:null, items:[] };
  if (fs.existsSync(queuePath)) {
    queue = JSON.parse(fs.readFileSync(queuePath,'utf8'));
  }

  const item = {
    approvalId,
    createdAt: now(),
    status: 'pending',
    actor,
    collection: raw.collection,
    action: raw.action,
    filter: raw.filter || null,
    update: raw.update || null,
    document: raw.document || null,
    impactCount,
    filterHash: hash(raw.filter || {}),
    note: raw.note || ''
  };

  queue.items.push(item);
  queue.updatedAt = now();
  fs.writeFileSync(queuePath, JSON.stringify(queue,null,2));

  appendAudit({ 
    ts: now(), 
    type:'propose', 
    actor, 
    approvalId, 
    collection:raw.collection, 
    action:raw.action, 
    impactCount, 
    status:'pending',
    note: raw.note || ''
  });
  
  await client.close();

  console.log(JSON.stringify({ 
    ok:true, 
    approvalId, 
    impactCount, 
    status:'pending',
    collection: raw.collection,
    action: raw.action,
    message: `Proposal ${approvalId} created. Awaiting approval.`
  }, null, 2));
})().catch(err=>{ 
  console.error('ERROR:', err.message); 
  process.exit(1); 
});
