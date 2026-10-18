// Fungsi bantu: error HTTP dan perhitungan tanggal.
// Tanggal disimpan dalam format ISO "YYYY-MM-DD" agar konsisten di database dan API.

export class Galat extends Error {
  constructor(status, pesan, field) {
    super(pesan);
    this.status = status;
    this.field = field;
  }
}

const dua = (n) => String(n).padStart(2, "0");

// Tanggal hari ini menurut zona waktu server (atur TZ=Asia/Jakarta di server cloud).
export function hariIni() {
  const d = new Date();
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;
}

export function tambahHari(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

// Selisih hari: (b - a). Positif jika b setelah a.
export function selisihHari(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

export function tanggalValid(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = Date.parse(`${s}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s;
}

export const rapikan = (v) => String(v ?? "").trim().replace(/\s+/g, " ");
