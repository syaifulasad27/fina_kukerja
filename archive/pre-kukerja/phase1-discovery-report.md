# Phase 1 Discovery Report: Kukerja-Backend Migration

**Date:** 2026-02-27  
**Analyst:** Fina (Senior Finance Specialist)  
**Scope:** Migration from dashboard-finance to kukerja-backend

---

## 1. PROJECT STRUCTURE COMPARISON

### 1.1 Current (Dashboard-Finance)
```
Path: /var/www/dashboard-finance
Collections: 7 core collections
Focus: General accounting (expenses, revenues, journal entries, basic payroll)
```

### 1.2 Target (Kukerja-Backend)
```
Path: /var/www/kukerja-backend/src/api/models
Collections: 25+ collections
Focus: HRIS + Payroll Outsourcing (TMS - Talent Management System)
```

---

## 2. COLLECTION MAPPING

### 2.1 Direct Equivalents

| Dashboard-Finance | Kukerja-Backend | Notes |
|-------------------|-----------------|-------|
| `payrolls` | `payouts.salary` + `payouts.salary.results` | Split into header + detail |
| `expenses` | `finance.records` (category: OPEX) | More granular categorization |
| `revenues` | `finance.records` (category: REVENUE) | Unified with expenses |
| `employees` | `users` (type: Employee/Employer) | Extended with employer profile |
| `audit_logs` | Built-in timestamps + change logs | Per-collection audit trails |

### 2.2 New Collections (Kukerja-Specific)

#### Core Payroll Collections
| Collection | Description | Key Fields |
|------------|-------------|------------|
| `payouts.salary` | Payroll header/master | employeeId, status, amount, period |
| `payouts.salary.results` | Payroll detail results | payoutsSalaryId, allowance breakdown, net salary |
| `payouts.salary.finalizes` | Finalization records | finalization status, completedAt |
| `payouts.salary.allowances` | Allowance configurations | jkk, jkm, jht, jp, meal, transport |

#### BPJS Collections
| Collection | Description | Key Fields |
|------------|-------------|------------|
| `bpjs.kesehatan.result` | BPJS Kesehatan calculations | jkn (employee/employer), noBpjs, status |
| `bpjs.ketenagakerjaan.result` | BPJS Ketenagakerjaan | jkk, jkm, jht, jp (each: employee/employer) |
| `bpjs.config` | BPJS configuration | rates, programs |
| `bpjs.adjustment` | BPJS adjustments | adjustment type, amount |

#### PPh 21 Collections
| Collection | Description | Key Fields |
|------------|-------------|------------|
| `pph.monthly` | Monthly PPh 21 (TER) | pph21, terCategory, takeHomePay, ptkpCode |
| `pph.annual` | Annual PPh 21 | pkp, ptkp, pphYearly, positionCost, status |

#### Reimbursement Collections
| Collection | Description | Key Fields |
|------------|-------------|------------|
| `reimbursement.transactions` | Reimbursement claims | policyId, balance, status, evidenceUrl |
| `reimbursement.policy` | Reimbursement policies | eligible types, limits |

#### TMS Collections
| Collection | Description | Key Fields |
|------------|-------------|------------|
| `tms.enrollments` | Talent enrollments | userId, employerId, status |
| `tms.balances` | Balance tracking | type, status, amount |
| `tms.invoices` | Invoices | status, amount, billing period |

#### Configuration Collections
| Collection | Description |
|------------|-------------|
| `main.config` | System-wide configuration |
| `adjustment.config` | Adjustment rules |
| `jobs` | Job definitions |
| `leave.requests` | Leave management |
| `overtime` | Otime tracking |

---

## 3. ENUM CONSTANTS MAPPING

### 3.1 Payroll Statuses (`payouts.salary`)
```javascript
// payoutsSalaryStatuses.js
{
  INITIAL: "initial",
  QUEUED: "queued",
  APPROVED: "approved",
  PROCESSED: "processed",
  FAILED: "failed",
  COMPLETED: "completed",
  DISTRIBUTED: "distributed",
  FINALIZED: "finalized",
  INVALID: "invalid"
}
```

