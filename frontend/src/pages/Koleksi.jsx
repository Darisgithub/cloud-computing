import { useMemo, useState } from "react";
import { Sampul } from "../components/Buku.jsx";
import { Isian, Konfirmasi, Kosong, Modal, PesanGalat, useAman, useToast } from "../components/ui.jsx";
import { api } from "../api.js";

const FORM_KOSONG = { judul: "", penulis: "", kategori: "", tahun: "", jumlah: 1, deskripsi: "" };

function FormBuku({ awal, kategori, onSimpan, onTutup }) {
  const [form, setForm] = useState(awal ? { ...awal } : { ...FORM_KOSONG, kategori: kategori[0] || "" });
  const [galat, setGalat] = useState(null);
  const [proses, setProses] = useState(false);
  const ubah = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const salah = (nama) => galat?.field === nama;

  async function kirim(e) {
    e.preventDefault();
    setProses(true);
    setGalat(null);
    try {
      await onSimpan({
        judul: form.judul,
        penulis: form.penulis,
        kategori: form.kategori,
        tahun: Number(form.tahun),
        jumlah: Number(form.jumlah),
        deskripsi: form.deskripsi,
      });
    } catch (err) {
      setGalat(err);
      setProses(false);
    }
  }

  return (
    <Modal judul={awal ? "Ubah data buku" : "Tambah buku"} onTutup={onTutup} lebar={560}>
      <form onSubmit={kirim} className="form">
        <PesanGalat galat={galat} />
        <Isian label="Judul">
          <input name="judul" value={form.judul} onChange={ubah} maxLength={150} required aria-invalid={salah("judul")} />
        </Isian>
        <Isian label="Penulis">
          <input name="penulis" value={form.penulis} onChange={ubah} maxLength={120} required aria-invalid={salah("penulis")} />
        </Isian>
        <div className="form-tiga">
          <Isian label="Kategori">
            <select name="kategori" value={form.kategori} onChange={ubah} aria-invalid={salah("kategori")}>
              {kategori.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </Isian>
          <Isian label="Tahun terbit">
            <input name="tahun" type="number" value={form.tahun} onChange={ubah} placeholder="2020" required aria-invalid={salah("tahun")} />
          </Isian>
          <Isian label="Jumlah eksemplar">
            <input name="jumlah" type="number" min="1" value={form.jumlah} onChange={ubah} required aria-invalid={salah("jumlah")} />
          </Isian>
        </div>
        <Isian label="Deskripsi singkat">
          <textarea name="deskripsi" rows="3" value={form.deskripsi} onChange={ubah} maxLength={600} aria-invalid={salah("deskripsi")} />
        </Isian>
        <div className="modal-aksi">
          <button type="button" className="btn" onClick={onTutup}>
            Batal
          </button>
          <button type="submit" className="btn btn-utama" disabled={proses}>
            {proses ? "Menyimpan..." : awal ? "Simpan perubahan" : "Tambah buku"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Koleksi({ buku, kategori, muatUlang, onDetail, onPinjam }) {
  const [cari, setCari] = useState("");
  const [filter, setFilter] = useState("");
  const [urut, setUrut] = useState("judul");
  const [form, setForm] = useState(null); // null | "baru" | objek buku
  const [hapus, setHapus] = useState(null);
  const toast = useToast();
  const aman = useAman();

  const tampil = useMemo(() => {
    const kata = cari.trim().toLowerCase();
    const hasil = buku.filter(
      (b) =>
        (!filter || b.kategori === filter) &&
        (!kata || b.judul.toLowerCase().includes(kata) || b.penulis.toLowerCase().includes(kata) || b.kode.toLowerCase().includes(kata))
    );
    if (urut === "terbaru") hasil.sort((a, b) => b.id - a.id);
    if (urut === "tersedia") hasil.sort((a, b) => b.tersedia - a.tersedia || a.judul.localeCompare(b.judul, "id"));
    return hasil;
  }, [buku, cari, filter, urut]);

  async function simpan(data) {
    if (form === "baru") {
      await api.tambahBuku(data);
      await muatUlang();
      toast("Buku ditambahkan");
    } else {
      await api.ubahBuku(form.id, data);
      await muatUlang();
      toast("Perubahan disimpan");
    }
    setForm(null);
  }

  async function hapusBuku() {
    await aman(async () => {
      await api.hapusBuku(hapus.id);
      await muatUlang();
      toast("Buku dihapus");
    });
    setHapus(null);
  }

  return (
    <div className="wadah halaman">
      <header className="halaman-kepala">
        <div>
          <h1>Koleksi buku</h1>
          <p className="teks-redup">
            {buku.length} judul. {buku.reduce((n, b) => n + b.tersedia, 0)} eksemplar tersedia.
          </p>
        </div>
        <button type="button" className="btn btn-utama" onClick={() => setForm("baru")}>
          Tambah buku
        </button>
      </header>

      <div className="alat">
        <input
          type="search"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari judul, penulis, atau kode"
          aria-label="Cari buku"
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter kategori">
          <option value="">Semua kategori</option>
          {kategori.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
        <select value={urut} onChange={(e) => setUrut(e.target.value)} aria-label="Urutkan">
          <option value="judul">Urutkan menurut judul</option>
          <option value="terbaru">Terbaru ditambahkan</option>
          <option value="tersedia">Paling banyak tersedia</option>
        </select>
      </div>

      {tampil.length === 0 ? (
        <Kosong judul={buku.length === 0 ? "Koleksi masih kosong." : "Tidak ada buku yang cocok dengan pencarian."}>
          {buku.length === 0 ? (
            <button type="button" className="btn-teks" onClick={() => setForm("baru")}>
              Tambah buku pertama
            </button>
          ) : (
            <button
              type="button"
              className="btn-teks"
              onClick={() => {
                setCari("");
                setFilter("");
              }}
            >
              Hapus pencarian
            </button>
          )}
        </Kosong>
      ) : (
        <div className="daftar">
          <div className="baris baris-kepala b-buku" aria-hidden="true">
            <span />
            <span>Judul</span>
            <span>Kategori</span>
            <span>Ketersediaan</span>
            <span />
          </div>
          {tampil.map((b) => (
            <div className="baris b-buku" key={b.id}>
              <Sampul kategori={b.kategori} />
              <div className="sel-utama">
                <button type="button" className="judul-tautan" onClick={() => onDetail(b)}>
                  {b.judul}
                </button>
                <p className="teks-redup">{b.penulis}</p>
              </div>
              <div className="sel">
                <p>{b.kategori}</p>
                <p className="teks-redup">
                  {b.kode}, terbit {b.tahun}
                </p>
              </div>
              <div className="sel">
                <p className={b.tersedia === 0 ? "teks-bahaya" : ""}>
                  {b.tersedia === 0 ? "Semua dipinjam" : `${b.tersedia} dari ${b.jumlah} tersedia`}
                </p>
                <div className="meter" aria-hidden="true">
                  <span style={{ width: `${(b.tersedia / b.jumlah) * 100}%` }} />
                </div>
              </div>
              <div className="aksi-baris">
                <button type="button" className="btn-teks" disabled={b.tersedia === 0} onClick={() => onPinjam(b)}>
                  Pinjamkan
                </button>
                <button type="button" className="btn-teks" onClick={() => setForm(b)}>
                  Ubah
                </button>
                <button type="button" className="btn-teks btn-teks-bahaya" onClick={() => setHapus(b)}>
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {form && (
        <FormBuku
          awal={form === "baru" ? null : form}
          kategori={kategori}
          onSimpan={simpan}
          onTutup={() => setForm(null)}
        />
      )}

      {hapus && (
        <Konfirmasi judul="Hapus buku" label="Hapus buku" bahaya onYa={hapusBuku} onBatal={() => setHapus(null)}>
          <p>
            Hapus <strong>{hapus.judul}</strong> dari koleksi? Riwayat peminjaman buku ini tetap tersimpan.
          </p>
          {hapus.dipinjam > 0 && (
            <p className="teks-bahaya">
              Buku ini masih dipinjam {hapus.dipinjam} eksemplar, jadi sistem akan menolak penghapusan sampai semuanya kembali.
            </p>
          )}
        </Konfirmasi>
      )}
    </div>
  );
}
