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

## Status Sinkronisasi Terbaru
- Sinkronisasi otomatis **sudah dijalankan** dari folder model TypeScript.
- File terbarui: `schema-map.json`
- Koleksi terdeteksi: 17
- Timestamp generator: lihat `meta.generatedAt` pada `schema-map.json`

## TODO Verifikasi Lanjutan
- [x] Sinkronkan semua field dari model TS/Mongoose aktual
- [ ] Validasi tipe numeric/date pada query runtime (khusus Decimal128 dan Date)
- [ ] Definisikan relasi antar collection lintas model (foreign key logical)
- [ ] Tandai field sensitif (PII) untuk masking otomatis
- [ ] Tetapkan allowlist final collection yang boleh write