### 3.2 BPJS Ketenagakerjaan Types
```javascript
// ketenagakerjaanTypes.js
{
  JKK: "JKK",  // Jaminan Kecelakaan Kerja (0.24% employer)
  JKM: "JKM",  // Jaminan Kematian (0.3% employer)
  JHT: "JHT",  // Jaminan Hari Tua (3.7% employer, 2% employee)
  JP: "JP"     // Jaminan Pensiun (2% employer, 1% employee)
}

// ketenagakerjaanPrograms.js
{
  PROGRAM1: ["JKK", "JKM"],
  PROGRAM2: ["JKK", "JKM", "JHT"],
  PROGRAM3: ["JKK", "JKM", "JHT", "JP"]
}
```

### 3.3 BPJS Kesehatan
```javascript
// Default rates (from model)
{
  jknRatio: 0.01,  // 1% employee, 4% employer (Class I)
  // or 4% total split between employer/employee
}
```

### 3.4 PPh 21 TER Categories
```javascript
// pph-ter-categories.js
{
  TERA: "terA",      // Gross income < Rp 5.4jt/month
  TERB: "terB",      // Rp 5.4jt - Rp 8.9jt/month
  TERC: "terC",      // > Rp 8.9jt/month
  UNDERPAYMENT: "underPayment",
  RESTITUTION: "restitution"
}
```

### 3.5 Reimbursement Statuses
```javascript
// reimbursement-transaction-status.js
{
  PENDING: "pending",
  REJECTED: "rejected",
  APPROVED: "approved",
  PAID: "paid"
}
```

### 3.6 TMS Balance Statuses
```javascript
// tms-balance-statuses.js
{
  PENDING: "pending",
  RECEIVED: "received",
  HOLD: "hold",
  CANCELED: "canceled",
  FAILED: "failed",
  DISPUTED: "disputed"
}
```

### 3.7 Management Fee Statuses
```javascript
// management-fee-statuses.js
{
  PERCENTAGE: "percentage",
  FIX0K: "fix0k",
  FIX200K: "fix200k",
  // ... (fix 250K, 300K, 325K, 500K, 550K, 600K, 650K, 700K, 750K, 800K, 850K, 900K, 950K, 1000K)
  SERVICE_FEE: "serviceFee",      // 10,000
  SERVICE_FEE25K: "serviceFee25k", // 250,000
  MONTHLY_SERVICE: "monthlyService"
}
```

### 3.8 Salary Models
```javascript
// salary-models.js
{
  FixSalary: "fixSalary",
  FlexibleSalary: "flexibleSalary",
  Bonus: "bonus",
  Salary: "salary"
}
```

### 3.9 Pay Types
```javascript
// payTypes.js
{
  MONTHLY: "monthly",
  WEEKLY: "weekly"
}
```

### 3.10 Attendance Based On
```javascript
// attendanceBasedOnTypes.js
{
  DAILY: "daily",
  HOURLY: "hourly"
}
```

### 3.11 User Types
```javascript
// user-types.js
{
  EMPLOYER: "Employer",
  EMPLOYEE: "Employee",
  CENTRAL_ABSENCE: "centralAbsence"
}
```

### 3.12 Finance Record Categories
```javascript
// finance-record-categories.js
{
  REVENUE: "revenue",
  COGS: "cogs",
  OPEX: "opex",
  GROSS_MARGIN: "gross_margin",
  OVERLOAD: "overload",
  INTEREST: "interest",
  TAX: "tax",
  LIABILITY: "liability",
  ASSETS: "assets",
  CAPEX_AMORTIZATION: "capex_amortization",
  ADMIN: "admin",
  CAPITAL: "capital",
  DEBT: "debt",
  OTHERS: "others"
}
```

