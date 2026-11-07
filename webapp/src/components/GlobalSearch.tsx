import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { useApp } from "../data";
import { ara, TUR_ETIKETLERI, type AramaSonucu, type SonucTuru } from "../search";
import {
  BuildingIcon,
  FileIcon,
  FolderIcon,
  SearchIcon,
  UsersIcon,
} from "./icons";

const TUR_IKONLARI: Record<SonucTuru, React.ReactNode> = {
  proje: <FolderIcon className="h-4 w-4" />,
  kisi: <UsersIcon className="h-4 w-4" />,
  uzman: <BuildingIcon className="h-4 w-4" />,
  sablon: <FileIcon className="h-4 w-4" />,
};

function kisayolEtiketi(): string {
  const mac =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  return mac ? "⌘ K" : "Ctrl K";
}

// Panel geneli arama. Üst barda bir tetikleyici olarak durur; tıklayınca ya
// da Ctrl/⌘+K ile komut paleti açılır. Proje, kişi, uzman ve şablonlarda
// arar (bkz. search.ts).
export default function GlobalSearch() {
  const db = useApp();
  const navigate = useNavigate();
  const [acik, setAcik] = useState(false);
  const [sorgu, setSorgu] = useState("");
  const [secili, setSecili] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const sonuclar = useMemo(() => ara(db, sorgu), [db, sorgu]);

  // Ctrl/⌘+K her yerden paleti açar; "/" de yazı alanında değilken açar.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const hedef = e.target as HTMLElement | null;
      const yaziAlani =
        !!hedef &&
        (hedef.tagName === "INPUT" ||
          hedef.tagName === "TEXTAREA" ||
          hedef.isContentEditable);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAcik(true);
      } else if (e.key === "/" && !yaziAlani) {
        e.preventDefault();
        setAcik(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (acik) {
      setSorgu("");
      setSecili(0);
      // Modal basıldıktan sonra odaklan.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [acik]);

  useEffect(() => setSecili(0), [sorgu]);

  function git(sonuc: AramaSonucu) {
    setAcik(false);
    navigate(sonuc.to);
  }

  function paletKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setAcik(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSecili((i) => (sonuclar.length ? (i + 1) % sonuclar.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSecili((i) =>
        sonuclar.length ? (i - 1 + sonuclar.length) % sonuclar.length : 0
      );
    } else if (e.key === "Enter" && sonuclar[secili]) {
      e.preventDefault();
      git(sonuclar[secili]);
    }
  }

  // Sonuçları türüne göre grupla, sıralamayı koru.
  const gruplar = useMemo(() => {
    const harita = new Map<SonucTuru, AramaSonucu[]>();
    for (const s of sonuclar) {
      const liste = harita.get(s.tur) ?? [];
      liste.push(s);
      harita.set(s.tur, liste);
    }
    return [...harita.entries()];
  }, [sonuclar]);

  return (
    <>
      {/* Üst bardaki tetikleyici */}
      <button
        type="button"
        onClick={() => setAcik(true)}
        title="Ara (Ctrl+K)"
        className="flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/60 px-3 py-1.5 text-slate-500 backdrop-blur-md transition hover:border-brand-300 hover:text-brand-600 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-400 dark:hover:border-brand-500/40 dark:hover:text-brand-300 md:w-[min(26rem,100%)] md:justify-start"
      >
        <SearchIcon className="h-4 w-4 shrink-0" />
        <span className="hidden flex-1 text-left text-xs md:block">
          Proje, kişi, uzman veya şablon ara...
        </span>
        <span className="hidden shrink-0 rounded-md border border-slate-200/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 dark:border-white/10 dark:text-slate-500 md:block">
          {kisayolEtiketi()}
        </span>
      </button>

      {acik && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 p-3 backdrop-blur-md sm:p-6"
          onClick={() => setAcik(false)}
        >
          <div
            className="glass mt-[8vh] w-full max-w-xl overflow-hidden rounded-2xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={paletKey}
          >
            <div className="flex items-center gap-2.5 border-b border-slate-200/70 px-4 py-3 dark:border-white/10">
              <SearchIcon className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                ref={inputRef}
                value={sorgu}
                onChange={(e) => setSorgu(e.target.value)}
                placeholder="Proje, kişi, uzman veya şablon ara..."
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setAcik(false)}
                className="shrink-0 rounded-md border border-slate-200/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 transition hover:text-slate-600 dark:border-white/10 dark:text-slate-500 dark:hover:text-slate-300"
              >
                ESC
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-2">
              {sorgu.trim() === "" ? (
                <p className="px-3 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                  Proje adı, ada/parsel, kişi adı, telefon ya da şablon adı
                  yazın. Türkçe karakter yazmanız gerekmez — &quot;cesme&quot;
                  de &quot;Çeşme&quot;yi bulur.
                </p>
              ) : sonuclar.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                  &quot;{sorgu}&quot; için sonuç bulunamadı.
                </p>
              ) : (
                gruplar.map(([tur, liste]) => (
                  <div key={tur} className="mb-1.5 last:mb-0">
                    <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {TUR_ETIKETLERI[tur]}
                    </p>
                    {liste.map((s) => {
                      const i = sonuclar.indexOf(s);
                      return (
                        <button
                          key={`${s.tur}-${s.id}`}
                          type="button"
                          onMouseEnter={() => setSecili(i)}
                          onClick={() => git(s)}
                          className={clsx(
                            "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition",
                            i === secili
                              ? "bg-brand-500/15"
                              : "hover:bg-slate-500/5"
                          )}
                        >
                          <span
                            className={clsx(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                              i === secili
                                ? "bg-brand-500 text-white"
                                : "bg-slate-500/10 text-slate-500 dark:text-slate-400"
                            )}
                          >
                            {TUR_IKONLARI[s.tur]}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
                              {s.baslik}
                            </span>
                            {s.altBaslik && (
                              <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
                                {s.altBaslik}
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center gap-3 border-t border-slate-200/70 px-4 py-2 text-[10px] text-slate-400 dark:border-white/10 dark:text-slate-500">
              <span>↑ ↓ gezin</span>
              <span>↵ aç</span>
              <span>esc kapat</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
