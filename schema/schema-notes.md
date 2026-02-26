# Schema Notes - dashboard-finance

## Tujuan
Dokumen ini menjelaskan konteks bisnis per collection agar Fina tidak salah tafsir.

## Aturan
- Query hanya boleh memakai field yang ada di `schema-map.json`.
- Jika field tidak ada: tolak query dan minta klarifikasi.
- Semua write harus melalui approval workflow.

## Collection Prioritas
1. payrolls
2. revenues
3. expenses

## TODO Verifikasi
- [ ] Sinkronkan semua field dari model TS/Mongoose aktual
- [ ] Validasi tipe numeric/date
- [ ] Definisikan relasi antar collection
- [ ] Tandai field sensitif (PII)
