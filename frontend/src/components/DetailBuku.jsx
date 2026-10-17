import { Modal } from "./ui.jsx";
import { SampulBesar } from "./Buku.jsx";
import { tanggalLengkap } from "../utils.js";

// Jendela detail buku: sampul, keterangan, ketersediaan, dan siapa yang sedang meminjam.
export default function DetailBuku({ buku, peminjaman, onPinjam, onTutup }) {
  const sedangDipinjam = peminjaman.filter((p) => p.buku_id === buku.id && p.status !== "dikembalikan");

  return (
    <Modal judul={buku.judul} onTutup={onTutup} lebar={640}>
      <div className="detail">
        <SampulBesar buku={buku} />
        <div className="detail-isi">
          <p className="detail-penulis">{buku.penulis}</p>
          <dl className="detail-data">
            <div>
              <dt>Kode</dt>
              <dd>{buku.kode}</dd>
            </div>
            <div>
              <dt>Kategori</dt>
              <dd>{buku.kategori}</dd>
            </div>
            <div>
              <dt>Terbit</dt>
              <dd>{buku.tahun}</dd>
            </div>
            <div>
              <dt>Tersedia</dt>
              <dd>
                {buku.tersedia} dari {buku.jumlah} eksemplar
              </dd>
            </div>
          </dl>
          {buku.deskripsi && <p className="detail-deskripsi">{buku.deskripsi}</p>}

          {sedangDipinjam.length > 0 && (
            <div className="detail-pinjam">
              <p className="detail-subjudul">Sedang dipinjam</p>
              <ul>
                {sedangDipinjam.map((p) => (
                  <li key={p.id}>
                    {p.nama_anggota}
                    <span className={p.status === "terlambat" ? "teks-bahaya" : "teks-redup"}>
                      {p.status === "terlambat"
                        ? `terlambat ${p.hari_terlambat} hari`
                        : `kembali paling lambat ${tanggalLengkap(p.jatuh_tempo)}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="modal-aksi">
        <button type="button" className="btn" onClick={onTutup}>
          Tutup
        </button>
        <button type="button" className="btn btn-utama" disabled={buku.tersedia === 0} onClick={() => onPinjam(buku)}>
          {buku.tersedia === 0 ? "Semua eksemplar dipinjam" : "Pinjamkan"}
        </button>
      </div>
    </Modal>
  );
}
