CREATE TABLE IF NOT EXISTS public.library_meta (
  id boolean PRIMARY KEY DEFAULT TRUE CHECK (id),
  initialized boolean NOT NULL DEFAULT FALSE
);

INSERT INTO public.library_meta (id, initialized)
VALUES (TRUE, FALSE)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.buku (
  id integer PRIMARY KEY,
  kode text NOT NULL UNIQUE,
  judul text NOT NULL,
  penulis text NOT NULL,
  kategori text NOT NULL,
  tahun integer NOT NULL,
  jumlah integer NOT NULL,
  deskripsi text NOT NULL DEFAULT '',
  dibuat date NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS buku_judul_penulis_unik
  ON public.buku (lower(judul), lower(penulis));

CREATE TABLE IF NOT EXISTS public.anggota (
  id integer PRIMARY KEY,
  nomor text NOT NULL UNIQUE,
  nama text NOT NULL,
  email text NOT NULL DEFAULT '',
  telepon text NOT NULL DEFAULT '',
  bergabung date NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS anggota_email_unik
  ON public.anggota (lower(email))
  WHERE email <> '';

CREATE TABLE IF NOT EXISTS public.peminjaman (
  id integer PRIMARY KEY,
  buku_id integer NOT NULL,
  anggota_id integer NOT NULL,
  judul text NOT NULL,
  kategori text NOT NULL,
  nama_anggota text NOT NULL,
  nomor_anggota text NOT NULL,
  tanggal_pinjam date NOT NULL,
  jatuh_tempo date NOT NULL,
  tanggal_kembali date,
  denda integer NOT NULL DEFAULT 0
);

ALTER TABLE public.library_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buku ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anggota ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peminjaman ENABLE ROW LEVEL SECURITY;
