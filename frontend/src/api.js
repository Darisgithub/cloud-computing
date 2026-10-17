// Semua komunikasi frontend dengan backend ada di file ini.
// Saat development, Vite meneruskan "/api" ke backend (lihat vite.config.js).
// Kalau backend ada di alamat lain, isi VITE_API_URL, contoh: https://api.contoh.com/api
const BASE = import.meta.env.VITE_API_URL || "/api";

async function kirim(metode, alamat, body) {
  let res;
  try {
    res = await fetch(`${BASE}${alamat}`, {
      method: metode,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("Server tidak terjangkau. Pastikan backend sudah berjalan di port 5000.");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const galat = new Error(data.error || "Terjadi kesalahan pada server.");
    galat.field = data.field;
    throw galat;
  }
  return data;
}

export const api = {
  kategori: () => kirim("GET", "/kategori"),
  statistik: () => kirim("GET", "/statistik"),

  buku: () => kirim("GET", "/buku"),
  tambahBuku: (d) => kirim("POST", "/buku", d),
  ubahBuku: (id, d) => kirim("PUT", `/buku/${id}`, d),
  hapusBuku: (id) => kirim("DELETE", `/buku/${id}`),

  anggota: () => kirim("GET", "/anggota"),
  tambahAnggota: (d) => kirim("POST", "/anggota", d),
  ubahAnggota: (id, d) => kirim("PUT", `/anggota/${id}`, d),
  hapusAnggota: (id) => kirim("DELETE", `/anggota/${id}`),

  peminjaman: () => kirim("GET", "/peminjaman"),
  pinjamkan: (d) => kirim("POST", "/peminjaman", d),
  perpanjang: (id, jatuhTempo) => kirim("PUT", `/peminjaman/${id}`, { jatuh_tempo: jatuhTempo }),
  kembalikan: (id) => kirim("POST", `/peminjaman/${id}/kembali`),
  hapusPinjam: (id) => kirim("DELETE", `/peminjaman/${id}`),
};