---

## 4. FIELD MAPPING: PAYROLL CALCULATION

### 4.1 Allowance Structure (payouts.salary.results)
```javascript
allowance: {
  jkk: Number,                    // Jaminan Kecelakaan Kerja
  jkm: Number,                    // Jaminan Kematian
  thr: Number,                    // Tunjangan Hari Raya
  jkn: Number,                    // Jaminan Kesehatan Nasional
  jht: Number,                    // Jaminan Hari Tua
  jp: Number,                     // Jaminan Pensiun
  thrAllowanceId: ObjectId,       // Reference to THR allowance
  isBpjsPaid: Boolean,
  paidAt: Date,
  thrAddition: Number,
  additionAddedAt: Date
}
```

### 4.2 Compensation Structure
```javascript
compensation: {
  payType: "monthly" | "weekly",
  attendanceBasedOn: "daily" | "hourly",
  workingHoursPerDay: Number,
  weekOf: Number,                 // 1 | 2 | 3 | 4
  invoiceDate: Date
}
```

### 4.3 Salary Components
```javascript
{
  basicSalary: Number,
  mealAllowance: Number,
  attendanceBonuses: Number,
  positionAllowance: Number,
  transportAllowance: Number,
  transportProrateAllowance: Number,  // Daily workers
  employerDisbursement: Number,
  tresholdAttendanceBonuses: Number,
  tresholdMealAllowance: Number,
  workingDays: Number,
  actualWorkingDays: Number
}
```

---

## 5. FIELD MAPPING: PPh 21

### 5.1 Monthly PPh (TER System)
```javascript
{
  takeHomePay: Number,
  month: Number,                  // 1-12
  year: Number,
  pph21: Number,                  // Calculated tax
  userId: ObjectId,
  employerId: ObjectId,
  terCategory: "terA" | "terB" | "terC",
  ptkpCode: String,               // TK/0, K/1, K/2, etc.
  averageEffectiveRate: Number,
  psrId: ObjectId,                // Reference to PayoutsSalaryResults
  isDeleted: Boolean
}
```

### 5.2 Annual PPh
```javascript
{
  pkp: Number,                    // Penghasilan Kena Pajak
  ptkp: Number,                   // Penghasilan Tidak Kena Pajak
  yearlySalary: Number,
  bonus: Number,
  pphYearly: Number,              // Total annual tax
  pphMonthly: Number,             // Monthly tax (Jan-Nov)
  positionCost: Number,           // Biaya Jabatan
  userId: ObjectId,
  employerId: ObjectId,
  year: Number,
  adjustmentValue: Number,
  profession: String,
  status: "underPayment" | "restitution",
  initialIncomePeriod: Number,
  finalIncomePeriod: Number,
  annualNetIncomeCalculation: "annually" | "annualized",
  nonFinalTaxPeriodSettlement: Number,
  previousTaxPeriodWithholding: Number,
  ptkpCode: String,
  lastTakeHomePay: Number
}
```

---

## 6. FIELD MAPPING: BPJS

### 6.1 BPJS Kesehatan
```javascript
{
  extra: {
    payoutsSalaryResultId: ObjectId
  },
  jkn: {
    employee: Number,             // 1% of wage
    employer: Number              // 4% of wage (Class I)
  },
  employeeId: ObjectId,
  employerId: ObjectId,
  paymentDate: Date,
  cutOffDate: Date,
  status: "pending" | "received" | "hold" | "canceled" | "failed" | "disputed",
  isNewBoarding: Boolean,
  noBpjs: Number,
  bpjsCardUrl: String
}
```

