import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";
import { useToast } from "./components/ui.jsx";
import DetailBuku from "./components/DetailBuku.jsx";
import PinjamModal from "./components/PinjamModal.jsx";
import Beranda from "./pages/Beranda.jsx";
import Koleksi from "./pages/Koleksi.jsx";
import Anggota from "./pages/Anggota.jsx";
import Peminjaman from "./pages/Peminjaman.jsx";

const HALAMAN = [
  ["beranda", "Beranda"],
  ["koleksi", "Koleksi"],
  ["anggota", "Anggota"],
  ["peminjaman", "Peminjaman"],
];

const bacaHalaman = () => {
  const h = window.location.hash.replace(/^#\/?/, "");
  return HALAMAN.some(([k]) => k === h) ? h : "beranda";
};

export default function App() {
  const toast = useToast();
  const [halaman, setHalaman] = useState(bacaHalaman);
  const [data, setData] = useState({ buku: [], anggota: [], peminjaman: [], statistik: null, kategori: [] });
  const [memuat, setMemuat] = useState(true);
  const [galatServer, setGalatServer] = useState("");
  const [detail, setDetail] = useState(null); // id buku
  const [pinjam, setPinjam] = useState(null); // null | { bukuId }

  // Halaman mengikuti alamat (#/koleksi dll), jadi tombol back dan refresh tetap bekerja.
  useEffect(() => {
    const saatBerubah = () => setHalaman(bacaHalaman());
    window.addEventListener("hashchange", saatBerubah);
    return () => window.removeEventListener("hashchange", saatBerubah);
  }, []);

  const pindah = useCallback((tujuan) => {
    window.location.hash = `#/${tujuan}`;
    window.scrollTo({ top: 0 });
  }, []);

  // READ: ambil semua data dari backend. Dipanggil saat dibuka dan setelah setiap perubahan.
  const muat = useCallback(async () => {
    try {
      const [buku, anggota, peminjaman, statistik, kategori] = await Promise.all([
        api.buku(),
        api.anggota(),
        api.peminjaman(),
        api.statistik(),
        api.kategori(),
      ]);
      setData({ buku, anggota, peminjaman, statistik, kategori });
      setGalatServer("");
    } catch (err) {
      setGalatServer(err.message);
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    muat();
  }, [muat]);

  // CREATE peminjaman (dipanggil dari form Pinjamkan buku)
  async function simpanPinjam(isi) {
    const hasil = await api.pinjamkan(isi);
    await muat();
    toast(`Buku dipinjamkan ke ${hasil.nama_anggota}`);
    setPinjam(null);
    setDetail(null);
  }

  const bukuDetail = data.buku.find((b) => b.id === detail);
  const bukaPinjam = (buku) => setPinjam({ bukuId: buku?.id ?? null });

  return (
    <div className="situs">
      <header className="kepala">
        <div className="wadah kepala-dalam">
          <a className="merek" href="#/beranda" onClick={() => pindah("beranda")}>
            <svg className="merek-ikon" width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
              <rect width="32" height="32" rx="6" fill="#1F3B34" />
              <rect x="7" y="7" width="5" height="18" rx="1" fill="#C9972F" />
              <rect x="14" y="5" width="5" height="20" rx="1" fill="#7A2E2E" />
              <rect x="21" y="9" width="4" height="16" rx="1" fill="#F4F6F2" />
            </svg>
            Perpustakaan Aksara
          </a>
          <nav className="nav" aria-label="Menu utama">
            {HALAMAN.map(([kunci, label]) => (
              <button
                key={kunci}
                type="button"
                className={halaman === kunci ? "aktif" : ""}
                aria-current={halaman === kunci ? "page" : undefined}
                onClick={() => pindah(kunci)}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {galatServer && (
        <div className="wadah">
          <div className="peringatan" role="alert">
            <p>{galatServer}</p>
            <button type="button" className="btn" onClick={muat}>
              Coba lagi
            </button>
          </div>
        </div>
      )}

      <main>
        {halaman === "beranda" && (
          <Beranda
            statistik={data.statistik}
            buku={data.buku}
            peminjaman={data.peminjaman}
            memuat={memuat}
            onPilihBuku={(b) => setDetail(b.id)}
            onPinjam={bukaPinjam}
            pindah={pindah}
          />
        )}
        {halaman === "koleksi" && (
          <Koleksi
            buku={data.buku}
            kategori={data.kategori}
            muatUlang={muat}
            onDetail={(b) => setDetail(b.id)}
            onPinjam={bukaPinjam}
          />
        )}
        {halaman === "anggota" && <Anggota anggota={data.anggota} muatUlang={muat} />}
        {halaman === "peminjaman" && (
          <Peminjaman peminjaman={data.peminjaman} muatUlang={muat} onPinjam={bukaPinjam} />
        )}
      </main>

      <footer className="kaki">
        <div className="wadah">Perpustakaan Aksara</div>
      </footer>

      {bukuDetail && !pinjam && (
        <DetailBuku
          buku={bukuDetail}
          peminjaman={data.peminjaman}
          onPinjam={bukaPinjam}
          onTutup={() => setDetail(null)}
        />
      )}

      {pinjam && (
        <PinjamModal
          buku={data.buku}
          anggota={data.anggota}
          bukuAwal={pinjam.bukuId}
          onSimpan={simpanPinjam}
          onTutup={() => setPinjam(null)}
        />
      )}
    </div>
  );
}
