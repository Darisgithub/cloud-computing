# Perpustakaan Aksara

Aplikasi web peminjaman buku perpustakaan untuk tugas mata kuliah Cloud Computing.

| Bagian | Teknologi |
|---|---|
| Frontend | React.js + Vite |
| Backend | Node.js (REST API) |
| Penyimpanan | Supabase PostgreSQL (wajib; tidak ada penyimpanan lokal) |
| Deploy | Backend dan frontend dapat di-deploy terpisah di Vercel |

## Fitur

Ada tiga data utama dan semuanya punya CRUD lengkap.

| Data | Create | Read | Update | Delete |
|---|---|---|---|---|
| **Buku** | Tambah buku | Daftar, cari, filter kategori, detail | Ubah data buku | Hapus buku |
| **Anggota** | Tambah anggota | Daftar dan cari | Ubah data anggota | Hapus anggota |
| **Peminjaman** | Pinjamkan buku | Daftar per status (dipinjam, terlambat, sudah kembali) | Perpanjang jatuh tempo, kembalikan buku | Hapus catatan |

Aturan perpustakaan yang dijalankan backend:

- Stok dihitung otomatis: eksemplar tersedia = jumlah eksemplar dikurangi buku yang sedang dipinjam.
- Buku yang semua eksemplarnya sedang dipinjam tidak bisa dipinjam lagi.
- Satu anggota maksimal meminjam 3 buku, dan tidak boleh meminjam judul yang sama dua kali sekaligus.
- Denda Rp1.000 per hari terlambat, dihitung saat buku dikembalikan.
- Buku atau anggota yang masih punya peminjaman berjalan tidak bisa dihapus.
- Semua input divalidasi di backend, dan pesan galatnya ditampilkan di form.

## Struktur proyek

```
perpustakaan/
├── backend/
│   ├── core.js          # handler server dan daftar rute API
│   ├── service.js       # aturan perpustakaan dan logika CRUD
│   ├── store.js         # koneksi Supabase PostgreSQL
│   ├── api/             # entry point serverless untuk Vercel
│   ├── schema.sql       # skema database Supabase
│   ├── seed.js          # data awal (17 buku, 8 anggota, 9 peminjaman)
│   ├── util.js          # bantu tanggal dan error
│   ├── api.test.js      # uji otomatis API
│   └── package.json
├── frontend/
│   ├── index.html
│   ├── vite.config.js   # meneruskan /api ke backend saat development
│   └── src/
│       ├── App.jsx      # kerangka, navigasi, pemuatan data
│       ├── api.js       # semua pemanggilan ke backend
│       ├── styles.css
│       ├── pages/       # Beranda, Koleksi, Anggota, Peminjaman
│       └── components/  # Modal, Rak buku, Cap tanggal, form pinjam, detail buku
├── Dockerfile
└── docker-compose.yml
```

## Menyiapkan Supabase

1. Buat project di [Supabase](https://supabase.com/).
2. Buka **SQL Editor → New query**, salin seluruh isi `backend/schema.sql`, lalu pilih **Run**.
3. Buka **Project Settings → Database → Connect** dan salin connection string **Transaction pooler** (URI). Ganti password placeholder dengan password database project. Jangan masukkan URI ini ke Git atau frontend.
4. Di **Project Settings → Database → SSL Configuration**, unduh root certificate database. Encode isi file sertifikat menjadi Base64 satu baris. Di PowerShell:
   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes(".\prod-ca-2021.crt"))
   ```
   Pakai hasilnya untuk `SUPABASE_CA_CERT_BASE64`. Backend memverifikasi sertifikat TLS Supabase dan tidak menonaktifkan verifikasi.
5. Atur `DATABASE_URL` dan `SUPABASE_CA_CERT_BASE64` sebagai environment variables backend. Keduanya tidak boleh dimasukkan ke frontend atau repository.

Saat backend pertama kali terhubung ke tabel yang masih kosong, data contoh akan dibuat otomatis.
Jika password database berisi karakter khusus, URL-encode karakter tersebut sebelum dimasukkan ke connection string.

## Menjalankan di komputer (Git Bash)

Syaratnya Node.js 18 atau lebih baru dan project Supabase yang sudah disiapkan. Backend dan frontend dijalankan di **dua jendela Git Bash terpisah**. Jalankan dari root proyek.

**Jendela 1: backend**

```bash
cd backend
npm install
npm run dev
```

Sebelum menjalankan, salin `backend/.env.example` menjadi `backend/.env`, lalu isi `DATABASE_URL` dengan connection string Supabase dan `SUPABASE_CA_CERT_BASE64` dengan hasil Base64 sertifikat tadi. Backend memuat file `.env` otomatis.

Tunggu sampai muncul `API berjalan di http://localhost:5000/api`. Biarkan jendela ini terbuka. Cek `http://localhost:5000/api/health`; responsnya harus memuat `{"status":"ok"}`.