### 6.2 BPJS Ketenagakerjaan
```javascript
{
  extra: {
    payoutsSalaryResultId: ObjectId
  },
  jkk: { employee: Number, employer: Number },  // 0% / 0.24%
  jkm: { employee: Number, employer: Number },  // 0% / 0.3%
  jht: { employee: Number, employer: Number },  // 2% / 3.7%
  jp: { employee: Number, employer: Number },   // 1% / 2%
  employeeId: ObjectId,
  employerId: ObjectId,
  paymentDate: Date,
  cutOffDate: Date,
  status: "pending" | "received" | "hold" | "canceled" | "failed" | "disputed",
  isNewBoarding: Boolean,
  noBpjs: Number,
  bpjsCardUrl: String
}
```

---

## 7. KEY RELATIONSHIPS

```
payouts.salary (header)
    │
    ├──► payouts.salary.results (detail per employee)
    │         │
    │         ├──► bpjs.kesehatan.result
    │         ├──► bpjs.ketenagakerjaan.result
    │         └──► pph.monthly
    │
    ├──► payouts.salary.finalizes
    │
    └──► tms.enrollments (employee-employer relationship)

users (employees/employers)
    │
    ├──► employeeIdentification (NIK, NPWP, etc.)
    ├──► payouts.salary.results (via employeeId)
    ├──► pph.monthly (via userId)
    ├──► pph.annual (via userId)
    └──► reimbursement.transactions (via userId)
```

---

## 8. COLLECTION ALLOWLIST (Recommended)

```json
[
  "payouts.salary",
  "payouts.salary.results",
  "payouts.salary.finalizes",
  "payouts.salary.allowances",
  "bpjs.kesehatan.result",
  "bpjs.ketenagakerjaan.result",
  "bpjs.config",
  "bpjs.adjustment",
  "pph.monthly",
  "pph.annual",
  "reimbursement.transactions",
  "reimbursement.policy",
  "finance.records",
  "finance.record.subcategories",
  "tms.enrollments",
  "tms.balances",
  "tms.invoices",
  "users",
  "jobs",
  "main.config",
  "adjustment.config"
]
```

---

## 9. CRITICAL DIFFERENCES FROM DASHBOARD-FINANCE

### 9.1 Payroll Structure
- **Old:** Single `payrolls` collection with embedded slips
- **New:** Split architecture
  - `payouts.salary` = Header/parent record
  - `payouts.salary.results` = Individual employee calculations
  - `payouts.salary.finalizes` = Finalization tracking

### 9.2 BPJS Handling
- **Old:** Generic `bpjs` collection
- **New:** Separate collections per program type
  - Kesehatan and Ketenagakerjaan calculated separately
  - Each has employee/employer contribution split

### 9.3 PPh 21
- **Old:** Simple tax calculation
- **New:** TER (Tax Effective Rate) system
  - Monthly: TER A/B/C categories
  - Annual: Full year-end calculation with restitution/underpayment

### 9.4 User Model
- **Old:** `employees` collection
- **New:** `users` collection with type discriminator
  - Employer profiles embedded
  - Support for both Employee and Employer types

---

## 10. RISKS & CONSIDERATIONS

| Risk | Impact | Mitigation |
|------|--------|------------|
| Split payroll structure | High | Update all queries to join payouts.salary + results |
| TER vs old tax method | High | Validate PPh calculations against old method |
| BPJS rate changes | Medium | Config stored in bpjs.config, verify current rates |
| User ID mapping | High | Ensure employeeId in old = userId in new |
| Missing historical data | Medium | Archive old data before migration |

---

## 11. NEXT STEPS (Phase 2)

1. **Environment Setup**
   - Identify database name and connection strings
   - Set up read-only and read-write URI environment variables

2. **Schema Generation**
   - Run sync_schema_map.py on kukerja-backend models
   - Validate all enum values are captured

3. **Data Validation**
   - Compare sample payroll records between systems
   - Verify PPh 21 calculations match
   - Test BPJS contribution calculations

4. **Query Migration**
   - Rewrite payroll queries for split structure
   - Update BPJS queries for separate collections
   - Add PPh annual/monthly aggregation queries

---

**Report Status:** COMPLETE  
**Ready for Phase 2:** YES

