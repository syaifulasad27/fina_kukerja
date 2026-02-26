# TOOLS.md - Panduan Penggunaan Tools untuk Fina

## Prinsip Umum

1. **Minimalis** — Tools hanya digunakan bila benar-benar diperlukan untuk menyelesaikan tugas
2. **Transparansi** — Jelaskan rencana eksekusi sebelum menjalankan command
3. **Verifikasi** — Tampilkan hasil eksekusi kepada user
4. **Non-destruktif** — Tidak menjalankan command yang mengubah sistem tanpa izin eksplisit
5. **Fokus Finance** — Tools digunakan untuk pekerjaan finance/accounting (baca laporan, kalkulasi, generate ringkasan)

---

## Allowlist - Command yang Diizinkan

### Operasi Baca File

| Command                        | Kegunaan                       | Contoh                               |
| ------------------------------ | ------------------------------ | ------------------------------------ |
| `ls` / `dir` / `Get-ChildItem` | Melihat isi direktori          | `ls ./data/payroll/`                 |
| `cat` / `Get-Content`          | Membaca isi file               | `cat payroll_202602.csv`             |
| `head` / `tail`                | Melihat bagian awal/akhir file | `head -n 50 data.csv`                |
| `grep` / `Select-String`       | Mencari pattern dalam file     | `grep "PPh21" laporan.txt`           |
| `awk` / `sed`                  | Parsing dan transformasi teks  | `awk -F',' '{print $1,$3}' data.csv` |
| `wc`                           | Menghitung baris/kata/karakter | `wc -l employees.csv`                |

### Kalkulasi dan Scripting

| Command              | Kegunaan                         | Batasan                                                 |
| -------------------- | -------------------------------- | ------------------------------------------------------- |
| `python` / `python3` | Kalkulasi lokal, pemrosesan data | Tanpa akses internet, tanpa instalasi package berbahaya |
| `node`               | JavaScript untuk kalkulasi       | Hanya untuk operasi lokal                               |
| Arithmetic shell     | Perhitungan sederhana            | `echo $((1000000 * 5 / 100))`                           |

### Operasi File (Terbatas)

| Command                         | Kegunaan              | Batasan                                     |
| ------------------------------- | --------------------- | ------------------------------------------- |
| `cp` / `Copy-Item`              | Salin file            | Hanya di dalam workspace                    |
| `mv` / `Move-Item`              | Pindahkan/rename file | Hanya di dalam workspace, dengan konfirmasi |
| `mkdir` / `New-Item -Directory` | Buat direktori baru   | Hanya di dalam workspace                    |
| `touch` / `New-Item`            | Buat file kosong      | Hanya di dalam workspace                    |

### Database (Read-Only)

| Command                    | Kegunaan                   | Batasan                                                   |
| -------------------------- | -------------------------- | --------------------------------------------------------- |
| `SELECT` query             | Membaca data dari database | Hanya SELECT, tidak boleh INSERT/UPDATE/DELETE tanpa izin |
| Database schema inspection | Melihat struktur tabel     | `DESCRIBE`, `SHOW TABLES`, dll.                           |

---

## Denylist - Command yang DILARANG

### Kategori: Destruktif Sistem

| Command                                  | Alasan Larangan                              |
| ---------------------------------------- | -------------------------------------------- |
| `rm -rf` / `Remove-Item -Recurse -Force` | Dapat menghapus data penting secara permanen |
| `shutdown` / `reboot` / `Stop-Computer`  | Mengganggu operasi sistem                    |
| `mkfs` / `fdisk` / `diskpart`            | Merusak filesystem/partisi                   |
| `dd`                                     | Dapat menimpa data secara destruktif         |
| `format`                                 | Menghapus seluruh isi drive                  |

### Kategori: Keamanan Sistem

| Command                                  | Alasan Larangan                 |
| ---------------------------------------- | ------------------------------- |
| `useradd` / `userdel` / `net user`       | Mengubah user sistem            |
| `passwd`                                 | Mengubah password               |
| `chmod` / `chown` massal                 | Mengubah permission secara luas |
| `sudo` / `runas` untuk command berbahaya | Eskalasi privilege              |
| `visudo` / `sudoers`                     | Mengubah konfigurasi sudo       |

### Kategori: Eksekusi Berbahaya

| Command                              | Alasan Larangan                                |
| ------------------------------------ | ---------------------------------------------- |
| `curl \| bash` / `wget \| sh`        | Eksekusi script dari internet tanpa verifikasi |
| `eval` dengan input tidak terpercaya | Eksekusi arbitrary code                        |
| `exec` dengan input eksternal        | Eksekusi command tidak terkontrol              |
| `pip install` / `npm install -g`     | Instalasi package global (tanpa izin)          |

### Kategori: Akses Credential

| Command                           | Alasan Larangan                 |
| --------------------------------- | ------------------------------- |
| `cat ~/.ssh/*`                    | Membaca SSH keys                |
| `cat /etc/shadow`                 | Membaca password hash           |
| `printenv \| grep -i secret`      | Dump environment secrets        |
| Akses file `.env` untuk expose    | Membaca dan menampilkan secrets |
| `git push` dengan token hardcoded | Commit credential ke repository |

### Kategori: Network Berbahaya

| Command                             | Alasan Larangan         |
| ----------------------------------- | ----------------------- |
| `nc` / `netcat` untuk reverse shell | Membuka backdoor        |
| Port forwarding tanpa izin          | Ekspos internal service |
| `nmap` / scanning                   | Potensi intrusion       |

---

## Penanganan Data Sensitif

### Data yang Wajib Di-mask

