# Fina Operations Quick Guide - Kukerja-Backend

## Overview
Fina is now configured for **Kukerja-Backend** (HRIS + Payroll Outsourcing TMS)
Previous: dashboard-finance | Current: kukerja-backend

## Commands

### Data Operations
```bash
# Read data (read-only)
fina-get <collection> <query> [actor]

# Propose a change (requires approval)
fina-propose /path/to/proposal.json syaiful_asad

# Approve pending change
fina-approve <approvalId> syaiful_asad

# Reject pending change
fina-reject <approvalId> "reason" syaiful_asad
```

### Schema Operations
```bash
# Regenerate schema map from models
python3 /root/.openclaw/workspace/fina_kukerja/scripts/sync_schema_map_kukerja.py
```

## Collections (Allowlist)

### Core Payroll
| Collection | Description | Key Fields |
|------------|-------------|------------|
| `payouts.salary` | Payroll header records | employeeId, status, amount, period |
| `payouts.salary.results` | Detailed payroll calculations | payoutsSalaryId, allowance{}, net salary |
| `payouts.salary.finalize` | Finalization tracking | status, completedAt |
| `payouts.salary.allowances` | Allowance configurations | jkk, jkm, jht, jp, meal, transport |

### BPJS
| Collection | Description |
|------------|-------------|
| `bpjs.kesehatan.result` | BPJS Kesehatan calculations (JKN) |
| `bpjs.ketenagakerjaan.result` | BPJS Ketenagakerjaan (JKK, JKM, JHT, JP) |
| `bpjs.config` | BPJS configuration and rates |
| `bpjs.adjustment` | BPJS adjustments |

### PPh 21
| Collection | Description |
|------------|-------------|
| `pph.monthly` | Monthly PPh 21 (TER system) |
| `pph.annual` | Annual PPh 21 calculation |

### Finance & Reimbursement
| Collection | Description |
|------------|-------------|
| `finance.record` | Revenue/Expense records |
| `finance.record.subCategory` | Finance sub-categories |
| `reimbursement.transactions` | Reimbursement claims |
| `reimbursement.policy` | Reimbursement policies |

### HRIS
| Collection | Description |
|------------|-------------|
| `users` | Employees and Employers |
| `employee.identification` | NIK, NPWP, identification docs |
| `jobs` | Job definitions |
| `leave.requests` | Leave management |
| `overtime` | Overtime tracking |
| `custom.additionDeduction.columns` | Custom payroll columns |

### TMS (Talent Management System)
| Collection | Description |
|------------|-------------|
| `tms.enrollments` | Employee-Employer enrollments |
| `tms.balances` | Balance tracking |
| `tms.invoices` | Invoices |

### Configuration
| Collection | Description |
|------------|-------------|
| `mainConfig` | System configuration |
| `adjustmentConfig` | Adjustment rules |

## Key Constants / Enums

### Payroll Statuses
`initial` → `queued` → `approved` → `processed` → `completed` → `finalized`

### BPJS Types & Rates
| Type | Employee | Employer | Description |
|------|----------|----------|-------------|
| JKK | 0% | 0.24% | Jaminan Kecelakaan Kerja |
| JKM | 0% | 0.30% | Jaminan Kematian |
| JHT | 2% | 3.70% | Jaminan Hari Tua |
| JP | 1% | 2% | Jaminan Pensiun |

### PPh 21 TER Categories
- **terA**: Gross income < Rp 5.4jt/month
- **terB**: Rp 5.4jt - Rp 8.9jt/month  
- **terC**: > Rp 8.9jt/month

### Salary Models
`fixSalary`, `flexibleSalary`, `bonus`, `salary`

### Pay Types
`monthly`, `weekly`

## Files

| File | Purpose |
|------|---------|
| Queue | `/root/.openclaw/workspace/fina_kukerja/runtime/pending-approvals.json` |
| Audit | `/root/.openclaw/workspace/fina_kukerja/runtime/audit-log.jsonl` |
| Health | `/root/.openclaw/workspace/fina_kukerja/runtime/last-health.json` |
| Config | `/root/.openclaw/workspace/fina_kukerja/config/data-source.json` |
| Schema | `/root/.openclaw/workspace/fina_kukerja/schema/schema-map.json` |
| Env | `/root/.openclaw/workspace/fina_kukerja/.env` |

## Environment Variables

```bash
KUKERJA_MONGO_RO_URI=mongodb+srv://.../kukerja?retryWrites=true&w=majority
KUKERJA_MONGO_RW_URI=mongodb+srv://.../kukerja?retryWrites=true&w=majority
```

## Policy

- **defaultMode**: read-only
- **requireApprovalForWrite**: true
- **softDeleteOnly**: true (hard delete blocked)
- **Unknown fields**: Blocked by schema validator

## Migration Notes

### From dashboard-finance to kukerja-backend
| Old | New |
|-----|-----|
| `payrolls` | `payouts.salary` + `payouts.salary.results` |
| `expenses` | `finance.record` (category: OPEX) |
| `revenues` | `finance.record` (category: REVENUE) |
| `employees` | `users` (type: Employee) |
| `bpjs` (generic) | `bpjs.kesehatan.result` + `bpjs.ketenagakerjaan.result` |

## Rollback

If rollback needed:
1. Restore `data-source.json` from dashboard-finance version
2. Update `.env` to use `FINA_MONGO_*` variables
3. Restore `schema-map.json` from backup
