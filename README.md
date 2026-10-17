# Perpustakaan Aksara

Aplikasi web peminjaman buku perpustakaan untuk tugas mata kuliah Cloud Computing.

| Bagian | Teknologi |
|---|---|
| Frontend | React.js + Vite |
| Backend | Node.js (REST API) |
| Penyimpanan lokal | File JSON (`backend/data/perpustakaan.json`, dibuat otomatis) |
| Penyimpanan production | Supabase PostgreSQL |
| Deploy | Docker + Render |

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
│   ├── server.js        # server HTTP dan daftar rute API
│   ├── service.js       # aturan perpustakaan dan logika CRUD
│   ├── store.js         # file JSON lokal atau Supabase PostgreSQL
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

## Menjalankan di komputer (Git Bash)

Syaratnya Node.js 18 atau lebih baru. Backend dan frontend dijalankan di **dua jendela Git Bash terpisah**. Pastikan `ls` di folder `perpustakaan` menampilkan `backend` dan `frontend`.

**Jendela 1: backend**

```bash
cd backend
npm install
npm run dev
```

Tunggu sampai muncul `API berjalan di http://localhost:5000/api`. Biarkan jendela ini terbuka. Cek dengan membuka http://localhost:5000/api/buku di browser, harusnya muncul data JSON.

**Jendela 2: frontend**

```bash
cd frontend
npm install
npm run dev
```

Buka http://localhost:5173.

Kalau ingin mengulang dari data awal, hentikan backend dengan `Ctrl + C`, hapus folder `backend/data`, lalu jalankan lagi.

## Uji otomatis backend

```bash
cd backend
npm test
```

Uji ini menjalankan server sungguhan dengan file data sementara dan memeriksa CRUD buku, anggota, peminjaman, stok, batas pinjam, denda, dan validasi. Data asli tidak tersentuh.

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

```bash
docker compose up --build
```

Buka http://localhost:8080. Satu container menjalankan backend sekaligus menyajikan frontend hasil build, dan data disimpan di Docker volume `data-perpustakaan` sehingga tidak hilang saat container dibuat ulang.

## Deploy fullstack dengan Supabase dan Render

Frontend dan REST API di-deploy sebagai satu layanan Docker di Render. Data production disimpan di Supabase PostgreSQL; file JSON tetap dipakai untuk development lokal.

### 1. Siapkan database Supabase

1. Buat project di [Supabase](https://supabase.com/).
2. Buka **SQL Editor → New query**, salin seluruh isi `backend/schema.sql`, lalu pilih **Run**. Ini membuat tabel, indeks unik, dan mengaktifkan Row Level Security tanpa membuka akses tabel ke publik.
3. Buka **Project Settings → Database → Connection string**. Pilih **Session pooler** dan format **URI**. Salin connection string tersebut; gunakan password database project yang benar dan jangan masukkan connection string ke Git.

Backend terhubung langsung ke PostgreSQL melalui `DATABASE_URL`; kunci `anon` maupun `service_role` Supabase tidak diperlukan.

### 2. Deploy aplikasi ke Render

1. Push folder proyek ini ke repository GitHub.
2. Di Render, pilih **New → Blueprint**, hubungkan repository, dan pilih folder `perpustakaan` sebagai root jika repository berisi folder lain.
3. Render membaca konfigurasi dari `render.yaml`. Saat diminta, masukkan connection string Supabase sebagai nilai rahasia `DATABASE_URL`, lalu deploy.
4. Tunggu health check `/api/health` berhasil. Buka URL `.onrender.com` yang diberikan Render; frontend dan API berjalan di domain yang sama.

`DATABASE_URL` hanya digunakan di backend. Jangan mengawali variabel frontend dengan `VITE_` atau menaruh password database di konfigurasi frontend. Saat pertama kali backend berjalan dengan skema kosong, data contoh dibuat otomatis. Untuk deployment ini gunakan satu instance backend; penyimpanan cache aplikasi saat ini mengasumsikan satu instance.

### Variabel lingkungan

| Variabel | Fungsi | Bawaan |
|---|---|---|
| `PORT` | Port server | 5000 |
| `DATABASE_URL` | Connection string PostgreSQL Supabase; jika diatur, database ini dipakai alih-alih JSON | tidak diatur |
| `DATA_FILE` | Lokasi file data saat mode lokal | `backend/data/perpustakaan.json` |
| `PUBLIC_DIR` | Folder hasil build frontend | `backend/public` |
| `TZ` | Zona waktu untuk hitungan jatuh tempo | zona server (Docker: Asia/Jakarta) |

### Development lokal

Tanpa `DATABASE_URL`, backend menggunakan file JSON seperti sebelumnya. Jika ingin menguji dengan database Supabase, atur `DATABASE_URL` di environment backend lokal menggunakan connection string private; jangan commit file `.env` atau membagikan nilainya.

## Catatan

Mode lokal menyimpan satu file JSON agar mudah dijalankan tanpa database. Mode Supabase menggunakan tabel PostgreSQL dan transaksi saat menyimpan perubahan. Untuk deployment Render di panduan ini, jalankan satu instance backend.
