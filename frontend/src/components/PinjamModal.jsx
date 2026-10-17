import { useState } from "react";
import { Isian, Modal, PesanGalat } from "./ui.jsx";
import { hariIniISO, tambahHariISO, tanggalPanjang } from "../utils.js";

const PILIHAN_LAMA = [7, 14, 21];
const MAKS_PINJAM = 3;

// Form peminjaman: pilih anggota, pilih buku, pilih lama pinjam.
export default function PinjamModal({ buku, anggota, bukuAwal = null, onSimpan, onTutup }) {
  const [anggotaId, setAnggotaId] = useState("");
  const [bukuId, setBukuId] = useState(bukuAwal ? String(bukuAwal) : "");
  const [lama, setLama] = useState(7);
  const [galat, setGalat] = useState(null);
  const [proses, setProses] = useState(false);

  const bisaDipinjam = buku.filter((b) => b.tersedia > 0);
  const jatuhTempo = tambahHariISO(hariIniISO(), lama);

  async function kirim(e) {
    e.preventDefault();
    setProses(true);
    setGalat(null);
    try {
      await onSimpan({ anggota_id: Number(anggotaId), buku_id: Number(bukuId), lama_hari: lama });
    } catch (err) {
      setGalat(err);
      setProses(false);
    }
  }

  return (
    <Modal judul="Pinjamkan buku" onTutup={onTutup}>
      <form onSubmit={kirim} className="form">
        <PesanGalat galat={galat} />

        <Isian label="Anggota">
          <select
            value={anggotaId}
            onChange={(e) => setAnggotaId(e.target.value)}
            required
            aria-invalid={galat?.field === "anggota_id"}
          >
            <option value="">Pilih anggota</option>
            {anggota.map((a) => {
              const penuh = a.pinjaman_aktif >= MAKS_PINJAM;
              return (
                <option key={a.id} value={a.id} disabled={penuh}>
                  {a.nama} ({a.nomor}){penuh ? ", sudah meminjam 3 buku" : ""}
                </option>
              );
            })}
          </select>
        </Isian>

        <Isian label="Buku" petunjuk={bisaDipinjam.length === 0 ? "Semua buku sedang dipinjam." : undefined}>
          <select
            value={bukuId}
            onChange={(e) => setBukuId(e.target.value)}
            required
            aria-invalid={galat?.field === "buku_id"}
          >
            <option value="">Pilih buku</option>
            {bisaDipinjam.map((b) => (
              <option key={b.id} value={b.id}>
                {b.judul}, {b.tersedia} tersedia
              </option>
            ))}
          </select>
        </Isian>

        <fieldset className="isian">
          <legend className="isian-label">Lama peminjaman</legend>
          <div className="segmen" role="radiogroup" aria-label="Lama peminjaman">
            {PILIHAN_LAMA.map((n) => (
              <label key={n} className={lama === n ? "aktif" : ""}>
                <input type="radio" name="lama" value={n} checked={lama === n} onChange={() => setLama(n)} />
                {n} hari
              </label>
            ))}
          </div>
          <span className="isian-petunjuk">Jatuh tempo {tanggalPanjang(jatuhTempo)}. Denda Rp1.000 per hari terlambat.</span>
        </fieldset>

        <div className="modal-aksi">
          <button type="button" className="btn" onClick={onTutup}>
            Batal
          </button>
          <button type="submit" className="btn btn-utama" disabled={proses || !anggotaId || !bukuId}>
            {proses ? "Memproses..." : "Pinjamkan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
