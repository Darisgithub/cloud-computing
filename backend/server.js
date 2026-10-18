// Server HTTP perpustakaan, hanya memakai modul bawaan Node.js.
//
//  BUKU
//   GET    /api/buku?q=&kategori=      daftar buku (Read)
//   GET    /api/buku/:id               satu buku (Read)
//   POST   /api/buku                   tambah buku (Create)
//   PUT    /api/buku/:id               ubah buku (Update)
//   DELETE /api/buku/:id               hapus buku (Delete)
//  ANGGOTA
//   GET    /api/anggota?q=             daftar anggota (Read)
//   GET    /api/anggota/:id            satu anggota (Read)
//   POST   /api/anggota                tambah anggota (Create)
//   PUT    /api/anggota/:id            ubah anggota (Update)
//   DELETE /api/anggota/:id            hapus anggota (Delete)
//  PEMINJAMAN
//   GET    /api/peminjaman?status=&q=  daftar peminjaman (Read)
//   GET    /api/peminjaman/:id         satu peminjaman (Read)
//   POST   /api/peminjaman             pinjamkan buku (Create)
//   PUT    /api/peminjaman/:id         perpanjang jatuh tempo (Update)
//   POST   /api/peminjaman/:id/kembali kembalikan buku (Update)
//   DELETE /api/peminjaman/:id         hapus catatan (Delete)
//  LAINNYA
//   GET    /api/statistik              ringkasan untuk halaman Beranda
//   GET    /api/kategori               daftar kategori buku
//   GET    /api/health                 cek server hidup

import "dotenv/config";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Galat } from "./util.js";
import * as s from "./service.js";
import { initStore } from "./store.js";

const PORT = Number(process.env.PORT) || 5000;
const DIR = path.dirname(fileURLToPath(import.meta.url));
// Kalau folder "public" berisi hasil build frontend, server ikut menyajikannya.
const PUBLIC_DIR = process.env.PUBLIC_DIR || path.join(DIR, "public");

// ------------------------------------------------------------- router kecil
const KODE_STATUS = Symbol("status");
const rute = [];
const daftar = (metode, pola, handler) =>
  rute.push({
    metode,
    regex: new RegExp(`^${pola.replace(/:(\w+)/g, "(?<$1>[^/]+)")}/?$`),
    handler,
  });

// Pembungkus untuk respons "201 Dibuat" (selain itu otomatis 200).
const dibuat = (data) => ({ [KODE_STATUS]: 201, data });

daftar("GET", "/api/health", () => ({ status: "ok" }));
daftar("GET", "/api/kategori", () => s.KATEGORI);
daftar("GET", "/api/statistik", () => s.statistik());

daftar("GET", "/api/buku", ({ query }) => s.daftarBuku({ q: query.get("q") || "", kategori: query.get("kategori") || "" }));
daftar("GET", "/api/buku/:id", ({ params }) => s.ambilBuku(params.id));
daftar("POST", "/api/buku", async ({ body }) => dibuat(await s.tambahBuku(body)));
daftar("PUT", "/api/buku/:id", ({ params, body }) => s.ubahBuku(params.id, body));
daftar("DELETE", "/api/buku/:id", async ({ params }) => {
  await s.hapusBuku(params.id);
  return { pesan: "Buku dihapus." };
});

daftar("GET", "/api/anggota", ({ query }) => s.daftarAnggota({ q: query.get("q") || "" }));
daftar("GET", "/api/anggota/:id", ({ params }) => s.ambilAnggota(params.id));
daftar("POST", "/api/anggota", async ({ body }) => dibuat(await s.tambahAnggota(body)));
daftar("PUT", "/api/anggota/:id", ({ params, body }) => s.ubahAnggota(params.id, body));
daftar("DELETE", "/api/anggota/:id", async ({ params }) => {
  await s.hapusAnggota(params.id);
  return { pesan: "Anggota dihapus." };
});

