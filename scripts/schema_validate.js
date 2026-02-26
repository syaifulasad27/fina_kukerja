#!/usr/bin/env node
const fs = require('fs');

const SCHEMA_PATH = '/root/.openclaw/workspace/fina_kukerja/schema/schema-map.json';

function loadSchema() {
  return JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
}

function allowedFieldsForCollection(collection) {
  const schema = loadSchema();
  const col = (schema.collections || []).find(c => c.name === collection);
  if (!col) return null;
  const base = new Set((col.fields || []).map(f => f.name));
  // system-safe fields
  ['_id', 'createdAt', 'updatedAt', 'deleted', 'deletedAt'].forEach(x => base.add(x));
  return base;
}

function validateUpdateKeys(collection, updateObj) {
  const allowed = allowedFieldsForCollection(collection);
  if (!allowed) return { ok: false, error: `Collection not found in schema-map: ${collection}` };
  const keys = Object.keys(updateObj || {});
  const invalid = keys.filter(k => !allowed.has(k));
  if (invalid.length) {
    return { ok: false, error: `Invalid update fields for ${collection}: ${invalid.join(', ')}` };
  }
  return { ok: true };
}

function validateDocumentKeys(collection, docObj) {
  const allowed = allowedFieldsForCollection(collection);
  if (!allowed) return { ok: false, error: `Collection not found in schema-map: ${collection}` };
  const keys = Object.keys(docObj || {});
  const invalid = keys.filter(k => !allowed.has(k));
  if (invalid.length) {
    return { ok: false, error: `Invalid document fields for ${collection}: ${invalid.join(', ')}` };
  }
  return { ok: true };
}

module.exports = {
  validateUpdateKeys,
  validateDocumentKeys,
  allowedFieldsForCollection,
};
