import { useMemo, useState } from "react";
import { Isian, Konfirmasi, Kosong, Modal, PesanGalat, useAman, useToast } from "../components/ui.jsx";
import { api } from "../api.js";
import { inisial, tanggalLengkap, warnaDariNama } from "../utils.js";

function FormAnggota({ awal, onSimpan, onTutup }) {
  const [form, setForm] = useState(awal ? { nama: awal.nama, email: awal.email, telepon: awal.telepon } : { nama: "", email: "", telepon: "" });
  const [galat, setGalat] = useState(null);
  const [proses, setProses] = useState(false);
  const ubah = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const salah = (nama) => galat?.field === nama;

  async function kirim(e) {
    e.preventDefault();
    setProses(true);
    setGalat(null);
    try {
      await onSimpan(form);
    } catch (err) {
      setGalat(err);
      setProses(false);
    }
  }

  return (
    <Modal judul={awal ? "Ubah data anggota" : "Tambah anggota"} onTutup={onTutup}>
      <form onSubmit={kirim} className="form">
        <PesanGalat galat={galat} />
        <Isian label="Nama lengkap">
          <input name="nama" value={form.nama} onChange={ubah} maxLength={80} required aria-invalid={salah("nama")} />
        </Isian>
        <Isian label="Email" petunjuk="Boleh dikosongkan.">
          <input name="email" type="email" value={form.email} onChange={ubah} placeholder="nama@contoh.id" aria-invalid={salah("email")} />
        </Isian>
        <Isian label="Nomor telepon" petunjuk="Boleh dikosongkan.">
          <input name="telepon" type="tel" value={form.telepon} onChange={ubah} placeholder="0812 3456 7890" aria-invalid={salah("telepon")} />
        </Isian>
        <div className="modal-aksi">
          <button type="button" className="btn" onClick={onTutup}>
            Batal
          </button>
          <button type="submit" className="btn btn-utama" disabled={proses}>
            {proses ? "Menyimpan..." : awal ? "Simpan perubahan" : "Tambah anggota"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Anggota({ anggota, muatUlang }) {
  const [cari, setCari] = useState("");
  const [form, setForm] = useState(null);
  const [hapus, setHapus] = useState(null);
  const toast = useToast();
  const aman = useAman();

  const tampil = useMemo(() => {
    const kata = cari.trim().toLowerCase();
    return anggota.filter(
      (a) =>
        !kata ||
        a.nama.toLowerCase().includes(kata) ||
        a.nomor.toLowerCase().includes(kata) ||
        a.email.toLowerCase().includes(kata)
    );
  }, [anggota, cari]);

  async function simpan(data) {
    if (form === "baru") {
      await api.tambahAnggota(data);
      await muatUlang();
      toast("Anggota ditambahkan");
    } else {
      await api.ubahAnggota(form.id, data);
      await muatUlang();
      toast("Perubahan disimpan");
    }
    setForm(null);
  }

  async function hapusAnggota() {
    await aman(async () => {
      await api.hapusAnggota(hapus.id);
      await muatUlang();
      toast("Anggota dihapus");
    });
    setHapus(null);
  }

  return (
    <div className="wadah halaman">
      <header className="halaman-kepala">
        <div>
          <h1>Anggota</h1>
          <p className="teks-redup">{anggota.length} anggota terdaftar.</p>
        </div>
        <button type="button" className="btn btn-utama" onClick={() => setForm("baru")}>
          Tambah anggota
        </button>
      </header>

      <div className="alat alat-satu">
        <input
          type="search"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari nama, nomor anggota, atau email"
          aria-label="Cari anggota"
        />
      </div>

      {tampil.length === 0 ? (
        <Kosong judul={anggota.length === 0 ? "Belum ada anggota terdaftar." : "Tidak ada anggota yang cocok dengan pencarian."}>
          {anggota.length === 0 && (
            <button type="button" className="btn-teks" onClick={() => setForm("baru")}>
              Tambah anggota pertama
            </button>
          )}
        </Kosong>
      ) : (
        <div className="daftar">
          <div className="baris baris-kepala b-anggota" aria-hidden="true">
            <span />
            <span>Nama</span>
            <span>Kontak</span>
            <span>Peminjaman</span>
            <span />
          </div>
          {tampil.map((a) => {
            const w = warnaDariNama(a.nama);
            return (
              <div className="baris b-anggota" key={a.id}>
                <span className="avatar" style={{ "--bg": w.bg, "--fg": w.fg }} aria-hidden="true">
                  {inisial(a.nama)}
                </span>
                <div className="sel-utama">
                  <p className="judul-baris">{a.nama}</p>
                  <p className="teks-redup">
                    {a.nomor}, bergabung {tanggalLengkap(a.bergabung)}
                  </p>
                </div>
                <div className="sel">
                  <p>{a.email || <span className="teks-redup">Email belum diisi</span>}</p>
                  <p className="teks-redup">{a.telepon || "Telepon belum diisi"}</p>
                </div>
                <div className="sel">
                  {a.pinjaman_aktif === 0 ? (
                    <p className="teks-redup">Tidak sedang meminjam</p>
                  ) : (
                    <>
                      <p>Meminjam {a.pinjaman_aktif} buku</p>
                      {a.terlambat > 0 && <p className="teks-bahaya">{a.terlambat} terlambat</p>}
                    </>
                  )}
                </div>
                <div className="aksi-baris">
                  <button type="button" className="btn-teks" onClick={() => setForm(a)}>
                    Ubah
                  </button>
                  <button type="button" className="btn-teks btn-teks-bahaya" onClick={() => setHapus(a)}>
                    Hapus
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {form && <FormAnggota awal={form === "baru" ? null : form} onSimpan={simpan} onTutup={() => setForm(null)} />}

      {hapus && (
        <Konfirmasi judul="Hapus anggota" label="Hapus anggota" bahaya onYa={hapusAnggota} onBatal={() => setHapus(null)}>
          <p>
            Hapus <strong>{hapus.nama}</strong> ({hapus.nomor}) dari daftar anggota? Riwayat peminjamannya tetap tersimpan.
          </p>
          {hapus.pinjaman_aktif > 0 && (
            <p className="teks-bahaya">
              Anggota ini masih meminjam {hapus.pinjaman_aktif} buku, jadi sistem akan menolak penghapusan sampai semuanya kembali.
            </p>
          )}
        </Konfirmasi>
      )}
    </div>
  );
}
