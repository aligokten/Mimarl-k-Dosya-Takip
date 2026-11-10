import { cardCls, secondaryBtnCls } from "../ui";
import { CoinsIcon } from "./icons";

// Arsapay (arsa payı / hisse dağıtım) aracı ayrı bir depoda yayınlanıyor ve
// buraya iframe ile gömülüyor. Bu nedenle yalnızca modal çerçevesi panelin
// tasarım diline uyarlanabiliyor; iframe içeriğinin teması o deponun kendi
// dosyasından geliyor. Çerçeve, içeriğin açık zeminiyle uyumlu kalsın diye
// iframe alanında nötr bir zemin kullanılıyor.
export const ARSAPAY_URL =
  "https://aligokten.github.io/sagg-muhasebe/arsapaylastir-test.html";

export default function ArsapayModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 backdrop-blur-md sm:p-6"
      onClick={onClose}
    >
      <div
        className={`${cardCls} flex h-full w-full max-w-5xl flex-col overflow-hidden p-0`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 px-5 py-3 dark:border-white/10">
          <h3 className="flex items-center gap-2 truncate text-sm font-bold text-slate-900 dark:text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-white">
              <CoinsIcon className="h-4 w-4" />
            </span>
            Arsapay
          </h3>
          <div className="flex items-center gap-2">
            <a
              href={ARSAPAY_URL}
              target="_blank"
              rel="noreferrer"
              className={secondaryBtnCls}
            >
              Yeni sekmede aç
            </a>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-500/10 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              title="Kapat"
            >
              ✕
            </button>
          </div>
        </div>
        <iframe
          src={ARSAPAY_URL}
          title="Arsapay"
          className="min-h-0 flex-1 bg-white"
        />
      </div>
    </div>
  );
}