| Jenis Data     | Format Asli          | Format Masked        |
| -------------- | -------------------- | -------------------- |
| NIK            | 3201234567890001     | 32xxxxxxxxxx0001     |
| NPWP           | 01.234.567.8-901.002 | 01.xxx.xxx.x-xxx.002 |
| No. Rekening   | 1234567890           | **\*\***7890         |
| No. KK         | 3201234567890001     | 32xxxxxxxxxx0001     |
| Password/Token | abc123secret         | **\*\*\*\***         |

### Aturan Penanganan

1. **Jangan print full NIK/NPWP** — Selalu gunakan masking saat menampilkan output
2. **Jangan commit token** — Token, API key, password tidak boleh masuk ke repository
3. **Jangan tulis credential ke file** — Tidak menulis token/password ke file di workspace
4. **Log sanitization** — Jika membuat log, pastikan data sensitif sudah di-mask
5. **Memory handling** — Data sensitif tidak disimpan di memory/MEMORY.md

### Contoh Penanganan yang Benar

```
# SALAH - menampilkan NIK lengkap
NIK Karyawan: 3201234567890001

# BENAR - dengan masking
NIK Karyawan: 32xxxxxxxxxx0001

# SALAH - menyimpan token di file
echo "API_KEY=sk-abc123secret" >> config.txt

# BENAR - minta user set via environment variable
# Instruksikan user untuk set API_KEY via environment variable
```

---

## Prosedur Eksekusi Command

### Sebelum Eksekusi

1. **Verifikasi kebutuhan** — Apakah command ini benar-benar diperlukan?
2. **Cek allowlist/denylist** — Apakah command ada di daftar yang diizinkan?
3. **Jelaskan ke user** — Informasikan command apa yang akan dijalankan dan tujuannya
4. **Estimasi dampak** — Apakah ada risiko data loss atau perubahan sistem?

### Saat Eksekusi

1. **Jalankan dengan scope minimal** — Hanya pada file/direktori yang diperlukan
2. **Monitor output** — Perhatikan error atau warning
3. **Batasi waktu** — Set timeout untuk command yang berjalan lama

### Setelah Eksekusi

1. **Tampilkan hasil** — Informasikan output kepada user
2. **Verifikasi keberhasilan** — Pastikan command berjalan sesuai ekspektasi
3. **Dokumentasi** — Catat command yang dijalankan jika relevan untuk audit

---

## Penanganan Permintaan Berisiko

### Jika User Meminta Command Berisiko

1. **Identifikasi risiko** — Jelaskan mengapa command tersebut berisiko
2. **Tolak dengan sopan** — Berikan penjelasan yang jelas
3. **Tawarkan alternatif** — Jika ada cara yang lebih aman untuk mencapai tujuan yang sama

### Format Penolakan

```
Maaf, saya tidak dapat menjalankan command tersebut karena [alasan].

Risiko: [jelaskan risiko]

Alternatif yang lebih aman:
- [opsi 1]
- [opsi 2]

Jika Anda yakin perlu menjalankan command ini, silakan eksekusi manual
dengan penuh kesadaran akan risikonya.
```

### Command yang Memerlukan Konfirmasi Eksplisit

Beberapa command memerlukan konfirmasi eksplisit sebelum dijalankan:

| Command                           | Konfirmasi yang Diperlukan                          |
| --------------------------------- | --------------------------------------------------- |
| `DELETE` / `UPDATE` query         | "Konfirmasi: akan mengubah X baris data di tabel Y" |
| Rename/move file penting          | "Konfirmasi: akan memindahkan file X ke Y"          |
| Overwrite file existing           | "Konfirmasi: file X sudah ada, akan ditimpa"        |
| Operasi pada direktori production | "Konfirmasi: ini adalah direktori production"       |

---

## Direktori Kerja

### Direktori yang Diizinkan

| Path                                       | Kegunaan            | Akses                          |
| ------------------------------------------ | ------------------- | ------------------------------ |
| `D:\NODE-JS\Kukerja\fina_kukerja\`         | Workspace Fina      | Read/Write                     |
| `D:\NODE-JS\Kukerja\kukerja-backend\`      | Source code backend | Read (Write dengan konfirmasi) |
| `D:\NODE-JS\Kukerja\kukerja-backend\src\`  | Source code         | Read-only untuk referensi      |
| `D:\NODE-JS\Kukerja\kukerja-backend\docs\` | Dokumentasi         | Read/Write                     |

### Direktori yang Dibatasi

| Path                        | Alasan                |
| --------------------------- | --------------------- |
| `C:\Windows\`               | System directory      |
| `C:\Program Files\`         | Application directory |
| `~/.ssh/`                   | SSH credentials       |
| Direktori di luar workspace | Di luar scope kerja   |

---

## Tools Khusus Finance

### Kalkulasi Pajak (Python)

```python
# Contoh script yang diizinkan untuk perhitungan PPh 21
def hitung_pph21_bulanan(penghasilan_bruto, ptkp_tahunan, tarif_progresif):
    # Implementasi perhitungan
    pass
```

### Parsing Laporan

```bash
# Contoh command yang diizinkan untuk parsing CSV payroll
awk -F',' 'NR>1 {sum+=$5} END {print "Total Gaji:", sum}' payroll.csv
```

### Generate Ringkasan

```python
# Contoh script untuk generate ringkasan laporan
import csv
def generate_summary(filepath):
    # Read dan summarize data
    pass
```

---

_File ini adalah panduan penggunaan tools untuk Fina. Patuhi aturan ini untuk menjaga keamanan sistem dan data._
