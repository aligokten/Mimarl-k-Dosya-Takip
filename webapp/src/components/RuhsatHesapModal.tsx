import { useEffect, useRef, useState } from "react";
import { useTheme } from "../theme";
import { cardCls, secondaryBtnCls } from "../ui";
import { CalculatorIcon } from "./icons";

// Ruhsat Hesap Paneli: parsel/TAKS-KAKS, emsal, bağımsız bölüm, kat
// irtifakı, yapı inşaat alanı, sığınak, otopark vb. hesaplarını içeren
// çevrimdışı çalışabilen tek dosyalık araç. Uygulamayla birlikte statik
// varlık olarak yayınlanır (webapp/public/ruhsat-hesap/index.html).
export const RUHSAT_HESAP_URL = `${import.meta.env.BASE_URL}ruhsat-hesap/index.html`;

// Ruhsat Hesap Paneli'ni uygulama içinde açan modal. Panelin cam yüzeyli
// tasarım diliyle (glass kart + marka turuncusu) aynı çerçeveyi kullanır;
// iframe'e panelin açık/koyu teması da aktarılır.
export default function RuhsatHesapModal({ onClose }: { onClose: () => void }) {
  const theme = useTheme();
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  // Adres yalnızca ilk açılışta hesaplanır: tema değişince src değişip
  // iframe yeniden yüklenseydi girilen hesap verileri sıfırlanırdı.
  const [src] = useState(() => `${RUHSAT_HESAP_URL}?theme=${theme}`);

  // Tema, ilk yüklemede adres parametresiyle; sonraki değişimlerde sayfa
  // yeniden yüklenmesin diye postMessage ile iletilir (hesap verileri durur).
  useEffect(() => {
    frameRef.current?.contentWindow?.postMessage(
      { tur: "ruhsat360-tema", tema: theme },
      window.location.origin
    );
  }, [theme]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 backdrop-blur-md sm:p-6"
      onClick={onClose}
    >
      <div
        className={`${cardCls} flex h-full w-full max-w-6xl flex-col overflow-hidden p-0`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 px-5 py-3 dark:border-white/10">
          <h3 className="flex items-center gap-2 truncate text-sm font-bold text-slate-900 dark:text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-white">
              <CalculatorIcon className="h-4 w-4" />
            </span>
            Ruhsat Hesap Paneli
          </h3>
          <div className="flex items-center gap-2">
            <a
              href={RUHSAT_HESAP_URL}
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
          ref={frameRef}
          src={src}
          title="Ruhsat Hesap Paneli"
          className="min-h-0 flex-1 bg-transparent"
        />
      </div>
    </div>
  );
}
