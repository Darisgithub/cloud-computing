// Uji otomatis API. Jalankan dengan:  npm test
// Server dijalankan sungguhan dengan data memori terisolasi, jadi database asli tidak tersentuh.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 5599;
const BASE = `http://localhost:${PORT}/api`;
const DIR = path.dirname(fileURLToPath(import.meta.url));
let proses;

async function api(metode, alamat, body) {
  const res = await fetch(BASE + alamat, {
    method: metode,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

before(async () => {
  proses = spawn(process.execPath, ["app.js"], {
    cwd: DIR,
    env: { ...process.env, PORT: String(PORT), TEST_MODE: "memory", PUBLIC_DIR: "/tidak-ada" },
    stdio: "ignore",
  });
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`${BASE}/health`)).ok) return;
    } catch {
      /* server belum siap */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Server tidak mau menyala");
});

after(() => proses?.kill());

test("data awal tersedia dan statistik konsisten", async () => {
  const buku = await api("GET", "/buku");
  const stat = await api("GET", "/statistik");
  assert.equal(buku.status, 200);
  assert.ok(buku.data.length >= 10);
  assert.equal(stat.data.judul, buku.data.length);
  assert.equal(stat.data.tersedia + stat.data.dipinjam, stat.data.eksemplar);
  assert.ok(stat.data.terlambat >= 1, "contoh data harus memuat peminjaman terlambat");
});

test("BUKU: create, read, update, delete", async () => {
  const baru = {
    judul: "Buku Uji",
    penulis: "Penulis Uji",
    kategori: "Referensi",
    tahun: 2020,
    jumlah: 2,
    deskripsi: "Hanya untuk pengujian.",
  };
  const dibuat = await api("POST", "/buku", baru);
  assert.equal(dibuat.status, 201);
  assert.equal(dibuat.data.tersedia, 2);
  assert.match(dibuat.data.kode, /^BK-\d{3}$/);

  const id = dibuat.data.id;
  assert.equal((await api("GET", `/buku/${id}`)).data.judul, "Buku Uji");

  const diubah = await api("PUT", `/buku/${id}`, { ...baru, judul: "Buku Uji Revisi", jumlah: 3 });
  assert.equal(diubah.status, 200);
  assert.equal(diubah.data.judul, "Buku Uji Revisi");
  assert.equal(diubah.data.tersedia, 3);

  const cari = await api("GET", "/buku?q=revisi");
  assert.equal(cari.data.length, 1);

  assert.equal((await api("DELETE", `/buku/${id}`)).status, 200);
  assert.equal((await api("GET", `/buku/${id}`)).status, 404);
});

test("BUKU: validasi menolak data tidak valid dan buku kembar", async () => {
  const dasar = { judul: "X", penulis: "Y", kategori: "Fiksi", tahun: 2000, jumlah: 1 };
  assert.equal((await api("POST", "/buku", { ...dasar, judul: "  " })).status, 400);
  assert.equal((await api("POST", "/buku", { ...dasar, kategori: "Tidak Ada" })).status, 400);
  assert.equal((await api("POST", "/buku", { ...dasar, tahun: 99 })).status, 400);
  assert.equal((await api("POST", "/buku", { ...dasar, jumlah: 0 })).status, 400);
  const kembar = await api("POST", "/buku", { ...dasar, judul: "laskar pelangi", penulis: "ANDREA HIRATA" });
  assert.equal(kembar.status, 409);
});

test("ANGGOTA: create, read, update, delete dan validasi", async () => {
  assert.equal((await api("POST", "/anggota", { nama: "A" })).status, 400);
  assert.equal((await api("POST", "/anggota", { nama: "Joko Uji", email: "salah" })).status, 400);

  const dibuat = await api("POST", "/anggota", { nama: "Joko Uji", email: "joko@contoh.id", telepon: "0812345678" });
  assert.equal(dibuat.status, 201);
  assert.match(dibuat.data.nomor, /^AK-\d{4}$/);
  const id = dibuat.data.id;

  assert.equal((await api("POST", "/anggota", { nama: "Joko Dua", email: "JOKO@contoh.id" })).status, 409);

  const diubah = await api("PUT", `/anggota/${id}`, { nama: "Joko Uji Baru", email: "joko@contoh.id", telepon: "" });
  assert.equal(diubah.data.nama, "Joko Uji Baru");

  assert.equal((await api("DELETE", `/anggota/${id}`)).status, 200);
  assert.equal((await api("GET", `/anggota/${id}`)).status, 404);
});

