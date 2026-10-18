// Data awal. Dipakai saat database Supabase belum diinisialisasi atau dalam pengujian.
// Tanggal peminjaman dibuat relatif terhadap hari ini supaya contoh
// "sedang dipinjam", "terlambat", dan "sudah kembali" selalu ada.

import { hariIni, tambahHari } from "./util.js";

export function seed() {
  const tgl = (offset) => tambahHari(hariIni(), offset);

  const buku = [
    ["Laskar Pelangi", "Andrea Hirata", "Fiksi", 2005, 4, "Sepuluh anak di sebuah sekolah miskin di Belitung berjuang agar sekolah mereka tidak ditutup."],
    ["Bumi Manusia", "Pramoedya Ananta Toer", "Fiksi", 1980, 3, "Minke, pribumi terpelajar di masa kolonial, berhadapan dengan hukum dan prasangka zamannya."],
    ["Negeri 5 Menara", "Ahmad Fuadi", "Fiksi", 2009, 3, "Enam santri di pondok pesantren di Jawa Timur belajar tentang mimpi dan persahabatan."],
    ["Laut Bercerita", "Leila S. Chudori", "Fiksi", 2017, 2, "Kisah aktivis mahasiswa yang hilang menjelang runtuhnya Orde Baru, dan keluarga yang menunggu."],
    ["Cantik Itu Luka", "Eka Kurniawan", "Fiksi", 2002, 2, "Saga keluarga di sebuah kota pesisir yang dibangun dari sejarah, mitos, dan kekerasan."],
    ["Dilan 1990", "Pidi Baiq", "Fiksi", 2014, 3, "Milea bertemu Dilan di Bandung pada 1990 dan kisah mereka dimulai dari situ."],
    ["Pulang", "Tere Liye", "Fiksi", 2015, 3, "Bujang, anak dari pedalaman Sumatra, tumbuh dalam dunia gelap keluarga Tauke."],
    ["Filosofi Teras", "Henry Manampiring", "Pengembangan Diri", 2018, 3, "Pengantar filsafat Stoa untuk menghadapi kecemasan dan hal-hal di luar kendali."],
    ["Atomic Habits", "James Clear", "Pengembangan Diri", 2018, 4, "Cara membangun kebiasaan baik lewat perubahan kecil yang dilakukan terus-menerus."],
    ["Sapiens", "Yuval Noah Harari", "Sejarah", 2011, 2, "Sejarah singkat umat manusia, dari Homo sapiens awal hingga masyarakat modern."],
    ["Sejarah Indonesia Modern 1200–2008", "M.C. Ricklefs", "Sejarah", 2008, 2, "Rangkuman panjang perkembangan Indonesia sejak masuknya Islam hingga era reformasi."],
    ["Clean Code", "Robert C. Martin", "Sains & Teknologi", 2008, 2, "Prinsip dan praktik menulis kode yang mudah dibaca dan dirawat."],
    ["Introduction to Algorithms", "Thomas H. Cormen dkk.", "Sains & Teknologi", 1990, 2, "Buku acuan algoritma dan struktur data yang dipakai di banyak perguruan tinggi."],
    ["Kosmos", "Carl Sagan", "Sains & Teknologi", 1980, 1, "Perjalanan lewat sejarah ilmu astronomi dan tempat manusia di alam semesta."],
    ["Totto-chan: Gadis Cilik di Jendela", "Tetsuko Kuroyanagi", "Anak & Remaja", 1981, 3, "Kenangan penulis tentang sekolah yang tidak biasa di Tokyo pada masa kecilnya."],
    ["Pangeran Kecil", "Antoine de Saint-Exupéry", "Anak & Remaja", 1943, 2, "Seorang pilot bertemu pangeran kecil dari planet lain di tengah gurun."],
    ["Kamus Besar Bahasa Indonesia", "Badan Pengembangan dan Pembinaan Bahasa", "Referensi", 2016, 1, "Kamus resmi bahasa Indonesia edisi kelima."],
  ].map(([judul, penulis, kategori, tahun, jumlah, deskripsi], i) => ({
    id: i + 1,
    kode: `BK-${String(i + 1).padStart(3, "0")}`,
    judul,
    penulis,
    kategori,
    tahun,
    jumlah,
    deskripsi,
    dibuat: tgl(-60 + i),
  }));

  const anggota = [
    ["Aisyah Putri Rahmawati", "aisyah.putri@contoh.id", "081234560001"],
    ["Budi Santoso", "budi.santoso@contoh.id", "081234560002"],
    ["Citra Lestari", "citra.lestari@contoh.id", "081234560003"],
    ["Dimas Pratama", "dimas.pratama@contoh.id", "081234560004"],
    ["Eka Wulandari", "eka.wulandari@contoh.id", "081234560005"],
    ["Fajar Nugroho", "fajar.nugroho@contoh.id", "081234560006"],
    ["Gita Maharani", "gita.maharani@contoh.id", "081234560007"],
    ["Hendra Wijaya", "hendra.wijaya@contoh.id", ""],
  ].map(([nama, email, telepon], i) => ({
    id: i + 1,
    nomor: `AK-${String(i + 1).padStart(4, "0")}`,
    nama,
    email,
    telepon,
    bergabung: tgl(-90 + i * 3),
  }));

  // [buku_id, anggota_id, hari_pinjam, hari_jatuh_tempo, hari_kembali|null, denda]
  const pinjam = [
    [1, 1, -3, 4, null, 0],
    [9, 2, -20, -13, null, 0],
    [2, 3, -5, 2, null, 0],
    [12, 4, -10, -3, null, 0],
    [13, 4, -2, 12, null, 0],
    [8, 5, -30, -23, -21, 2000],
    [3, 6, -15, -8, -9, 0],
    [14, 7, -1, 6, null, 0],
    [6, 2, -4, 3, null, 0],
  ].map(([b, a, p, t, k, denda], i) => {
    const bk = buku.find((x) => x.id === b);
    const ag = anggota.find((x) => x.id === a);
    return {
      id: i + 1,
      buku_id: b,
      anggota_id: a,
      judul: bk.judul,
      kategori: bk.kategori,
      nama_anggota: ag.nama,
      nomor_anggota: ag.nomor,
      tanggal_pinjam: tgl(p),
      jatuh_tempo: tgl(t),
      tanggal_kembali: k === null ? null : tgl(k),
      denda,
    };
  });

  return {
    counters: { buku: buku.length, anggota: anggota.length, peminjaman: pinjam.length },
    buku,
    anggota,
    peminjaman: pinjam,
  };
}
