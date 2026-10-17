import { warna } from "../utils.js";

// Sampul kecil berbentuk punggung buku, dipakai di daftar.
export function Sampul({ kategori }) {
  const w = warna(kategori);
  return <span className="sampul" style={{ "--bg": w.bg }} aria-hidden="true" />;
}

// Sampul besar dengan judul dan penulis, dipakai di jendela detail.
export function SampulBesar({ buku }) {
  const w = warna(buku.kategori);
  return (
    <div className="sampul-besar" style={{ "--bg": w.bg, "--fg": w.fg }} aria-hidden="true">
      <span className="sampul-besar-judul">{buku.judul}</span>
      <span className="sampul-besar-penulis">{buku.penulis}</span>
    </div>
  );
}

// Rak buku di Beranda. Setiap buku di koleksi menjadi satu punggung yang bisa diklik.
// Tinggi dan lebar dibuat bervariasi dari id buku, supaya tetap sama setiap kali halaman dibuka.
export function Rak({ buku, onPilih }) {
  return (
    <div className="rak">
      <div className="rak-gulir">
        <div className="rak-isi">
          {buku.map((b) => {
            const w = warna(b.kategori);
            const tinggi = 192 + ((b.id * 37) % 5) * 16;
            const lebar = 46 + ((b.id * 11) % 4) * 9;
            return (
              <button
                key={b.id}
                type="button"
                className={`punggung${b.tersedia === 0 ? " habis" : ""}`}
                style={{ "--bg": w.bg, "--fg": w.fg, height: tinggi, width: lebar }}
                onClick={() => onPilih(b)}
                title={b.tersedia === 0 ? `${b.judul}, semua eksemplar sedang dipinjam` : b.judul}
                aria-label={`${b.judul}, ${b.penulis}. ${b.tersedia} dari ${b.jumlah} tersedia`}
              >
                <span className="punggung-judul">{b.judul}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="rak-papan" />
    </div>
  );
}
