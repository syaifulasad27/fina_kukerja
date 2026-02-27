# Fina Usage Guide - Kukerja-Backend

Complete guide for using Fina with kukerja-backend (HRIS + Payroll TMS).

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Common Queries](#common-queries)
3. [Write Operations](#write-operations)
4. [Troubleshooting](#troubleshooting)
5. [Data Dictionary](#data-dictionary)

---

## Quick Start

### Test Connection
```bash
# Verify database connectivity
node /root/.openclaw/workspace/fina_kukerja/scripts/test_connection.js
```

### Validate Configuration
```bash
# Check all configs are valid
node /root/.openclaw/workspace/fina_kukerja/scripts/test_config.js
```

### Read Data
```bash
# Using wrapper
fina-get --collection payouts.salary --limit 10

# Or directly
node scripts/get_data.js --collection users --limit 5
```

---

## Common Queries

### 1. Payroll Queries

#### List all active payrolls
```bash
fina-get --collection payouts.salary \
  --filter '{"status":"active"}' \
  --limit 20
```

#### Get payroll by employee
```bash
fina-get --collection payouts.salary \
  --filter '{"employeeId":"69a08a21d6a2cff4d8666482"}' \
  --limit 1
```

#### Get payroll results with details
```bash
fina-get --collection payouts.salary.results \
  --filter '{"payoutsSalaryId":"69a08a3bd6a2cff4d86680d1"}' \
  --limit 1
```

#### Payroll for specific month
```bash
fina-get --collection payouts.salary \
  --filter '{"paydayAt":{"$gte":"2026-02-01","$lt":"2026-03-01"}}' \
  --limit 10
```

### 2. BPJS Queries

#### Get BPJS Ketenagakerjaan for employee
```bash
fina-get --collection bpjs.ketenagakerjaan.result \
  --filter '{"employeeId":"69a08a21d6a2cff4d8666482"}' \
  --limit 5
```

#### Get all pending BPJS payments
```bash
fina-get --collection bpjs.ketenagakerjaan.result \
  --filter '{"status":"pending"}' \
  --limit 20
```

#### Calculate total BPJS contributions
```bash
# JKK (Jaminan Kecelakaan Kerja) - 0.24% employer
# JKM (Jaminan Kematian) - 0.30% employer
# JHT (Jaminan Hari Tua) - 3.7% employer, 2% employee
# JP (Jaminan Pensiun) - 2% employer, 1% employee
```

### 3. PPh 21 Queries

#### Get monthly PPh for employee
```bash
fina-get --collection pph.monthly \
  --filter '{"userId":"69a08a21d6a2cff4d8666482","month":1,"year":2026}' \
  --limit 1
```

#### List all TER Category B employees
```bash
fina-get --collection pph.monthly \
  --filter '{"terCategory":"terB","year":2026}' \
  --limit 20
```

#### Get annual PPh calculation
```bash
fina-get --collection pph.annual \
  --filter '{"userId":"69a08a21d6a2cff4d8666482","year":2026}' \
  --limit 1
```

### 4. User/Employee Queries

#### List all employees
```bash
fina-get --collection users \
  --filter '{"type":"Employee"}' \
  --limit 20
```

#### Get employee identification
```bash
fina-get --collection employee.identification \
  --filter '{"userId":"69a08a21d6a2cff4d8666482"}' \
  --limit 1
```

### 5. Reimbursement Queries

#### Pending reimbursements
```bash
fina-get --collection reimbursement.transactions \
  --filter '{"status":"pending"}' \
  --limit 10
```

#### Reimbursements by employee
```bash
fina-get --collection reimbursement.transactions \
  --filter '{"userId":"69a08a21d6a2cff4d8666482"}' \
  --limit 10
```

### 6. TMS Queries

#### Get employee enrollment
```bash
fina-get --collection tms.enrollments \
  --filter '{"userId":"69a08a21d6a2cff4d8666482","status":"ACCEPTED"}' \
  --limit 1
```

---

## Write Operations

### Overview
Write operations require **approval** before being applied to the database.

Flow: Propose → Review → Approve/Reject → Apply

### 1. Create a Proposal

#### Update payroll amount
```bash
# Create proposal file
cat > /tmp/proposal-update-salary.json << 'EOF'
{
  "collection": "payouts.salary",
  "action": "update",
  "filter": { "_id": "69a08a3bd6a2cff4d86680d1" },
  "update": { "amount": 9000000 },
  "note": "Salary adjustment for January 2026"
}
EOF

# Submit proposal
fina-propose /tmp/proposal-update-salary.json syaiful_asad
```

#### Create new allowance configuration
```bash
cat > /tmp/proposal-create-allowance.json << 'EOF'
{
  "collection": "payouts.salary.allowances",
  "action": "create",
  "document": {
    "employeeId": "69a08a21d6a2cff4d8666482",
    "jkk": 0.0024,
    "jkm": 0.003,
    "meal": 50000,
    "basicSalary": 5000000
  },
  "note": "New allowance config for employee"
}
EOF

fina-propose /tmp/proposal-create-allowance.json syaiful_asad
```

#### Soft delete (mark as deleted)
```bash
cat > /tmp/proposal-soft-delete.json << 'EOF'
{
  "collection": "payouts.salary",
  "action": "soft_delete",
  "filter": { "_id": "69a08a3bd6a2cff4d86680d1" },
  "note": "Remove duplicate entry"
}
EOF

fina-propose /tmp/proposal-soft-delete.json syaiful_asad
```

### 2. Review Pending Approvals

```bash
# View queue
cat /root/.openclaw/workspace/fina_kukerja/runtime/pending-approvals.json | jq '.items[] | {id: .approvalId, collection, action, status, note}'
```

### 3. Approve a Change

```bash
# Approve by ID
fina-approve <approvalId> syaiful_asad

# Example
fina-approve 550e8400-e29b-41d4-a716-446655440000 syaiful_asad
```

### 4. Reject a Change

```bash
# Reject with reason
fina-reject <approvalId> "Invalid amount calculation" syaiful_asad

# Example
fina-reject 550e8400-e29b-41d4-a716-446655440000 "Duplicate entry" syaiful_asad
```

### 5. View Audit Log

```bash
# View recent changes
tail -20 /root/.openclaw/workspace/fina_kukerja/runtime/audit-log.jsonl
```

---

## Troubleshooting

### Connection Issues

#### Error: "Missing KUKERJA_MONGO_RO_URI"
**Cause:** Environment variable not set
**Fix:**
```bash
# Check .env file
cat /root/.openclaw/workspace/fina_kukerja/.env

# Or set manually
export KUKERJA_MONGO_RO_URI="mongodb+srv://..."
```

#### Error: "Connection refused" or timeout
**Cause:** Network issue or wrong credentials
**Fix:**
```bash
# Test connection
node scripts/test_connection.js

# Check URI format
echo $KUKERJA_MONGO_RO_URI
```

### Query Issues

#### Error: "Collection not found in schema-map"
**Cause:** Collection name mismatch
**Fix:** Check actual collection name
```bash
# List available collections
node scripts/test_connection.js | grep -A 50 "Available collections"
```

#### Error: "Invalid filter field"
**Cause:** Field doesn't exist in schema
**Fix:** Check field names in schema
```bash
# View schema for collection
grep -A 20 '"name": "payouts.salary"' schema/schema-map.json
```

#### Error: "Collection not allowed"
**Cause:** Collection not in allowlist
**Fix:** Check data-source.json allowlist
```bash
cat config/data-source.json | jq '.database.collectionsAllowlist'
```

### Write Operation Issues

#### Error: "Approver not allowed"
**Cause:** Username not in permissions.json
**Fix:** Add approver to permissions
```bash
cat config/permissions.json

# Add if needed
echo '{"approval":{"approvedBy":["syaiful_asad","your_username"]}}' > config/permissions.json
```

#### Error: "Approval ID not found"
**Cause:** Wrong ID or already processed
**Fix:** Check pending queue
```bash
cat runtime/pending-approvals.json | jq '.items[] | {id: .approvalId, status}'
```

#### Error: "Invalid update fields"
**Cause:** Field doesn't exist in schema
**Fix:** Check allowed fields
```bash
# View fields for collection
grep -A 100 '"name": "payouts.salary"' schema/schema-map.json | grep '"name":'
```

### Validation Issues

#### Error: "Invalid document fields"
**Cause:** Creating document with unknown fields
**Fix:** Only use fields defined in schema
```bash
# Check schema
cat schema/schema-map.json | jq '.collections[] | select(.name=="payouts.salary") | .fields[].name'
```

### Performance Issues

#### Query is slow
**Cause:** Missing index or large dataset
**Fix:**
- Add `--limit` to reduce results
- Add specific filter to narrow results
- Check if indexes exist in database

```bash
# Optimized query
fina-get --collection payouts.salary \
  --filter '{"employeeId":"...","status":"active"}' \
  --limit 10
```

### Schema Issues

#### Schema is outdated
**Cause:** Models changed in kukerja-backend
**Fix:** Regenerate schema
```bash
cd /root/.openclaw/workspace/fina_kukerja
python3 scripts/sync_schema_map_kukerja.py
```

---

## Data Dictionary

### BPJS Rates (Standard)

| Program | Employee | Employer | Description |
|---------|----------|----------|-------------|
| JKK | 0% | 0.24% | Jaminan Kecelakaan Kerja |
| JKM | 0% | 0.30% | Jaminan Kematian |
| JHT | 2% | 3.7% | Jaminan Hari Tua |
| JP | 1% | 2% | Jaminan Pensiun |

### PPh 21 TER Categories (2026)

| Category | Gross Income Range | Rate Range |
|----------|-------------------|------------|
| TER A | < Rp 5.4jt/month | 0% - 5% |
| TER B | Rp 5.4jt - 8.9jt/month | 5% - 15% |
| TER C | > Rp 8.9jt/month | 15% - 35% |

### PTKP (Penghasilan Tidak Kena Pajak) 2026

| Status | Code | Amount (Annual) |
|--------|------|-----------------|
| Tidak Kawin / 0 Tanggungan | TK/0 | Rp 54,000,000 |
| Tidak Kawin / 1 Tanggungan | TK/1 | Rp 58,500,000 |
| Tidak Kawin / 2 Tanggungan | TK/2 | Rp 63,000,000 |
| Tidak Kawin / 3 Tanggungan | TK/3 | Rp 67,500,000 |
| Kawin / 0 Tanggungan | K/0 | Rp 58,500,000 |
| Kawin / 1 Tanggungan | K/1 | Rp 63,000,000 |
| Kawin / 2 Tanggungan | K/2 | Rp 67,500,000 |
| Kawin / 3 Tanggungan | K/3 | Rp 72,000,000 |

### Payroll Status Flow

```
initial → queued → approved → processed → completed → finalized
   ↓         ↓          ↓           ↓            ↓
queued   approved   processed   completed   distributed
```

### User Types

| Type | Description |
|------|-------------|
| Employee | Karyawan |
| Employer | Perusahaan/Pemberi Kerja |
| centralAbsence | Admin Pusat |

---

## Support

For issues or questions:
1. Check this guide first
2. Review error message carefully
3. Check audit logs: `runtime/audit-log.jsonl`
4. Test connection: `node scripts/test_connection.js`
5. Validate config: `node scripts/test_config.js`

---

*Last updated: 2026-02-27*  
*Version: 1.0 (Kukerja-Backend)*