test("PEMINJAMAN: pinjam, stok berkurang, perpanjang, kembalikan, hapus", async () => {
  const b = (await api("POST", "/buku", { judul: "Stok Satu", penulis: "Uji", kategori: "Fiksi", tahun: 2021, jumlah: 1 })).data;
  const a1 = (await api("POST", "/anggota", { nama: "Peminjam Satu" })).data;
  const a2 = (await api("POST", "/anggota", { nama: "Peminjam Dua" })).data;

  const pinjam = await api("POST", "/peminjaman", { buku_id: b.id, anggota_id: a1.id, lama_hari: 7 });
  assert.equal(pinjam.status, 201);
  assert.equal(pinjam.data.status, "dipinjam");
  assert.equal((await api("GET", `/buku/${b.id}`)).data.tersedia, 0);

  // stok habis, tidak bisa dipinjam anggota lain
  assert.equal((await api("POST", "/peminjaman", { buku_id: b.id, anggota_id: a2.id })).status, 409);
  // buku tidak bisa dihapus selama dipinjam
  assert.equal((await api("DELETE", `/buku/${b.id}`)).status, 409);
  // anggota tidak bisa dihapus selama meminjam
  assert.equal((await api("DELETE", `/anggota/${a1.id}`)).status, 409);
  // jumlah eksemplar tidak boleh di bawah yang sedang dipinjam
  assert.equal(
    (await api("PUT", `/buku/${b.id}`, { judul: "Stok Satu", penulis: "Uji", kategori: "Fiksi", tahun: 2021, jumlah: 0 })).status,
    400
  );

  const [y, m, d] = pinjam.data.tanggal_pinjam.split("-").map(Number);
  const empatBelasHari = new Date(Date.UTC(y, m - 1, d + 14)).toISOString().slice(0, 10);
  const perpanjang = await api("PUT", `/peminjaman/${pinjam.data.id}`, { jatuh_tempo: empatBelasHari });
  assert.equal(perpanjang.status, 200);
  assert.equal(perpanjang.data.jatuh_tempo, empatBelasHari);
  const sebelumPinjam = await api("PUT", `/peminjaman/${pinjam.data.id}`, { jatuh_tempo: pinjam.data.tanggal_pinjam });
  assert.equal(sebelumPinjam.status, 400);
  const tidakValid = await api("PUT", `/peminjaman/${pinjam.data.id}`, { jatuh_tempo: "bukan-tanggal" });
  assert.equal(tidakValid.status, 400);

  const kembali = await api("POST", `/peminjaman/${pinjam.data.id}/kembali`);
  assert.equal(kembali.status, 200);
  assert.equal(kembali.data.status, "dikembalikan");
  assert.equal(kembali.data.denda, 0);
  assert.equal((await api("GET", `/buku/${b.id}`)).data.tersedia, 1);
  assert.equal((await api("POST", `/peminjaman/${pinjam.data.id}/kembali`)).status, 409);
  assert.equal((await api("PUT", `/peminjaman/${pinjam.data.id}`, { jatuh_tempo: "2030-01-01" })).status, 409);

  assert.equal((await api("DELETE", `/peminjaman/${pinjam.data.id}`)).status, 200);
  assert.equal((await api("GET", `/peminjaman/${pinjam.data.id}`)).status, 404);

  await api("DELETE", `/buku/${b.id}`);
  await api("DELETE", `/anggota/${a1.id}`);
  await api("DELETE", `/anggota/${a2.id}`);
});

test("PEMINJAMAN: batas 3 buku per anggota dan tidak boleh pinjam judul yang sama dua kali", async () => {
  const a = (await api("POST", "/anggota", { nama: "Pembaca Rajin" })).data;
  const semuaBuku = (await api("GET", "/buku")).data.filter((x) => x.tersedia > 0);
  const aktifIds = [];

  for (let i = 0; i < 3; i++) {
    const r = await api("POST", "/peminjaman", { buku_id: semuaBuku[i].id, anggota_id: a.id });
    assert.equal(r.status, 201);
    aktifIds.push(r.data.id);
  }
  assert.equal((await api("POST", "/peminjaman", { buku_id: semuaBuku[3].id, anggota_id: a.id })).status, 409);

  for (const id of aktifIds) await api("POST", `/peminjaman/${id}/kembali`);
  const ulang = await api("POST", "/peminjaman", { buku_id: semuaBuku[0].id, anggota_id: a.id });
  assert.equal(ulang.status, 201);
  assert.equal((await api("POST", "/peminjaman", { buku_id: semuaBuku[0].id, anggota_id: a.id })).status, 409);
});

test("PEMINJAMAN: denda dihitung Rp1.000 per hari terlambat", async () => {
  const terlambat = (await api("GET", "/peminjaman?status=terlambat")).data;
  assert.ok(terlambat.length >= 1);
  for (const l of terlambat) {
    assert.ok(l.hari_terlambat > 0);
    assert.equal(l.denda, l.hari_terlambat * 1000);
  }
  const target = terlambat[0];
  const selesai = await api("POST", `/peminjaman/${target.id}/kembali`);
  assert.equal(selesai.data.status, "dikembalikan");
  assert.equal(selesai.data.denda, target.hari_terlambat * 1000);
});

test("galat rute, metode, dan JSON tidak valid ditangani", async () => {
  assert.equal((await api("GET", "/tidak-ada")).status, 404);
  assert.equal((await api("PATCH", "/buku")).status, 405);
  const rusak = await fetch(`${BASE}/buku`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{rusak" });
  assert.equal(rusak.status, 400);
});
