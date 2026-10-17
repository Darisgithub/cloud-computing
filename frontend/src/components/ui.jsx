import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------- Notifikasi
const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [daftar, setDaftar] = useState([]);

  const tampil = useCallback((pesan, jenis = "ok") => {
    const id = Math.random().toString(36).slice(2);
    setDaftar((p) => [...p, { id, pesan, jenis }].slice(-3)); // paling banyak 3 notifikasi sekaligus
    setTimeout(() => setDaftar((p) => p.filter((t) => t.id !== id)), jenis === "galat" ? 6000 : 3500);
  }, []);

  return (
    <ToastContext.Provider value={tampil}>
      {children}
      <div className="toast-area" role="status" aria-live="polite">
        {daftar.map((t) => (
          <div key={t.id} className={`toast toast-${t.jenis}`}>
            {t.pesan}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Jalankan aksi yang tidak punya form (hapus, kembalikan, dll). Kalau gagal, tampilkan pesannya.
export function useAman() {
  const toast = useToast();
  return useCallback(
    async (fn) => {
      try {
        return await fn();
      } catch (err) {
        toast(err.message, "galat");
        return undefined;
      }
    },
    [toast]
  );
}

// --------------------------------------------------------------------- Modal
export function Modal({ judul, onTutup, children, lebar = 520 }) {
  const ref = useRef(null);
  const tutupRef = useRef(onTutup);
  tutupRef.current = onTutup;

  useEffect(() => {
    const sebelumnya = document.activeElement;
    const saatTekan = (e) => {
      if (e.key === "Escape") tutupRef.current();
      if (e.key !== "Tab" || !ref.current) return;
      // Jaga fokus tetap di dalam dialog.
      const bisaFokus = ref.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href]'
      );
      if (!bisaFokus.length) return;
      const awal = bisaFokus[0];
      const akhir = bisaFokus[bisaFokus.length - 1];
      if (e.shiftKey && document.activeElement === awal) {
        e.preventDefault();
        akhir.focus();
      } else if (!e.shiftKey && document.activeElement === akhir) {
        e.preventDefault();
        awal.focus();
      }
    };
    document.addEventListener("keydown", saatTekan);
    document.body.style.overflow = "hidden";
    const target =
      ref.current?.querySelector(".modal-isi input, .modal-isi select, .modal-isi textarea") ||
      ref.current?.querySelector(".modal-isi button");
    target?.focus();
    return () => {
      document.removeEventListener("keydown", saatTekan);
      document.body.style.overflow = "";
      sebelumnya?.focus?.();
    };
  }, []);

  return (
    <div className="modal-latar" onMouseDown={(e) => e.target === e.currentTarget && onTutup()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={judul} style={{ maxWidth: lebar }} ref={ref}>
        <header className="modal-kepala">
          <h2>{judul}</h2>
          <button type="button" className="btn-ikon" onClick={onTutup} aria-label="Tutup">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <div className="modal-isi">{children}</div>
      </div>
    </div>
  );
}

// Dialog konfirmasi untuk aksi penting (menghapus, mengembalikan).
export function Konfirmasi({ judul, children, label, bahaya = false, onYa, onBatal }) {
  const [proses, setProses] = useState(false);
  async function ya() {
    setProses(true);
    try {
      await onYa();
    } finally {
      setProses(false);
    }
  }
  return (
    <Modal judul={judul} onTutup={onBatal} lebar={460}>
      <div className="konfirmasi-teks">{children}</div>
      <div className="modal-aksi">
        <button type="button" className="btn" onClick={onBatal}>
          Batal
        </button>
        <button type="button" className={`btn ${bahaya ? "btn-bahaya" : "btn-utama"}`} onClick={ya} disabled={proses}>
          {proses ? "Memproses..." : label}
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------- Form
export function Isian({ label, petunjuk, children }) {
  return (
    <label className="isian">
      <span className="isian-label">{label}</span>
      {children}
      {petunjuk && <span className="isian-petunjuk">{petunjuk}</span>}
    </label>
  );
}

export function PesanGalat({ galat }) {
  if (!galat) return null;
  return (
    <p className="galat" role="alert">
      {galat.message}
    </p>
  );
}

export function Kosong({ judul, children }) {
  return (
    <div className="kosong">
      <p className="kosong-judul">{judul}</p>
      {children && <div className="kosong-isi">{children}</div>}
    </div>
  );
}
