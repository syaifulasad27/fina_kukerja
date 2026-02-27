# FINA "FACTORY RESET" PLAN
## Menghapus Semua Jejak Dashboard-Finance

**Tujuan:** Membuat Fina terasa seperti baru, sepenuhnya native untuk kukerja-backend tanpa sejarah dashboard-finance.

---

## Analisis Memory Yang Ada

### 1. **Historical Artifacts** (Migration Reports)
- `runtime/phase1-discovery-report.md` - Dokumen analisis migrasi
- `runtime/phase2-config-report.md` - Dokumen konfigurasi migrasi
- `runtime/phase3-validation-report.md` - Dokumen testing migrasi
- `runtime/phase4-go-live-checklist.md` - Dokumen go-live migrasi
- `schema/schema-map.json.backup.*` - Backup schema lama

### 2. **Environment Variables** (.env)
- `FINA_MONGO_RO_URI` - Legacy connection string
- `FINA_MONGO_RW_URI` - Legacy connection string
- Comments referencing "Migration", "Phase", "Legacy"

### 3. **Audit Trail**
- `runtime/audit-log.jsonl` - Log aktivitas lama (masih ada referensi ke collections lama seperti "revenues")
- `runtime/pending-approvals.json` - Queue approval lama

### 4. **Documentation References**
- `README-OPERATIONS.md` - Masih ada bagian "Previous: dashboard-finance"
- `USAGE-GUIDE.md` - Masih ada migration notes

### 5. **Old Scripts**
- `scripts/test_read_only.js` - Masih mereferensi dashboard-finance .env
- `scripts/sync_schema_map.py` - Script lama untuk dashboard-finance

### 6. **Git History**
- Commits dengan pesan "migrate", "dashboard-finance", "Phase 1-5"

---

## RESET PLAN - 5 LANGKAH

### LANGKAH 1: Archive & Hapus Migration Reports

**Tindakan:**
1. Buat folder `archive/pre-kukerja/`
2. Pindahkan semua phase reports ke archive
3. Hapus dari working directory

**Files:**
```
runtime/phase1-discovery-report.md → archive/pre-kukerja/
runtime/phase2-config-report.md → archive/pre-kukerja/
runtime/phase3-validation-report.md → archive/pre-kukerja/
runtime/phase4-go-live-checklist.md → archive/pre-kukerja/
schema/schema-map.json.backup.* → archive/pre-kukerja/
```

**Commit message:** "chore: archive migration artifacts"

---

### LANGKAH 2: Clean Environment Variables

**Tindakan:**
1. Hapus semua `FINA_MONGO_*` variables
2. Hapus komentar "LEGACY", "Migration", "Phase"
3. Simplify .env file

**Before:**
```bash
# LEGACY: Dashboard-Finance...
FINA_MONGO_RO_URI=...
FINA_MONGO_RW_URI=...

# ACTIVE: Kukerja-Backend...
KUKERJA_MONGO_RO_URI=...
```

**After:**
```bash
# Fina Environment - Kukerja-Backend
KUKERJA_MONGO_RO_URI=mongodb+srv://.../kukerja
KUKERJA_MONGO_RW_URI=mongodb+srv://.../kukerja
```

**Commit message:** "chore: clean environment variables, remove legacy refs"

---

### LANGKAH 3: Reset Audit Trail

**Tindakan:**
1. Archive audit-log.jsonl lama
2. Buat audit-log.jsonl kosong baru
3. Clear pending-approvals.json

**Commands:**
```bash
mv runtime/audit-log.jsonl archive/pre-kukerja/audit-log-$(date +%Y%m%d).jsonl
echo "# audit log (jsonl) - reset $(date)" > runtime/audit-log.jsonl
echo '{"version":1,"updatedAt":null,"items":[]}' > runtime/pending-approvals.json
```

**Commit message:** "chore: reset audit trail for clean slate"

---

### LANGKAH 4: Clean Documentation

**Tindakan:**

#### A. README-OPERATIONS.md
- Hapus bagian "Previous: dashboard-finance"
- Hapus Migration Notes table
- Hapus Rollback section yang mereferensi dashboard-finance

#### B. USAGE-GUIDE.md
- Hapus Migration Notes section
- Update intro: "Fina adalah..." (tanpa mention migrasi)

