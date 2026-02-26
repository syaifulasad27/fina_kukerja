# MEMORY.md - Long-Term Memory Fina

_File ini adalah memori jangka panjang Fina. Berisi informasi penting yang perlu diingat antar sesi._

---

## Informasi Perusahaan

### KuKerja

- **Nama Resmi:** KuKerja
- **Website:** kukerja.id
- **Bidang Usaha:** Outsourcing & HR Services
- **Layanan Utama:** Payroll outsourcing, HR management, rekrutmen
- **Lokasi Project Backend:** `D:\NODE-JS\Kukerja\kukerja-backend`

---

## Klien Aktif

_(Akan diisi seiring waktu)_

| No | Nama Klien | Industri | Jumlah Karyawan | Catatan |
|----|------------|----------|-----------------|---------|
| - | - | - | - | - |

---

## Konfigurasi Pajak Aktif

### Tarif PPh 21 (Tahun 2026)

_(Referensi: PP 58/2023 tentang Tarif Pemotongan PPh Pasal 21)_

| Layer | Penghasilan Kena Pajak (PKP) | Tarif |
|-------|------------------------------|-------|
| 1 | s.d. Rp 60.000.000 | 5% |
| 2 | > Rp 60.000.000 - Rp 250.000.000 | 15% |
| 3 | > Rp 250.000.000 - Rp 500.000.000 | 25% |
| 4 | > Rp 500.000.000 - Rp 5.000.000.000 | 30% |
| 5 | > Rp 5.000.000.000 | 35% |

### PTKP (Tahun 2026)

| Status | Kode | Jumlah (Rp/Tahun) |
|--------|------|-------------------|
| Tidak Kawin | TK/0 | 54.000.000 |
| Tidak Kawin + 1 tanggungan | TK/1 | 58.500.000 |
| Tidak Kawin + 2 tanggungan | TK/2 | 63.000.000 |
| Tidak Kawin + 3 tanggungan | TK/3 | 67.500.000 |
| Kawin | K/0 | 58.500.000 |
| Kawin + 1 tanggungan | K/1 | 63.000.000 |
| Kawin + 2 tanggungan | K/2 | 67.500.000 |
| Kawin + 3 tanggungan | K/3 | 72.000.000 |
| Kawin + penghasilan istri digabung | K/I/0 | 112.500.000 |
| Kawin + penghasilan istri + 1 tanggungan | K/I/1 | 117.000.000 |
| Kawin + penghasilan istri + 2 tanggungan | K/I/2 | 121.500.000 |
| Kawin + penghasilan istri + 3 tanggungan | K/I/3 | 126.000.000 |

### Tarif BPJS (Tahun 2026)

**BPJS Kesehatan:**
| Komponen | Perusahaan | Karyawan | Total |
|----------|------------|----------|-------|
| Iuran | 4% | 1% | 5% |
| Batas Upah Maksimal | Rp 12.000.000 | - | - |

**BPJS Ketenagakerjaan:**
| Program | Perusahaan | Karyawan | Total | Batas Upah |
|---------|------------|----------|-------|------------|
| JKK (Jaminan Kecelakaan Kerja) | 0,24% - 1,74% | - | 0,24% - 1,74% | Tidak ada batas |
| JKM (Jaminan Kematian) | 0,30% | - | 0,30% | Rp 9.559.600 |
| JHT (Jaminan Hari Tua) | 3,70% | 2% | 5,70% | Tidak ada batas |
| JP (Jaminan Pensiun) | 2% | 1% | 3% | Rp 10.042.300 |

---

## Deadline Penting

### Deadline Bulanan

| Kewajiban | Deadline | Catatan |
|-----------|----------|---------|
| Setor PPh 21 | Tanggal 10 bulan berikutnya | Via e-Billing |
| Lapor SPT Masa PPh 21 | Tanggal 20 bulan berikutnya | Via e-Filing DJP |
| Setor PPh 23 | Tanggal 10 bulan berikutnya | Via e-Billing |
| Lapor SPT Masa PPh 23 | Tanggal 20 bulan berikutnya | Via e-Filing DJP |
| Setor PPN | Akhir bulan berikutnya | Via e-Billing |
| Lapor SPT Masa PPN | Akhir bulan berikutnya | Via e-Faktur |
| Bayar BPJS Kesehatan | Tanggal 10 | Via e-Payment |
| Bayar BPJS Ketenagakerjaan | Tanggal 15 | Via SIPP Online |

### Deadline Tahunan

| Kewajiban | Deadline | Catatan |
|-----------|----------|---------|
| SPT Tahunan PPh Badan | 30 April | 4 bulan setelah akhir tahun pajak |
| SPT Tahunan PPh OP | 31 Maret | 3 bulan setelah akhir tahun pajak |
| Bukti Potong 1721-A1 | Akhir Januari | Untuk karyawan tetap |

---

## Keputusan & Lesson Learned

_(Akan diisi seiring waktu dengan keputusan penting dan pembelajaran)_

### Format Entry

```
### [Tanggal] - [Judul Singkat]
**Konteks:** [Situasi yang dihadapi]
**Keputusan:** [Apa yang diputuskan]
**Alasan:** [Mengapa keputusan ini diambil]
**Hasil:** [Outcome dari keputusan]
```

---

## Catatan Regulasi

_(Akan diisi dengan update regulasi yang relevan)_

| Tanggal | Peraturan | Ringkasan | Dampak |
|---------|-----------|-----------|--------|
| - | - | - | - |

---

## Database Schema Notes

_(Akan diisi setelah mempelajari struktur database kukerja-backend)_

### Tabel Utama

| Tabel | Deskripsi | Kolom Penting |
|-------|-----------|---------------|
| - | - | - |

---

_File ini diupdate secara berkala. Informasi yang sudah tidak relevan akan dipindahkan ke arsip._
