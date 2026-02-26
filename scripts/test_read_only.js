#!/usr/bin/env node
/*
  Fina read-only connectivity test for dashboard-finance.
  Priority: env FINA_MONGO_RO_URI, fallback optional from /var/www/dashboard-finance/.env (MONGODB_URI)
*/

const fs = require('fs');
const path = require('path');

function loadEnvFromFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i <= 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

async function main() {
  const configPath = '/root/.openclaw/workspace/fina_kukerja/config/data-source.json';
  const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  let uri = process.env.FINA_MONGO_RO_URI || '';
  if (!uri) {
    const envMap = loadEnvFromFile('/var/www/dashboard-finance/.env');
    uri = envMap.FINA_MONGO_RO_URI || envMap.MONGODB_URI || '';
  }
  if (!uri) {
    console.error('❌ Missing URI. Set FINA_MONGO_RO_URI (or MONGODB_URI in dashboard .env for fallback).');
    process.exit(2);
  }

  let MongoClient;
  try {
    ({ MongoClient } = require('mongodb'));
  } catch (e) {
    console.error('❌ Missing mongodb package. Run: npm i mongodb (inside fina_kukerja folder).');
    process.exit(3);
  }

  const dbName = cfg?.database?.dbName || 'finance_dashboard';
  const collections = cfg?.database?.collectionsAllowlist || ['payrolls', 'revenues', 'expenses'];
  const targets = collections.filter((c) => ['payrolls', 'revenues', 'expenses'].includes(c));

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  const started = Date.now();
  try {
    await client.connect();
    const db = client.db(dbName);

    console.log('✅ Connected (read test)');
    console.log(`DB: ${dbName}`);

    for (const col of targets) {
      const collection = db.collection(col);
      const count = await collection.countDocuments({ deleted: { $ne: true } });
      const one = await collection.find({ deleted: { $ne: true } }).sort({ _id: -1 }).limit(1).toArray();
      console.log(`- ${col}: count=${count}, latest=${one.length ? 'ok' : 'empty'}`);
    }

    const latency = Date.now() - started;
    const healthPath = '/root/.openclaw/workspace/fina_kukerja/runtime/last-health.json';
    const health = {
      checkedAt: new Date().toISOString(),
      db: {
        connected: true,
        mode: 'read-only',
        latencyMs: latency,
        error: null,
      },
      schema: {
        loaded: true,
        source: '/root/.openclaw/workspace/fina_kukerja/schema/schema-map.json',
      },
    };
    fs.writeFileSync(healthPath, JSON.stringify(health, null, 2));
    console.log(`✅ Health written: ${healthPath}`);
  } catch (err) {
    console.error('❌ Read-only test failed:', err.message);
    process.exit(1);
  } finally {
    await client.close().catch(() => {});
  }
}

main();
