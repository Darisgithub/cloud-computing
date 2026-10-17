// Logika bisnis perpustakaan: validasi, aturan peminjaman, dan CRUD.
// Stok buku tidak disimpan terpisah. "tersedia" selalu dihitung dari
// jumlah eksemplar dikurangi peminjaman yang belum kembali, jadi tidak bisa tidak sinkron.

import { ambilDb, idBerikutnya, simpan } from "./store.js";
import { Galat, hariIni, rapikan, selisihHari, tambahHari, tanggalValid } from "./util.js";

export const KATEGORI = [
  "Fiksi",
  "Pengembangan Diri",
  "Sejarah",
  "Sains & Teknologi",
  "Anak & Remaja",
  "Referensi",
];

export const DENDA_PER_HARI = 1000;
export const MAKS_PINJAM_PER_ANGGOTA = 3;
const MAKS_LAMA_HARI = 30;

const db = () => ambilDb();
const aktif = (l) => !l.tanggal_kembali;
const nomor = (awalan, id, lebar) => `${awalan}-${String(id).padStart(lebar, "0")}`;

// ---------------------------------------------------------------- BUKU

function tampilBuku(b) {
  const dipinjam = db().peminjaman.filter((l) => l.buku_id === b.id && aktif(l)).length;
  return { ...b, dipinjam, tersedia: b.jumlah - dipinjam };
}

function cariBuku(id) {
  const b = db().buku.find((x) => x.id === Number(id));
  if (!b) throw new Galat(404, "Buku tidak ditemukan.");
  return b;
}

function validasiBuku(body, dipinjam = 0) {
  const judul = rapikan(body.judul);
  const penulis = rapikan(body.penulis);
  const kategori = rapikan(body.kategori);
  const tahun = Number(body.tahun);
  const jumlah = Number(body.jumlah);
  const deskripsi = rapikan(body.deskripsi);
  const tahunMaks = new Date().getFullYear() + 1;

  if (!judul) throw new Galat(400, "Judul buku wajib diisi.", "judul");
  if (judul.length > 150) throw new Galat(400, "Judul maksimal 150 karakter.", "judul");
  if (!penulis) throw new Galat(400, "Nama penulis wajib diisi.", "penulis");
  if (penulis.length > 120) throw new Galat(400, "Nama penulis maksimal 120 karakter.", "penulis");
  if (!KATEGORI.includes(kategori)) throw new Galat(400, "Pilih salah satu kategori yang tersedia.", "kategori");
  if (!Number.isInteger(tahun) || tahun < 1000 || tahun > tahunMaks) {
    throw new Galat(400, `Tahun terbit harus antara 1000 dan ${tahunMaks}.`, "tahun");
  }
  if (!Number.isInteger(jumlah) || jumlah < 1 || jumlah > 999) {
    throw new Galat(400, "Jumlah eksemplar harus bilangan bulat antara 1 dan 999.", "jumlah");
  }
  if (jumlah < dipinjam) {
    throw new Galat(
      400,
      `Jumlah eksemplar tidak boleh kurang dari ${dipinjam}, karena ${dipinjam} eksemplar sedang dipinjam.`,
      "jumlah"
    );
  }
  if (deskripsi.length > 600) throw new Galat(400, "Deskripsi maksimal 600 karakter.", "deskripsi");

  return { judul, penulis, kategori, tahun, jumlah, deskripsi };
}

function pastikanBukuUnik(data, kecualiId) {
  const kembar = db().buku.find(
    (b) =>
      b.id !== kecualiId &&
      b.judul.toLowerCase() === data.judul.toLowerCase() &&
      b.penulis.toLowerCase() === data.penulis.toLowerCase()
  );
  if (kembar) throw new Galat(409, `Buku "${kembar.judul}" dari penulis ini sudah ada di koleksi.`, "judul");
}

