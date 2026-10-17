import { Rak } from "../components/Buku.jsx";
import { Cap } from "../components/Cap.jsx";
import { Kosong } from "../components/ui.jsx";

export default function Beranda({ statistik, buku, peminjaman, memuat, onPilihBuku, onPinjam, pindah }) {
  const berjalan = peminjaman
    .filter((p) => p.status !== "dikembalikan")
    .sort((a, b) => a.jatuh_tempo.localeCompare(b.jatuh_tempo))
    .slice(0, 5);

  return (
    <>
      <section className="hero">
        <div className="wadah hero-teks">
          <h1>Perpustakaan Aksara</h1>
          <p className="hero-ringkas">
            {statistik
              ? `${statistik.tersedia} dari ${statistik.eksemplar} eksemplar siap dipinjam. Saat ini ${statistik.dipinjam} sedang dipinjam dan ${statistik.terlambat} terlambat dikembalikan.`
              : memuat
                ? "Memuat koleksi..."
                : "Koleksi belum bisa ditampilkan."}
          </p>
          <div className="hero-aksi">
            <button type="button" className="btn btn-utama" onClick={() => onPinjam()}>
              Pinjamkan buku
            </button>
            <button type="button" className="btn" onClick={() => pindah("koleksi")}>
              Lihat seluruh koleksi
            </button>
          </div>
        </div>
        {buku.length > 0 && <Rak buku={buku} onPilih={onPilihBuku} />}
      </section>

      <div className="wadah beranda-dua">
        <section aria-labelledby="judul-tempo">
          <h2 id="judul-tempo" className="subjudul">
            Jatuh tempo terdekat
          </h2>
          {berjalan.length === 0 ? (
            <Kosong judul="Tidak ada buku yang sedang dipinjam.">
              <button type="button" className="btn-teks" onClick={() => onPinjam()}>
                Catat peminjaman pertama
              </button>
            </Kosong>
          ) : (
            <ul className="daftar-ringkas">
              {berjalan.map((p) => (
                <li key={p.id}>
                  <div>
                    <p className="ringkas-judul">{p.judul}</p>
                    <p className="teks-redup">{p.nama_anggota}</p>
                  </div>
                  <Cap pinjam={p} />
                </li>
              ))}
            </ul>
          )}
          {berjalan.length > 0 && (
            <button type="button" className="btn-teks" onClick={() => pindah("peminjaman")}>
              Lihat semua peminjaman
            </button>
          )}
        </section>

        <section aria-labelledby="judul-populer">
          <h2 id="judul-populer" className="subjudul">
            Paling sering dipinjam
          </h2>
          {!statistik || statistik.populer.length === 0 ? (
            <Kosong judul="Belum ada riwayat peminjaman." />
          ) : (
            <ol className="daftar-ringkas daftar-populer">
              {statistik.populer.map((b) => (
                <li key={b.buku_id}>
                  <p className="ringkas-judul">{b.judul}</p>
                  <p className="teks-redup">{b.jumlah}x dipinjam</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}