**Jendela 2: frontend**

```bash
cd frontend
npm install
npm run dev
```

Vite membaca `frontend/.env` secara otomatis. Untuk lokal, gunakan `VITE_API_URL=/api`; proxy Vite akan meneruskan request ke backend di port 5000.

Buka http://localhost:5173.

Frontend lokal menggunakan proxy Vite ke backend di port 5000.

## Uji otomatis backend

```bash
cd backend
npm test
```

Uji ini menjalankan server sungguhan dengan data memori sementara dan memeriksa CRUD buku, anggota, peminjaman, stok, batas pinjam, denda, dan validasi. Uji tidak memerlukan koneksi Supabase dan tidak menyentuh data database.

## Endpoint API

| Method | URL | Fungsi |
|---|---|---|
| GET | `/api/buku?q=&kategori=` | Daftar buku |
| GET | `/api/buku/:id` | Satu buku |
| POST | `/api/buku` | Tambah buku |
| PUT | `/api/buku/:id` | Ubah buku |
| DELETE | `/api/buku/:id` | Hapus buku |
| GET | `/api/anggota?q=` | Daftar anggota |
| GET | `/api/anggota/:id` | Satu anggota |
| POST | `/api/anggota` | Tambah anggota |
| PUT | `/api/anggota/:id` | Ubah anggota |
| DELETE | `/api/anggota/:id` | Hapus anggota |
| GET | `/api/peminjaman?status=&q=` | Daftar peminjaman (`status`: dipinjam, terlambat, dikembalikan) |
| GET | `/api/peminjaman/:id` | Satu peminjaman |
| POST | `/api/peminjaman` | Pinjamkan buku |
| PUT | `/api/peminjaman/:id` | Perpanjang jatuh tempo |
| POST | `/api/peminjaman/:id/kembali` | Kembalikan buku |
| DELETE | `/api/peminjaman/:id` | Hapus catatan |
| GET | `/api/statistik` | Ringkasan untuk Beranda |
| GET | `/api/kategori` | Daftar kategori |

Contoh body `POST /api/buku`:

```json
{
  "judul": "Laskar Pelangi",
  "penulis": "Andrea Hirata",
  "kategori": "Fiksi",
  "tahun": 2005,
  "jumlah": 4,
  "deskripsi": "Sepuluh anak di Belitung berjuang agar sekolah mereka tidak ditutup."
}
```

Contoh body `POST /api/peminjaman`:

```json
{ "buku_id": 1, "anggota_id": 2, "lama_hari": 14 }
```

Kategori yang valid: Fiksi, Pengembangan Diri, Sejarah, Sains & Teknologi, Anak & Remaja, Referensi.

## Menjalankan dengan Docker

Docker tetap dapat dipakai untuk menjalankan backend dan frontend dalam satu container. Pastikan `DATABASE_URL` tersedia saat container dijalankan:
```bash
DATABASE_URL='postgresql://...' docker compose up --build
```

Pada PowerShell, atur `$env:DATABASE_URL='postgresql://...'` sebelum `docker compose up --build`. Buka http://localhost:8080.

## Alternatif: deploy fullstack dengan Supabase dan Render

Backend dapat dijalankan sebagai layanan web Render jika ingin menghindari batasan runtime serverless. Gunakan `render.yaml`, atur rahasia `DATABASE_URL` ke connection string Supabase, lalu deploy.

### Variabel lingkungan

| Variabel | Fungsi | Bawaan |
|---|---|---|
| `PORT` | Port server | 5000 |
| `DATABASE_URL` | Connection string PostgreSQL Supabase; wajib untuk backend | wajib |
| `PUBLIC_DIR` | Folder hasil build frontend untuk mode Docker | `backend/public` |
| `TZ` | Zona waktu untuk hitungan jatuh tempo | zona server (Docker: Asia/Jakarta) |

## Catatan

Backend menggunakan koneksi PostgreSQL langsung dan menyimpan data di Supabase. Aplikasi memuat data tabel ke memori proses, sehingga backend Vercel cocok untuk demo atau penggunaan ringan; instance serverless yang berjalan bersamaan dapat memiliki salinan memori berbeda. Untuk beban multi-user/produksi, gunakan layanan backend persisten satu instance atau ubah operasi penyimpanan agar setiap permintaan bekerja langsung dengan database.
