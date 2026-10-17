// Fungsi bantu tampilan: warna kategori, format tanggal dan rupiah.

// Warna punggung buku per kategori. Kategori baru dari backend memakai warna cadangan.
const WARNA = {
  Fiksi: { bg: "#7A2E2E", fg: "#F6EFE4" },
  "Pengembangan Diri": { bg: "#C9972F", fg: "#2A2008" },
  Sejarah: { bg: "#5B3A5C", fg: "#F3ECF3" },
  "Sains & Teknologi": { bg: "#27425F", fg: "#EAF0F6" },
  "Anak & Remaja": { bg: "#2F6B6B", fg: "#E9F4F3" },
  Referensi: { bg: "#4D5B66", fg: "#EEF1F3" },
};
export const warna = (kategori) => WARNA[kategori] || { bg: "#4D5B66", fg: "#EEF1F3" };

export const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);

const dua = (n) => String(n).padStart(2, "0");

export function hariIniISO() {
  const d = new Date();
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;
}

export function tambahHariISO(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function selisihHari(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

const tanggal = (iso, opsi) => new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", opsi);

export const tanggalPendek = (iso) => tanggal(iso, { day: "numeric", month: "short" });
export const tanggalLengkap = (iso) => tanggal(iso, { day: "numeric", month: "short", year: "numeric" });
export const tanggalPanjang = (iso) =>
  tanggal(iso, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export function inisial(nama) {
  const kata = nama.trim().split(/\s+/);
  return (kata[0][0] + (kata.length > 1 ? kata[kata.length - 1][0] : "")).toUpperCase();
}

// Pilih warna stabil dari nama (untuk lingkaran inisial anggota).
export function warnaDariNama(nama) {
  const daftar = Object.values(WARNA);
  let h = 0;
  for (const c of nama) h = (h * 31 + c.charCodeAt(0)) % 997;
  return daftar[h % daftar.length];
}
