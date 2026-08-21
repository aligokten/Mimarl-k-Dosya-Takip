import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { addDocTemplate, useApp } from "../data";
import { cardCls, primaryBtnCls, secondaryBtnCls } from "../ui";
import { PrinterIcon, TrashIcon } from "../components/icons";
import { buildProjectTokens, buildVekilTokens } from "../templateTokens";
import {
  applyDilekceLayout,
  applyTokens,
  collectTokens,
  EK_ONERILERI,
  readEkler,
  writeEkler,
} from "../dilekce";

const DRAFT_KEY_PREFIX = "mimarlik-doc-draft-";

export default function TemplateEditor() {
  const { id } = useParams<{ id: string }>();
  const db = useApp();
  const sheetRef = useRef<HTMLDivElement>(null);
  const refreshTimer = useRef<number | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Seçimler durumda tutulur; alanlar her değişiklikte yeniden uygulanır,
  // böylece seçim sırası önemli değildir.
  const [projectId, setProjectId] = useState("");
  const [vekilUid, setVekilUid] = useState("");
  const [dateOn, setDateOn] = useState(false);

  const [docTokens, setDocTokens] = useState<string[]>([]);
  const [ekler, setEkler] = useState<string[]>([]);
  const [yeniEk, setYeniEk] = useState("");
  const [layoutInfo, setLayoutInfo] = useState<string | null>(null);

  const template = db.docTemplates.find((t) => t.id === id);
  const draftKey = `${DRAFT_KEY_PREFIX}${id}`;

  useEffect(() => {
    if (!sheetRef.current || !template) return;
    const draft = localStorage.getItem(draftKey);
    sheetRef.current.innerHTML = draft ?? template.body;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Seçimler değişince alanları yeniden uygula.
  useEffect(() => {
    if (!sheetRef.current) return;
    if (!projectId && !vekilUid && !dateOn) return;
    applyTokens(sheetRef.current, buildTokens());
    saveDraft();
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, vekilUid, dateOn]);

  if (!template) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Şablon bulunamadı.
      </p>
    );
  }

  function refresh() {
    if (!sheetRef.current) return;
    setDocTokens(collectTokens(sheetRef.current));
    setEkler(readEkler(sheetRef.current));
  }

  function scheduleRefresh() {
    if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    refreshTimer.current = window.setTimeout(refresh, 400);
  }

  function saveDraft() {
    if (!sheetRef.current) return;
    localStorage.setItem(draftKey, sheetRef.current.innerHTML);
    setSavedAt(new Date().toISOString());
  }

  function exec(command: string) {
    document.execCommand(command);
    sheetRef.current?.focus();
    saveDraft();
  }

  // Proje + vekil seçimlerinden birleşik alan listesi üretir.
  // Vekaleten imzada başvuran/mal sahibi bilgileri projeden gelmeye devam
  // eder; yalnızca imza satırı vekile döner.
  function buildTokens(): Record<string, string | undefined> {
    const project = db.projects.find((p) => p.id === projectId);
    const member = db.members.find((m) => m.uid === vekilUid);
    const tokens: Record<string, string | undefined> = {
      ...(project ? buildProjectTokens(project, db.contacts) : {}),
      ...(member ? buildVekilTokens(member) : {}),
    };
    if (dateOn) {
      tokens["TARİH"] = format(new Date(), "d MMMM yyyy", { locale: tr });
    }
    return tokens;
  }

  function updateEkler(next: string[]) {
    if (!sheetRef.current) return;
    writeEkler(sheetRef.current, next);
    setEkler(next);
    saveDraft();
  }

  function addEk(value: string) {
    const v = value.trim();
    if (!v || ekler.includes(v)) return;
    updateEkler([...ekler, v]);
    setYeniEk("");
  }

  async function saveAsNewTemplate() {
    if (!sheetRef.current) return;
    const title = window.prompt(
      "Yeni şablonun adı ne olsun?",
      `${template?.title ?? "Şablon"} (Kopya)`
    );
    if (!title?.trim()) return;
    await addDocTemplate({ title: title.trim(), body: sheetRef.current.innerHTML });
    window.alert(
      `"${title.trim()}" şablonu kaydedildi. Şablonlar sayfasında görebilirsiniz.`
    );
  }

  const filled = buildTokens();
  const eksikAlanlar = docTokens.filter((t) => !filled[t]);
  const selectCls =
    "rounded-full border border-slate-200/80 bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-700 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200";
  const toolbarBtn =
    "flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-semibold text-slate-600 hover:bg-brand-500/10 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400";

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/sablonlar"
            className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            ← Evrak Şablonları
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {template.title}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => {
            saveDraft();
            window.print();
          }}
          className={`${primaryBtnCls} px-5 py-2.5`}
        >
          <PrinterIcon className="h-4 w-4" />
          PDF Olarak Kaydet / Yazdır
        </button>
      </div>

      {/* Veri doldurma */}
      <div className={`${cardCls} no-print space-y-3 p-3`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Verilerden doldur:
          </span>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className={selectCls}
          >
            <option value="">Proje seç (müşteri + arsa sahibi dahil)</option>
            {db.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={vekilUid}
            onChange={(e) => setVekilUid(e.target.value)}
            className={selectCls}
            title="İmza kısmında vekil olarak dolduracak ofis üyesini seçin"
          >
            <option value="">Vekil (imzalayan üye) seç</option>
            {db.members.map((m) => (
              <option key={m.uid} value={m.uid}>
                {m.displayName}
                {m.title ? ` — ${m.title}` : ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setDateOn(true)}
            className={secondaryBtnCls}
          >
            Bugünün Tarihi
          </button>
          <button
            type="button"
            onClick={() => {
              if (!sheetRef.current) return;
              const n = applyDilekceLayout(sheetRef.current);
              saveDraft();
              setLayoutInfo(
                `${n.orta} başlık ortalandı, ${n.sol} blok sola dayandı.`
              );
            }}
            className={secondaryBtnCls}
            title="Başlıkları ortalar, mal sahibi ve imza bloklarını sola dayar"
          >
            Dilekçe Düzenini Uygula
          </button>
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  "Belge ilk haline döndürülecek, yaptığınız değişiklikler silinecek. Emin misiniz?"
                )
              ) {
                localStorage.removeItem(draftKey);
                if (sheetRef.current) sheetRef.current.innerHTML = template.body;
                setProjectId("");
                setVekilUid("");
                setDateOn(false);
                setSavedAt(null);
                setLayoutInfo(null);
                refresh();
              }
            }}
            className={secondaryBtnCls}
          >
            Şablonu Sıfırla
          </button>
          <button type="button" onClick={saveAsNewTemplate} className={secondaryBtnCls}>
            Yeni Şablon Olarak Kaydet
          </button>
          {savedAt && (
            <span className="ml-auto px-1 text-[11px] text-slate-400">
              Taslak kaydedildi ✓
            </span>
          )}
        </div>

        {layoutInfo && (
          <p className="px-1 text-[11px] text-emerald-600 dark:text-emerald-400">
            {layoutInfo}
          </p>
        )}

        {vekilUid && (
          <p className="rounded-xl bg-brand-500/10 px-3 py-2 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
            Vekaleten imza: <strong>[İMZALAYAN ADI]</strong>,{" "}
            <strong>[İMZA]</strong> ve <strong>[VEKİL ADI]</strong> alanları
            seçtiğiniz üyeye göre dolar. <strong>[BAŞVURAN ADI]</strong> ve
            mal sahibi bilgileri projeden gelmeye devam eder — imza satırında
            vekilin adı çıksın istiyorsanız şablonda o satırda{" "}
            <strong>[İMZALAYAN ADI]</strong> kullanın.
          </p>
        )}

        {docTokens.length > 0 && (
          <div className="px-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-semibold">Belgedeki alanlar:</span>{" "}
            {docTokens.map((t) => (
              <span
                key={t}
                className={`mr-1 inline-block rounded px-1.5 py-0.5 ${
                  filled[t]
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : "bg-slate-500/10"
                }`}
                title={filled[t] ? `Dolduruldu: ${filled[t]}` : "Henüz boş"}
              >
                [{t}]
              </span>
            ))}
            {eksikAlanlar.length > 0 && (
              <span className="ml-1 block pt-1 opacity-80">
                Boş kalanları elle yazabilir ya da ilgili seçimi yapabilirsiniz.
              </span>
            )}
          </div>
        )}
      </div>

      {/* Dilekçe ekleri */}
      <div className={`${cardCls} no-print space-y-3 p-3`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Dilekçe eki belgeler:
          </span>
          <input
            value={yeniEk}
            onChange={(e) => setYeniEk(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addEk(yeniEk);
              }
            }}
            placeholder="Ek belge adı yazıp Enter'a basın"
            className="min-w-[15rem] flex-1 rounded-full border border-slate-200/80 bg-white/70 px-3.5 py-1.5 text-xs backdrop-blur-md placeholder:text-slate-400 focus:border-brand-500 focus:outline-none dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-100"
          />
          <button
            type="button"
            onClick={() => addEk(yeniEk)}
            disabled={!yeniEk.trim()}
            className={`${secondaryBtnCls} disabled:opacity-50`}
          >
            Ekle
          </button>
        </div>

        {ekler.length > 0 ? (
          <ol className="space-y-1 px-1">
            {ekler.map((ek, i) => (
              <li
                key={`${ek}-${i}`}
                className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200"
              >
                <span className="w-5 shrink-0 text-right text-slate-400">
                  {i + 1}.
                </span>
                <span className="min-w-0 flex-1 truncate">{ek}</span>
                <button
                  type="button"
                  onClick={() => updateEkler(ekler.filter((_, j) => j !== i))}
                  title="Bu eki çıkar"
                  className="rounded-full p-1 text-slate-400 transition hover:bg-red-500/10 hover:text-red-500"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="px-1 text-[11px] text-slate-400">
            Belgede ek listesi bulunamadı. Aşağıdan bir ek eklerseniz belgenin
            sonuna &quot;EKLER:&quot; başlığıyla numaralı bir liste oluşturulur.
          </p>
        )}

        <div className="flex flex-wrap gap-1 px-1">
          {EK_ONERILERI.filter((s) => !ekler.includes(s)).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addEk(s)}
              className="rounded-full border border-slate-200/70 px-2 py-0.5 text-[11px] text-slate-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-white/10 dark:text-slate-400 dark:hover:text-brand-400"
            >
              + {s}
            </button>
          ))}
        </div>
      </div>

      {/* Biçimlendirme araç çubuğu */}
      <div
        className={`${cardCls} no-print sticky top-2 z-10 flex flex-wrap items-center gap-1 p-2`}
      >
        <button type="button" onClick={() => exec("bold")} className={`${toolbarBtn} font-bold`} title="Kalın">
          K
        </button>
        <button type="button" onClick={() => exec("italic")} className={`${toolbarBtn} italic`} title="İtalik">
          İ
        </button>
        <button type="button" onClick={() => exec("underline")} className={`${toolbarBtn} underline`} title="Altı çizili">
          A
        </button>
        <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-zinc-600" />
        <button type="button" onClick={() => exec("justifyLeft")} className={toolbarBtn} title="Sola hizala">
          ⇤
        </button>
        <button type="button" onClick={() => exec("justifyCenter")} className={toolbarBtn} title="Ortala">
          ↔
        </button>
        <button type="button" onClick={() => exec("justifyRight")} className={toolbarBtn} title="Sağa hizala">
          ⇥
        </button>
        <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-zinc-600" />
        <button type="button" onClick={() => exec("insertUnorderedList")} className={toolbarBtn} title="Madde işaretli liste">
          • —
        </button>
        <button type="button" onClick={() => exec("insertOrderedList")} className={toolbarBtn} title="Numaralı liste">
          1. —
        </button>
        <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-zinc-600" />
        <button type="button" onClick={() => exec("undo")} className={toolbarBtn} title="Geri al">
          ↺
        </button>
        <button type="button" onClick={() => exec("redo")} className={toolbarBtn} title="İleri al">
          ↻
        </button>
        <span className="ml-auto hidden px-2 text-[11px] text-slate-400 sm:block">
          Belgeye tıklayıp Word gibi düzenleyin; [KÖŞELİ] alanların üzerine
          yazın.
        </span>
      </div>

      {/* A4 sayfa */}
      <div className="flex justify-center">
        <div
          ref={sheetRef}
          contentEditable
          suppressContentEditableWarning
          onInput={() => {
            saveDraft();
            scheduleRefresh();
          }}
          className="doc-sheet print-sheet w-full max-w-[794px] rounded-xl border border-slate-200 bg-white px-10 py-12 shadow-xl sm:px-14 sm:py-14"
          style={{ minHeight: "1000px" }}
        />
      </div>
    </div>
  );
}
