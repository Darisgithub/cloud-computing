// Semua komunikasi frontend dengan backend ada di file ini.
// Saat development, Vite meneruskan "/api" ke backend (lihat vite.config.js).
// Untuk deploy terpisah, isi VITE_API_URL dengan URL backend yang berakhiran /api.
const BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

async function kirim(metode, alamat, body) {
  let res;
  try {
    res = await fetch(`${BASE}${alamat}`, {
      method: metode,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("Server tidak terjangkau. Periksa koneksi ke backend.");
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
