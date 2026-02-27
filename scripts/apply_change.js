#!/usr/bin/env node
/**
 * Fina Apply Change Script - Kukerja-Backend
 * Phase 5: Write Operations Migration
 * 
 * Applies or rejects a pending change from the approval queue.
 * Requires approver permissions.
 */
const fs = require('fs');
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
const permPath = `${BASE}/config/permissions.json`;
const queuePath = `${BASE}/runtime/pending-approvals.json`;
const auditPath = `${BASE}/runtime/audit-log.jsonl`;

function now(){ return new Date().toISOString(); }
function appendAudit(evt){ fs.appendFileSync(auditPath, JSON.stringify(evt)+"\n"); }

function loadPermissions(){
  if (!fs.existsSync(permPath)) {
    // Default permissions if file doesn't exist
    return { approval: { approvedBy: ['syaiful_asad'] } };
  }
  return JSON.parse(fs.readFileSync(permPath, 'utf8'));
}

function usage(){
  console.log('Usage: fina-approve <approvalId> <approver>');
  console.log('       node apply_change.js --approval-id <id> --approver <username>');
  console.log('');
  console.log('Reject:');
  console.log('       fina-reject <approvalId> "reason" <approver>');
  console.log('       node apply_change.js --approval-id <id> --approver <username> --reject --reason "..."');
  process.exit(1);
}

function args(){
  const a = process.argv.slice(2); 
  const o={reject:false};
  for (let i=0;i<a.length;i++){
    if (a[i]==='--approval-id') o.id=a[++i];
    else if (a[i]==='--approver') o.approver=a[++i];
    else if (a[i]==='--reject') o.reject=true;
    else if (a[i]==='--reason') o.reason=a[++i];
  }
  
  // Support positional args for wrapper scripts
  if (!o.id && a[0] && !a[0].startsWith('--')) {
    o.id = a[0];
    if (!o.approver && a[1] && !a[1].startsWith('--')) {
      // Check if second arg is reject reason
      if (a[2]) {
        o.reason = a[1];
        o.approver = a[2];
        o.reject = true;
      } else {
        o.approver = a[1];
      }
    }
  }
  
  if (!o.id || !o.approver) usage();
  return o;
}

(async()=>{
  const {id, approver, reject, reason} = args();
  
  const perm = loadPermissions();
  const allowedApprovers = new Set((perm.approval?.approvedBy)||['syaiful_asad']);
  
  if (!allowedApprovers.has(approver)) {
    throw new Error(`Approver not allowed: ${approver}. Allowed: ${Array.from(allowedApprovers).join(', ')}`);
  }
  
  if (!fs.existsSync(queuePath)) {
    throw new Error('No pending approvals. Queue file missing.');
  }
  
  const q = JSON.parse(fs.readFileSync(queuePath,'utf8'));
  const item = q.items.find(x => x.approvalId === id);
  
  if (!item) {
    throw new Error(`Approval ID not found: ${id}`);
  }
  
  if (item.status !== 'pending') {
    throw new Error(`Approval status is already: ${item.status}`);
  }

  if (reject){
    item.status='rejected';
    item.decidedAt=now();
    item.approver=approver;
    item.reason=reason||'No reason provided';
    q.updatedAt = now();
    fs.writeFileSync(queuePath, JSON.stringify(q,null,2));
    appendAudit({ 
      ts: now(), 
      type:'reject', 
      approvalId:id, 
      approver, 
      reason:reason||'' 
    });
    console.log(JSON.stringify({ 
      ok:true, 
      status:'rejected', 
      approvalId:id,
      reason: reason || 'No reason provided'
    }, null, 2));
    return;
  }

  // Load environment from fina_kukerja .env
  const envMap = loadEnvFromFile(`${BASE}/.env`);
  const uri = process.env.KUKERJA_MONGO_RW_URI || process.env.KUKERJA_MONGO_RO_URI || envMap.KUKERJA_MONGO_RW_URI;
  
  if (!uri) {
    throw new Error('Missing KUKERJA_MONGO_RW_URI environment variable');
  }
  
  const allow = new Set(cfg.database.collectionsAllowlist || []);
  if (!allow.has(item.collection)) {
    throw new Error(`Collection not in allowlist: ${item.collection}`);
  }

  // Schema validation again at apply time (defense in depth)
  if (item.action === 'create') {
    const v = validateDocumentKeys(item.collection, item.document || {});
    if (!v.ok) throw new Error(v.error);
  } else {
    const v = validateUpdateKeys(item.collection, item.update || {});
    if (!v.ok) throw new Error(v.error);
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  const db = client.db(cfg.database.dbName);
  const col = db.collection(item.collection);

  let result;
  if (item.action === 'create') {
    result = await col.insertOne(item.document || {});
  } else if (item.action === 'update' || item.action === 'soft_delete') {
    result = await col.updateMany(item.filter || {}, { $set: item.update || {} });
  } else {
    throw new Error(`Unsupported action: ${item.action}`);
  }

  item.status='applied';
  item.decidedAt=now();
  item.approver=approver;
  item.resultSummary = {
    acknowledged: result.acknowledged,
    insertedId: result.insertedId || null,
    matchedCount: result.matchedCount || 0,
    modifiedCount: result.modifiedCount || 0
  };
  q.updatedAt = now();
  fs.writeFileSync(queuePath, JSON.stringify(q,null,2));
  
  appendAudit({ 
    ts: now(), 
    type:'apply', 
    approvalId:id, 
    approver, 
    collection:item.collection, 
    action:item.action, 
    result:item.resultSummary 
  });
  
  await client.close();

  console.log(JSON.stringify({ 
    ok:true, 
    status:'applied', 
    approvalId:id, 
    collection: item.collection,
    action: item.action,
    result: item.resultSummary,
    message: `Change ${id} has been applied successfully.`
  }, null, 2));
})().catch(err=>{ 
  console.error('ERROR:', err.message); 
  process.exit(1); 
});