export function daftarBuku({ q = "", kategori = "" } = {}) {
  const kata = q.trim().toLowerCase();
  return db()
    .buku.filter(
      (b) =>
        (!kategori || b.kategori === kategori) &&
        (!kata ||
          b.judul.toLowerCase().includes(kata) ||
          b.penulis.toLowerCase().includes(kata) ||
          b.kode.toLowerCase().includes(kata))
    )
    .map(tampilBuku)
    .sort((a, b) => a.judul.localeCompare(b.judul, "id"));
}

export const ambilBuku = (id) => tampilBuku(cariBuku(id));

export async function tambahBuku(body) {
  const data = validasiBuku(body);
  pastikanBukuUnik(data);
  const id = idBerikutnya("buku");
  const buku = { id, kode: nomor("BK", id, 3), ...data, dibuat: hariIni() };
  db().buku.push(buku);
  await simpan();
  return tampilBuku(buku);
}

export async function ubahBuku(id, body) {
  const buku = cariBuku(id);
  const dipinjam = tampilBuku(buku).dipinjam;
  const data = validasiBuku(body, dipinjam);
  pastikanBukuUnik(data, buku.id);
  Object.assign(buku, data);
  await simpan();
  return tampilBuku(buku);
}

export async function hapusBuku(id) {
  const buku = cariBuku(id);
  const { dipinjam } = tampilBuku(buku);
  if (dipinjam > 0) {
    throw new Galat(409, `Buku ini masih dipinjam ${dipinjam} eksemplar. Kembalikan dulu sebelum menghapusnya.`);
  }
  db().buku = db().buku.filter((b) => b.id !== buku.id);
  await simpan();
}

// ------------------------------------------------------------- ANGGOTA

function tampilAnggota(a) {
  const milik = db().peminjaman.filter((l) => l.anggota_id === a.id);
  const sekarang = hariIni();
  const berjalan = milik.filter(aktif);
  return {
    ...a,
    pinjaman_aktif: berjalan.length,
    terlambat: berjalan.filter((l) => selisihHari(l.jatuh_tempo, sekarang) > 0).length,
    total_pinjaman: milik.length,
  };
}

function cariAnggota(id) {
  const a = db().anggota.find((x) => x.id === Number(id));
  if (!a) throw new Galat(404, "Anggota tidak ditemukan.");
  return a;
}

function validasiAnggota(body) {
  const nama = rapikan(body.nama);
  const email = rapikan(body.email).toLowerCase();
  const telepon = rapikan(body.telepon);

  if (nama.length < 2) throw new Galat(400, "Nama anggota wajib diisi (minimal 2 huruf).", "nama");
  if (nama.length > 80) throw new Galat(400, "Nama maksimal 80 karakter.", "nama");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Galat(400, "Format email belum benar. Contoh: nama@contoh.id", "email");
  }
  if (telepon && !/^[0-9+\-\s]{6,20}$/.test(telepon)) {
    throw new Galat(400, "Nomor telepon hanya boleh berisi angka, spasi, + atau -, sepanjang 6 sampai 20 karakter.", "telepon");
  }
  return { nama, email, telepon };
}

function pastikanEmailUnik(email, kecualiId) {
  if (!email) return;
  const kembar = db().anggota.find((a) => a.id !== kecualiId && a.email.toLowerCase() === email);
  if (kembar) throw new Galat(409, `Email ini sudah dipakai oleh ${kembar.nama}.`, "email");
}

export function daftarAnggota({ q = "" } = {}) {
  const kata = q.trim().toLowerCase();
  return db()
    .anggota.filter(
      (a) =>
        !kata ||
        a.nama.toLowerCase().includes(kata) ||
        a.nomor.toLowerCase().includes(kata) ||
        a.email.toLowerCase().includes(kata)
    )
    .map(tampilAnggota)
    .sort((a, b) => a.nama.localeCompare(b.nama, "id"));
}

export const ambilAnggota = (id) => tampilAnggota(cariAnggota(id));

export async function tambahAnggota(body) {
  const data = validasiAnggota(body);
  pastikanEmailUnik(data.email);
  const id = idBerikutnya("anggota");
  const anggota = { id, nomor: nomor("AK", id, 4), ...data, bergabung: hariIni() };
  db().anggota.push(anggota);
  await simpan();
  return tampilAnggota(anggota);
}

