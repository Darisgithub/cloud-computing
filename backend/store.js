// Penyimpanan aplikasi selalu menggunakan Supabase PostgreSQL.
import pg from "pg";
import { seed } from "./seed.js";

const { Pool } = pg;
const modeUji = process.env.TEST_MODE === "memory";
const caCertBase64 = process.env.SUPABASE_CA_CERT_BASE64;
const caCert = caCertBase64 ? Buffer.from(caCertBase64, "base64").toString("utf8") : null;

if (!modeUji && process.env.DATABASE_URL && !caCert) {
  throw new Error(
    "SUPABASE_CA_CERT_BASE64 wajib diatur. Unduh sertifikat root database dari Supabase, encode ke Base64, lalu tambahkan sebagai environment variable."
  );
}
if (caCert && !caCert.includes("-----BEGIN CERTIFICATE-----")) {
  throw new Error("SUPABASE_CA_CERT_BASE64 bukan sertifikat PEM yang valid setelah di-decode.");
}

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { ca: caCert, rejectUnauthorized: true },
      max: process.env.VERCEL ? 1 : 10,
    })
  : null;

let db;
let antrianSimpan = Promise.resolve();

async function muatSupabase() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const metadata = await client.query(
      "SELECT initialized FROM library_meta WHERE id = TRUE FOR UPDATE"
    );
    if (metadata.rowCount === 0) {
      throw new Error("Tabel Supabase belum siap. Jalankan backend/schema.sql di Supabase SQL Editor.");
    }

    const buku = await client.query("SELECT * FROM buku ORDER BY id");
    const anggota = await client.query("SELECT * FROM anggota ORDER BY id");
    const peminjaman = await client.query("SELECT * FROM peminjaman ORDER BY id");

    if (!metadata.rows[0].initialized) {
      db = seed();
      await tulisSupabase(client);
      await client.query("UPDATE library_meta SET initialized = TRUE WHERE id = TRUE");
    } else {
      const dataBuku = buku.rows;
      const dataAnggota = anggota.rows;
      const dataPeminjaman = peminjaman.rows;
      db = {
        buku: dataBuku,
        anggota: dataAnggota,
        peminjaman: dataPeminjaman,
        counters: {
          buku: Math.max(0, ...dataBuku.map((x) => x.id)),
          anggota: Math.max(0, ...dataAnggota.map((x) => x.id)),
          peminjaman: Math.max(0, ...dataPeminjaman.map((x) => x.id)),
        },
      };
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function tulisSupabase(client) {
  await client.query("DELETE FROM peminjaman");
  await client.query("DELETE FROM anggota");
  await client.query("DELETE FROM buku");
  for (const row of db.buku) {
    await client.query(
      `INSERT INTO buku (id, kode, judul, penulis, kategori, tahun, jumlah, deskripsi, dibuat)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [row.id, row.kode, row.judul, row.penulis, row.kategori, row.tahun, row.jumlah, row.deskripsi, row.dibuat]
    );
  }
  for (const row of db.anggota) {
    await client.query(
      `INSERT INTO anggota (id, nomor, nama, email, telepon, bergabung)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [row.id, row.nomor, row.nama, row.email, row.telepon, row.bergabung]
    );
  }
  for (const row of db.peminjaman) {
    await client.query(
      `INSERT INTO peminjaman
       (id, buku_id, anggota_id, judul, kategori, nama_anggota, nomor_anggota,
        tanggal_pinjam, jatuh_tempo, tanggal_kembali, denda)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        row.id, row.buku_id, row.anggota_id, row.judul, row.kategori,
        row.nama_anggota, row.nomor_anggota, row.tanggal_pinjam,
        row.jatuh_tempo, row.tanggal_kembali, row.denda,
      ]
    );
  }
}

export async function initStore() {
  if (modeUji) {
    db = seed();
    return;
  }
  if (!pool) {
    throw new Error("DATABASE_URL wajib diatur. Backend hanya mendukung Supabase PostgreSQL.");
  }
  await muatSupabase();
}

export const ambilDb = () => db;

export function idBerikutnya(tabel) {
  db.counters[tabel] += 1;
  return db.counters[tabel];
}

export function simpan() {
  if (modeUji) {
    return Promise.resolve();
  }

  const operation = antrianSimpan.then(async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await tulisSupabase(client);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  });
  antrianSimpan = operation.catch(() => {});
  return operation;
}
