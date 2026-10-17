import { hariIniISO, rupiah, selisihHari, tanggalPendek } from "../utils.js";

// Cap tanggal ala slip peminjaman perpustakaan.
// Warna cap menunjukkan status: biru tinta (dipinjam), merah (terlambat), hijau (sudah kembali).
export function Cap({ pinjam, baru = false }) {
  const { status, jatuh_tempo, tanggal_kembali, hari_terlambat, denda } = pinjam;
  let baris;

  if (status === "dikembalikan") {
    baris = ["Dikembalikan", tanggalPendek(tanggal_kembali), denda > 0 ? `Denda ${rupiah(denda)}` : "Tanpa denda"];
  } else if (status === "terlambat") {
    baris = ["Terlambat", `${hari_terlambat} hari`, `Denda ${rupiah(denda)}`];
  } else {
    const sisa = selisihHari(hariIniISO(), jatuh_tempo);
    baris = [
      "Jatuh tempo",
      tanggalPendek(jatuh_tempo),
      sisa <= 0 ? "Hari ini" : sisa === 1 ? "Besok" : `${sisa} hari lagi`,
    ];
  }

  // Kemiringan kecil yang berbeda-beda, seperti cap yang ditekan dengan tangan.
  const miring = ((pinjam.id % 3) - 1) * 1.8;

  return (
    <div
      className={`cap cap-${status}${baru ? " cap-baru" : ""}`}
      style={{ "--miring": `${miring}deg` }}
    >
      <span className="cap-label">{baris[0]}</span>
      <span className="cap-utama">{baris[1]}</span>
      <span className="cap-catatan">{baris[2]}</span>
    </div>
  );
}