export async function ubahAnggota(id, body) {
  const anggota = cariAnggota(id);
  const data = validasiAnggota(body);
  pastikanEmailUnik(data.email, anggota.id);
  Object.assign(anggota, data);
  await simpan();
  return tampilAnggota(anggota);
}

export async function hapusAnggota(id) {
  const anggota = cariAnggota(id);
  const { pinjaman_aktif } = tampilAnggota(anggota);
  if (pinjaman_aktif > 0) {
    throw new Galat(409, `${anggota.nama} masih meminjam ${pinjaman_aktif} buku. Kembalikan dulu sebelum menghapus anggota.`);
  }
  db().anggota = db().anggota.filter((a) => a.id !== anggota.id);
  await simpan();
}

// --------------------------------------------------------- PEMINJAMAN

function tampilPinjam(l) {
  const buku = db().buku.find((b) => b.id === l.buku_id);
  const anggota = db().anggota.find((a) => a.id === l.anggota_id);
  let status;
  let hariTerlambat;
  let denda;

  if (l.tanggal_kembali) {
    status = "dikembalikan";
    hariTerlambat = Math.max(0, selisihHari(l.jatuh_tempo, l.tanggal_kembali));
    denda = l.denda || 0;
  } else {
    hariTerlambat = Math.max(0, selisihHari(l.jatuh_tempo, hariIni()));
    status = hariTerlambat > 0 ? "terlambat" : "dipinjam";
    denda = hariTerlambat * DENDA_PER_HARI;
  }

  return {
    id: l.id,
    buku_id: l.buku_id,
    anggota_id: l.anggota_id,
    judul: buku?.judul ?? l.judul,
    kategori: buku?.kategori ?? l.kategori,
    nama_anggota: anggota?.nama ?? l.nama_anggota,
    nomor_anggota: anggota?.nomor ?? l.nomor_anggota,
    tanggal_pinjam: l.tanggal_pinjam,
    jatuh_tempo: l.jatuh_tempo,
    tanggal_kembali: l.tanggal_kembali,
    status,
    hari_terlambat: hariTerlambat,
    denda,
  };
}

function cariPinjam(id) {
  const l = db().peminjaman.find((x) => x.id === Number(id));
  if (!l) throw new Galat(404, "Data peminjaman tidak ditemukan.");
  return l;
}

export function daftarPinjam({ status = "", q = "" } = {}) {
  const kata = q.trim().toLowerCase();
  return db()
    .peminjaman.map(tampilPinjam)
    .filter(
      (l) =>
        (!status || l.status === status || (status === "aktif" && l.status !== "dikembalikan")) &&
        (!kata || l.judul.toLowerCase().includes(kata) || l.nama_anggota.toLowerCase().includes(kata))
    )
    .sort((a, b) => b.id - a.id);
}

export const ambilPinjam = (id) => tampilPinjam(cariPinjam(id));