#### C. Update SOUL.md (jika perlu)
- Tambahkan: "Fina adalah Senior Finance Specialist di KuKerja sejak awal"
- Tanpa mention sistem sebelumnya

**Commit message:** "docs: clean documentation, remove migration references"

---

### LANGKAH 5: Remove/Hide Old Scripts

**Tindakan:**
1. Pindahkan `test_read_only.js` ke archive (karena masih ref dashboard-finance)
2. Pindahkan `sync_schema_map.py` (lama) ke archive
3. Update `sync_schema_map_kukerja.py` → rename jadi `sync_schema_map.py`

**Commit message:** "chore: archive legacy scripts, promote kukerja scripts"

---

### LANGKAH 6 (Optional): Git History Rewrite

**⚠️ WARNING: Destructive operation!**

Jika ingin benar-benar "clean slate" tanpa jejak migrasi di git:

**Option A: Soft Reset (Recommended)**
- Keep history but add "FINAL" commit that says "Fina initialized for kukerja-backend"
- Tidak menghapus history, tapi ada clear boundary

**Option B: Hard Reset (Dangerous)**
- `git reset --soft HEAD~5` (unstage last 5 commits)
- Buat satu commit besar: "feat: initialize Fina for kukerja-backend"
- Force push (jangan lakukan ini jika sudah push ke remote bersama!)

**Recommendation:** Pilih Option A - soft reset cukup, history migration bisa dianggap "proses setup awal"

---

### LANGKAH 7: Verification

**Checklist:**
- [ ] `grep -r "dashboard-finance"` → No results
- [ ] `grep -r "finance_dashboard"` → No results
- [ ] `grep -r "FINA_MONGO" .env` → No results
- [ ] `ls runtime/*.md` → Hanya README-OPERATIONS.md
- [ ] `cat runtime/audit-log.jsonl` → Kosong atau fresh
- [ ] `.env` → Clean, hanya KUKERJA_MONGO_*

**Final commit:** "chore: verify clean slate - no dashboard-finance references"

---

## Timeline Estimasi

| Langkah | Waktu | Commit |
|---------|-------|--------|
| 1. Archive reports | 10 menit | "chore: archive migration artifacts" |
| 2. Clean .env | 5 menit | "chore: clean environment variables" |
| 3. Reset audit | 5 menit | "chore: reset audit trail" |
| 4. Clean docs | 15 menit | "docs: clean documentation" |
| 5. Archive scripts | 10 menit | "chore: archive legacy scripts" |
| 6. Git (optional) | 5 menit | "chore: consolidate initialization" |
| 7. Verify | 10 menit | "chore: verify clean slate" |

**Total: ~60 menit**

---

## Post-Reset State

Setelah reset, Fina akan terasa seperti:

```
🎉 Fina - Senior Finance Specialist
   Untuk KuKerja HRIS & Payroll TMS

📁 Structure:
   ├── config/data-source.json     → Native kukerja config
   ├── schema/schema-map.json      → Native kukerja schema
   ├── scripts/
   │   ├── get_data.js            → Read operations
   │   ├── propose_change.js      → Write proposals
   │   ├── apply_change.js        → Approve/reject
   │   └── sync_schema_map.py     → Schema generator
   ├── docs/
   │   └── USAGE-GUIDE.md         → Complete usage guide
   └── runtime/
       ├── README-OPERATIONS.md   → Quick reference
       ├── audit-log.jsonl        → Fresh audit log
       └── pending-approvals.json → Empty queue

🔌 Environment:
   KUKERJA_MONGO_RO_URI=...
   KUKERJA_MONGO_RW_URI=...

📚 Documentation:
   - No migration references
   - No legacy system mentions
   - Clean, focused on kukerja-backend
```

---

## Recommendation

**Saya sarankan jalankan SEMUA langkah 1-7** untuk hasil maksimal.

Atau jika ingin versi ringkas:
- **Minimal:** Langkah 1, 2, 4 (hapus report, clean .env, clean docs)
- **Recommended:** Langkah 1-5 (semua tanpa git rewrite)
- **Complete:** Langkah 1-7 (total reset)

**Mau saya eksekusi sekarang?** Pilih:
1. **Minimal** (3 langkah, ~30 menit)
2. **Recommended** (5 langkah, ~45 menit)
3. **Complete** (7 langkah, ~60 menit)

