import { CalculatorIcon } from "./icons";

// Ruhsat Hesap Paneli: parsel/TAKS-KAKS, emsal, bağımsız bölüm, kat
// irtifakı, yapı inşaat alanı, sığınak, otopark vb. hesaplarını içeren
// çevrimdışı çalışabilen tek dosyalık araç. Uygulamayla birlikte statik
// varlık olarak yayınlanır (webapp/public/ruhsat-hesap/index.html).
export const RUHSAT_HESAP_URL = `${import.meta.env.BASE_URL}ruhsat-hesap/index.html`;

// Ruhsat Hesap Paneli'ni uygulama içinde açan modal (Arsapay ile aynı
// desen). Arka plan blurlanır; iframe gömme engellenirse "yeni sekmede aç"
// seçeneği sunulur.
export default function RuhsatHesapModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 backdrop-blur-md sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 dark:border-zinc-700">
          <h3 className="flex items-center gap-2 truncate text-sm font-bold text-slate-900 dark:text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-white">
              <CalculatorIcon className="h-4 w-4" />
            </span>
            Ruhsat Hesap Paneli
          </h3>
          <div className="flex items-center gap-2">
            <a
              href={RUHSAT_HESAP_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-zinc-800 dark:text-slate-200 dark:ring-slate-600 dark:hover:bg-zinc-700"
            >
              Yeni sekmede aç
            </a>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-zinc-800"
              title="Kapat"
            >
              ✕
            </button>
          </div>
        </div>
        <iframe
          src={RUHSAT_HESAP_URL}
          title="Ruhsat Hesap Paneli"
          className="min-h-0 flex-1 bg-slate-100 dark:bg-zinc-800"
        />
      </div>
    </div>
  );
}