export async function tambahPinjam(body) {
  const bukuId = Number(body.buku_id);
  const anggotaId = Number(body.anggota_id);
  const lama = body.lama_hari === undefined || body.lama_hari === "" ? 7 : Number(body.lama_hari);

  if (!Number.isInteger(bukuId) || !db().buku.some((b) => b.id === bukuId)) {
    throw new Galat(400, "Pilih buku yang akan dipinjam.", "buku_id");
  }
  if (!Number.isInteger(anggotaId) || !db().anggota.some((a) => a.id === anggotaId)) {
    throw new Galat(400, "Pilih anggota yang meminjam.", "anggota_id");
  }
  if (!Number.isInteger(lama) || lama < 1 || lama > MAKS_LAMA_HARI) {
    throw new Galat(400, `Lama peminjaman harus antara 1 dan ${MAKS_LAMA_HARI} hari.`, "lama_hari");
  }

  const buku = cariBuku(bukuId);
  const anggota = cariAnggota(anggotaId);

  if (tampilBuku(buku).tersedia < 1) {
    throw new Galat(409, `Semua eksemplar "${buku.judul}" sedang dipinjam.`, "buku_id");
  }
  const milik = db().peminjaman.filter((l) => l.anggota_id === anggotaId && aktif(l));
  if (milik.length >= MAKS_PINJAM_PER_ANGGOTA) {
    throw new Galat(409, `${anggota.nama} sudah meminjam ${MAKS_PINJAM_PER_ANGGOTA} buku, yaitu batas maksimal per anggota.`, "anggota_id");
  }
  if (milik.some((l) => l.buku_id === bukuId)) {
    throw new Galat(409, `${anggota.nama} sedang meminjam "${buku.judul}".`, "buku_id");
  }

  const mulai = hariIni();
  const l = {
    id: idBerikutnya("peminjaman"),
    buku_id: buku.id,
    anggota_id: anggota.id,
    judul: buku.judul,
    kategori: buku.kategori,
    nama_anggota: anggota.nama,
    nomor_anggota: anggota.nomor,
    tanggal_pinjam: mulai,
    jatuh_tempo: tambahHari(mulai, lama),
    tanggal_kembali: null,
    denda: 0,
  };
  db().peminjaman.push(l);
  await simpan();
  return tampilPinjam(l);
}

// Perpanjang: ubah tanggal jatuh tempo peminjaman yang masih berjalan.
export async function ubahPinjam(id, body) {
  const l = cariPinjam(id);
  if (!aktif(l)) throw new Galat(409, "Peminjaman ini sudah selesai, jatuh temponya tidak bisa diubah.");
  if (!tanggalValid(body.jatuh_tempo)) {
    throw new Galat(400, "Tanggal jatuh tempo tidak valid.", "jatuh_tempo");
  }
  if (selisihHari(l.tanggal_pinjam, body.jatuh_tempo) < 1) {
    throw new Galat(400, "Jatuh tempo harus setelah tanggal pinjam.", "jatuh_tempo");
  }
  if (selisihHari(l.tanggal_pinjam, body.jatuh_tempo) > 60) {
    throw new Galat(400, "Total lama peminjaman maksimal 60 hari.", "jatuh_tempo");
  }
  l.jatuh_tempo = body.jatuh_tempo;
  await simpan();
  return tampilPinjam(l);
}

export async function kembalikan(id) {
  const l = cariPinjam(id);
  if (!aktif(l)) throw new Galat(409, "Buku ini sudah dikembalikan.");
  const sekarang = hariIni();
  l.tanggal_kembali = sekarang;
  l.denda = Math.max(0, selisihHari(l.jatuh_tempo, sekarang)) * DENDA_PER_HARI;
  await simpan();
  return tampilPinjam(l);
}

export async function hapusPinjam(id) {
  const l = cariPinjam(id);
  db().peminjaman = db().peminjaman.filter((x) => x.id !== l.id);
  await simpan();
}

// ----------------------------------------------------------- STATISTIK

export function statistik() {
  const semua = db().peminjaman.map(tampilPinjam);
  const berjalan = semua.filter((l) => l.status !== "dikembalikan");
  const eksemplar = db().buku.reduce((n, b) => n + b.jumlah, 0);

  const hitung = new Map();
  for (const l of semua) hitung.set(l.buku_id, (hitung.get(l.buku_id) || 0) + 1);
  const populer = [...hitung.entries()]
    .map(([bukuId, jumlah]) => ({
      buku_id: bukuId,
      judul: semua.find((l) => l.buku_id === bukuId).judul,
      jumlah,
    }))
    .sort((a, b) => b.jumlah - a.jumlah || a.judul.localeCompare(b.judul, "id"))
    .slice(0, 5);

  return {
    judul: db().buku.length,
    eksemplar,
    dipinjam: berjalan.length,
    tersedia: eksemplar - berjalan.length,
    terlambat: berjalan.filter((l) => l.status === "terlambat").length,
    anggota: db().anggota.length,
    denda_berjalan: berjalan.reduce((n, l) => n + l.denda, 0),
    populer,
  };
}
