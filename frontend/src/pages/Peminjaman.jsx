import { useMemo, useState } from "react";
import { Cap } from "../components/Cap.jsx";
import { Sampul } from "../components/Buku.jsx";
import { Isian, Konfirmasi, Kosong, Modal, PesanGalat, useAman, useToast } from "../components/ui.jsx";
import { api } from "../api.js";
import { rupiah, tambahHariISO, tanggalLengkap } from "../utils.js";

const TAB = [
  ["semua", "Semua"],
  ["dipinjam", "Dipinjam"],
  ["terlambat", "Terlambat"],
  ["dikembalikan", "Sudah kembali"],
];

function FormPerpanjang({ pinjam, onSimpan, onTutup }) {
  const terendah = tambahHariISO(pinjam.tanggal_pinjam, 1);
  const tertinggi = tambahHariISO(pinjam.tanggal_pinjam, 60);
  const [tanggal, setTanggal] = useState(tambahHariISO(pinjam.jatuh_tempo, 7));
  const [galat, setGalat] = useState(null);
  const [proses, setProses] = useState(false);

  async function kirim(e) {
    e.preventDefault();
    setProses(true);
    setGalat(null);
    try {
      await onSimpan(tanggal);
    } catch (err) {
      setGalat(err);
      setProses(false);
    }
  }

  return (
    <Modal judul="Perpanjang peminjaman" onTutup={onTutup} lebar={460}>
      <form onSubmit={kirim} className="form">
        <PesanGalat galat={galat} />
        <p>
          <strong>{pinjam.judul}</strong>, dipinjam {pinjam.nama_anggota}. Jatuh tempo saat ini{" "}
          {tanggalLengkap(pinjam.jatuh_tempo)}.
        </p>
        <Isian label="Jatuh tempo baru" petunjuk="Total lama peminjaman maksimal 60 hari sejak tanggal pinjam.">
          <input type="date" value={tanggal} min={terendah} max={tertinggi} onChange={(e) => setTanggal(e.target.value)} required />
        </Isian>
        <div className="cepat">
          <button type="button" className="btn-teks" onClick={() => setTanggal(tambahHariISO(pinjam.jatuh_tempo, 7))}>
            Tambah 7 hari
          </button>
          <button type="button" className="btn-teks" onClick={() => setTanggal(tambahHariISO(pinjam.jatuh_tempo, 14))}>
            Tambah 14 hari
          </button>
        </div>
        <div className="modal-aksi">
          <button type="button" className="btn" onClick={onTutup}>
            Batal
          </button>
          <button type="submit" className="btn btn-utama" disabled={proses}>
            {proses ? "Menyimpan..." : "Simpan perpanjangan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Peminjaman({ peminjaman, muatUlang, onPinjam }) {
  const [tab, setTab] = useState("semua");
  const [cari, setCari] = useState("");
  const [kembali, setKembali] = useState(null);
  const [perpanjang, setPerpanjang] = useState(null);
  const [hapus, setHapus] = useState(null);
  const [baru, setBaru] = useState(null); // id peminjaman yang baru dikembalikan, untuk animasi cap
  const toast = useToast();
  const aman = useAman();

  const jumlah = useMemo(() => {
    const j = { semua: peminjaman.length, dipinjam: 0, terlambat: 0, dikembalikan: 0 };
    for (const p of peminjaman) j[p.status] += 1;
    return j;
  }, [peminjaman]);

  const tampil = useMemo(() => {
    const kata = cari.trim().toLowerCase();
    return peminjaman.filter(
      (p) =>
        (tab === "semua" || p.status === tab) &&
        (!kata || p.judul.toLowerCase().includes(kata) || p.nama_anggota.toLowerCase().includes(kata))
    );
  }, [peminjaman, tab, cari]);

  async function kembalikan() {
    const sasaran = kembali;
    await aman(async () => {
      const hasil = await api.kembalikan(sasaran.id);
      await muatUlang();
      setBaru(sasaran.id);
      setTimeout(() => setBaru(null), 1600);
      toast(hasil.denda > 0 ? `Buku dikembalikan. Denda ${rupiah(hasil.denda)}` : "Buku dikembalikan");
    });
    setKembali(null);
  }

  async function simpanPerpanjangan(tanggal) {
    await api.perpanjang(perpanjang.id, tanggal);
    await muatUlang();
    toast("Peminjaman diperpanjang");
    setPerpanjang(null);
  }

  async function hapusCatatan() {
    await aman(async () => {
      await api.hapusPinjam(hapus.id);
      await muatUlang();
      toast("Catatan dihapus");
    });
    setHapus(null);
  }

  return (
    <div className="wadah halaman">
      <header className="halaman-kepala">
        <div>
          <h1>Peminjaman</h1>
          <p className="teks-redup">
            {jumlah.dipinjam + jumlah.terlambat} buku sedang dipinjam. Denda Rp1.000 per hari terlambat.
          </p>
        </div>
        <button type="button" className="btn btn-utama" onClick={() => onPinjam()}>
          Pinjamkan buku
        </button>
      </header>

      <div className="alat alat-tab">
        <div className="tab" role="tablist" aria-label="Status peminjaman">
          {TAB.map(([kunci, label]) => (
            <button
              key={kunci}
              type="button"
              role="tab"
              aria-selected={tab === kunci}
              className={tab === kunci ? "aktif" : ""}
              onClick={() => setTab(kunci)}
            >
              {label} <span className="tab-jumlah">{jumlah[kunci]}</span>
            </button>
          ))}
        </div>
        <input
          type="search"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari judul atau nama anggota"
          aria-label="Cari peminjaman"
        />
      </div>

      {tampil.length === 0 ? (
        <Kosong
          judul={
            peminjaman.length === 0
              ? "Belum ada peminjaman."
              : tab === "terlambat"
                ? "Tidak ada buku yang terlambat."
                : "Tidak ada peminjaman yang cocok."
          }
        >
          {peminjaman.length === 0 && (
            <button type="button" className="btn-teks" onClick={() => onPinjam()}>
              Catat peminjaman pertama
            </button>
          )}
        </Kosong>
      ) : (
        <div className="daftar">
          {tampil.map((p) => (
            <div className="baris b-pinjam" key={p.id}>
              <Sampul kategori={p.kategori} />
              <div className="sel-utama">
                <p className="judul-baris">{p.judul}</p>
                <p className="teks-redup">
                  {p.nama_anggota}, {p.nomor_anggota}
                </p>
              </div>
              <div className="sel">
                <p>Dipinjam {tanggalLengkap(p.tanggal_pinjam)}</p>
                <p className="teks-redup">
                  {p.tanggal_kembali
                    ? `Kembali ${tanggalLengkap(p.tanggal_kembali)}`
                    : `Batas ${tanggalLengkap(p.jatuh_tempo)}`}
                </p>
              </div>
              <Cap pinjam={p} baru={baru === p.id} />
              <div className="aksi-baris">
                {p.status !== "dikembalikan" && (
                  <>
                    <button type="button" className="btn-teks" onClick={() => setKembali(p)}>
                      Kembalikan
                    </button>
                    <button type="button" className="btn-teks" onClick={() => setPerpanjang(p)}>
                      Perpanjang
                    </button>
                  </>
                )}
                <button type="button" className="btn-teks btn-teks-bahaya" onClick={() => setHapus(p)}>
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {kembali && (
        <Konfirmasi judul="Kembalikan buku" label="Kembalikan" onYa={kembalikan} onBatal={() => setKembali(null)}>
          <p>
            Terima kembali <strong>{kembali.judul}</strong> dari {kembali.nama_anggota}?
          </p>
          {kembali.denda > 0 ? (
            <p className="teks-bahaya">
              Terlambat {kembali.hari_terlambat} hari. Denda yang harus dibayar {rupiah(kembali.denda)}.
            </p>
          ) : (
            <p className="teks-redup">Dikembalikan tepat waktu, tanpa denda.</p>
          )}
        </Konfirmasi>
      )}

      {perpanjang && (
        <FormPerpanjang pinjam={perpanjang} onSimpan={simpanPerpanjangan} onTutup={() => setPerpanjang(null)} />
      )}

      {hapus && (
        <Konfirmasi judul="Hapus catatan" label="Hapus catatan" bahaya onYa={hapusCatatan} onBatal={() => setHapus(null)}>
          <p>
            Hapus catatan peminjaman <strong>{hapus.judul}</strong> oleh {hapus.nama_anggota}?
          </p>
          {hapus.status !== "dikembalikan" && (
            <p className="teks-bahaya">
              Buku ini belum dikembalikan. Jika catatannya dihapus, buku dianggap kembali ke rak tanpa denda.
            </p>
          )}
        </Konfirmasi>
      )}
    </div>
  );
}
