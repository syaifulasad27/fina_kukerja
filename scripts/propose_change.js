#!/usr/bin/env node
const fs = require('fs');
const crypto = require('crypto');
const { MongoClient } = require('mongodb');

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
  console.log('Usage: node propose_change.js --file <proposal.json> [--actor <name>]');
  process.exit(1);
}

function parseArgs(){
  const a = process.argv.slice(2);
  const out = { actor: 'unknown' };
  for (let i=0;i<a.length;i++){
    if (a[i]==='--file') out.file=a[++i];
    else if (a[i]==='--actor') out.actor=a[++i];
  }
  if (!out.file) usage();
  return out;
}

(async () => {
  const { file, actor } = parseArgs();
  const raw = JSON.parse(fs.readFileSync(file,'utf8'));
  const allow = new Set(cfg.database.collectionsAllowlist || []);
  if (!allow.has(raw.collection)) throw new Error(`collection not allowed: ${raw.collection}`);

  if (!['create','update','soft_delete'].includes(raw.action)) throw new Error('action must be create|update|soft_delete');
  if (raw.action === 'soft_delete') {
    raw.update = { ...(raw.update||{}), deleted: true, deletedAt: now() };
  }
  if (raw.action === 'update' && (!raw.update || typeof raw.update !== 'object')) throw new Error('update payload required');
  if (raw.action !== 'create' && (!raw.filter || typeof raw.filter !== 'object')) throw new Error('filter required for update/soft_delete');

  const envMap = loadEnvFromFile('/var/www/dashboard-finance/.env');
  const uri = process.env.FINA_MONGO_RO_URI || process.env.FINA_MONGO_RW_URI || envMap.FINA_MONGO_RO_URI || envMap.MONGODB_URI;
  if (!uri) throw new Error('Missing FINA_MONGO_RO_URI/FINA_MONGO_RW_URI/MONGODB_URI');

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  const db = client.db(cfg.database.dbName);
  const col = db.collection(raw.collection);

  let impactCount = 0;
  if (raw.action === 'create') impactCount = 1;
  else impactCount = await col.countDocuments(raw.filter || {});

  const approvalId = rid();
  let queue = { version:1, updatedAt:null, items:[] };
  if (fs.existsSync(queuePath)) queue = JSON.parse(fs.readFileSync(queuePath,'utf8'));

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

  appendAudit({ ts: now(), type:'propose', actor, approvalId, collection:raw.collection, action:raw.action, impactCount, status:'pending' });
  await client.close();

  console.log(JSON.stringify({ ok:true, approvalId, impactCount, status:'pending' }, null, 2));
})().catch(err=>{ console.error('ERROR:', err.message); process.exit(1); });