daftar("GET", "/api/peminjaman", ({ query }) => s.daftarPinjam({ status: query.get("status") || "", q: query.get("q") || "" }));
daftar("GET", "/api/peminjaman/:id", ({ params }) => s.ambilPinjam(params.id));
daftar("POST", "/api/peminjaman", async ({ body }) => dibuat(await s.tambahPinjam(body)));
daftar("PUT", "/api/peminjaman/:id", ({ params, body }) => s.ubahPinjam(params.id, body));
daftar("POST", "/api/peminjaman/:id/kembali", ({ params }) => s.kembalikan(params.id));
daftar("DELETE", "/api/peminjaman/:id", async ({ params }) => {
  await s.hapusPinjam(params.id);
  return { pesan: "Catatan peminjaman dihapus." };
});

// ----------------------------------------------------------------- bantu
function bacaBody(req) {
  if (req.body !== undefined) {
    if (typeof req.body === "string") {
      try {
        return Promise.resolve(JSON.parse(req.body));
      } catch {
        return Promise.reject(new Galat(400, "Format JSON tidak valid."));
      }
    }
    if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
    return Promise.resolve({});
  }

  return new Promise((resolve, reject) => {
    const potongan = [];
    let ukuran = 0;
    req.on("data", (c) => {
      ukuran += c.length;
      if (ukuran > 200_000) {
        reject(new Galat(413, "Data yang dikirim terlalu besar."));
        req.destroy();
        return;
      }
      potongan.push(c);
    });
    req.on("end", () => {
      if (!potongan.length) return resolve({});
      try {
        const hasil = JSON.parse(Buffer.concat(potongan).toString("utf8"));
        resolve(hasil && typeof hasil === "object" ? hasil : {});
      } catch {
        reject(new Galat(400, "Format JSON tidak valid."));
      }
    });
    req.on("error", reject);
  });
}

function kirimJson(res, status, data) {
  const isi = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(isi),
  });
  res.end(isi);
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
};

function sajikanFile(req, res, pathname) {
  if (!fs.existsSync(PUBLIC_DIR)) {
    return kirimJson(res, 404, { error: "Halaman tidak ditemukan." });
  }
  const aman = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  let berkas = path.join(PUBLIC_DIR, aman);
  if (!berkas.startsWith(PUBLIC_DIR)) return kirimJson(res, 403, { error: "Akses ditolak." });
  if (!fs.existsSync(berkas) || fs.statSync(berkas).isDirectory()) {
    berkas = path.join(PUBLIC_DIR, "index.html"); // fallback untuk aplikasi satu halaman
  }
  const jenis = MIME[path.extname(berkas)] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": jenis });
  fs.createReadStream(berkas).pipe(res);
}

// ---------------------------------------------------------------- server
export async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, "http://localhost");
  if (!url.pathname.startsWith("/api")) {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return kirimJson(res, 405, { error: "Metode tidak diizinkan." });
    }
    return sajikanFile(req, res, url.pathname);
  }

  try {
    let cocok = null;
    let adaPolaSama = false;
    for (const r of rute) {
      const m = r.regex.exec(url.pathname);
      if (!m) continue;
      adaPolaSama = true;
      if (r.metode === req.method) {
        cocok = { r, params: m.groups || {} };
        break;
      }
    }
    if (!cocok) {
      throw new Galat(adaPolaSama ? 405 : 404, adaPolaSama ? "Metode tidak diizinkan." : "Alamat API tidak ditemukan.");
    }

    const body = req.method === "POST" || req.method === "PUT" ? await bacaBody(req) : {};
    const hasil = await cocok.r.handler({ params: cocok.params, query: url.searchParams, body });
    if (hasil && hasil[KODE_STATUS]) return kirimJson(res, hasil[KODE_STATUS], hasil.data);
    kirimJson(res, 200, hasil);
  } catch (err) {
    if (err instanceof Galat) {
      return kirimJson(res, err.status, { error: err.message, field: err.field });
    }
    console.error(err);
    kirimJson(res, 500, { error: "Terjadi kesalahan pada server." });
  }
}

await initStore();
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = http.createServer(handler);
  server.listen(PORT, () => {
    console.log(`Perpustakaan Aksara: API berjalan di http://localhost:${PORT}/api`);
    console.log("Penyimpanan: Supabase PostgreSQL");
  });
}
