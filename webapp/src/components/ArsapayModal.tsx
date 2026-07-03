import { CoinsIcon } from "./icons";

// Arsapaylaştırma uygulaması (harici, GitHub Pages'te barındırılıyor).
export const ARSAPAY_URL =
  "https://aligokten.github.io/sagg-muhasebe/arsapaylastir-test.html";

// Arsapay uygulamasını uygulama içinde açan modal. Arka plan blurlanır;
// site iframe gömülmesini engellerse "yeni sekmede aç" seçeneği sunulur.
export default function ArsapayModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 backdrop-blur-md sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 dark:border-zinc-700">
          <h3 className="flex items-center gap-2 truncate text-sm font-bold text-slate-900 dark:text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-white">
              <CoinsIcon className="h-4 w-4" />
            </span>
            Arsapay
          </h3>
          <div className="flex items-center gap-2">
            <a
              href={ARSAPAY_URL}
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
          src={ARSAPAY_URL}
          title="Arsapay"
          className="min-h-0 flex-1 bg-slate-100 dark:bg-zinc-800"
        />
      </div>
    </div>
  );
}
