import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { DOC_TEMPLATES } from "../templates";
import { addDocTemplate, useApp } from "../data";
import { cardCls, secondaryBtnCls } from "../ui";
import { PrinterIcon } from "../components/icons";

const DRAFT_KEY_PREFIX = "mimarlik-doc-draft-";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export default function TemplateEditor() {
  const { id } = useParams<{ id: string }>();
  const db = useApp();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const builtin = DOC_TEMPLATES.find((t) => t.id === id);
  const custom = db.docTemplates.find((t) => t.id === id);
  const template = builtin ?? custom;
  const draftKey = `${DRAFT_KEY_PREFIX}${id}`;

  useEffect(() => {
    if (!sheetRef.current || !template) return;
    const draft = localStorage.getItem(draftKey);
    sheetRef.current.innerHTML = draft ?? template.body;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!template) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Şablon bulunamadı.
      </p>
    );
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

  function fillTokens(values: Record<string, string | undefined>) {
    if (!sheetRef.current) return;
    let html = sheetRef.current.innerHTML;
    for (const [token, value] of Object.entries(values)) {
      if (!value) continue;
      html = html.split(`[${token}]`).join(escapeHtml(value));
    }
    sheetRef.current.innerHTML = html;
    saveDraft();
  }

  function fillFromProject(projectId: string) {
    const project = db.projects.find((p) => p.id === projectId);
    if (!project) return;
    const client = db.contacts.find((c) => c.id === project.clientId);
    const owner = db.contacts.find((o) => o.id === project.landOwnerId);
    const contractor = db.contacts.find(
      (c) => c.id === project.contractorId
    );
    fillTokens({
      "PROJE ADI": project.name,
      İL: project.province,
      İLÇE: project.district,
      MAHALLE: project.neighborhood,
      ADA: project.ada,
      PARSEL: project.parsel,
      BELEDİYE: project.district,
      "MÜŞTERİ ADI": client?.name,
      "MÜŞTERİ ADRESİ": client?.address,
      "MÜŞTERİ TELEFON": client?.phone,
      "ARSA SAHİBİ ADI": owner?.name,
      "ARSA SAHİBİ TC": owner?.tcNo,
      "ARSA SAHİBİ ADRESİ": owner?.address,
      "MÜTEAHHİT ADI": contractor?.name,
      "MÜTEAHHİT ADRESİ": contractor?.address,
      "MÜTEAHHİT TELEFON": contractor?.phone,
      "MÜTEAHHİT VERGİ NO": contractor?.taxNo,
      "BAŞVURAN ADI": owner?.name ?? client?.name,
      "BAŞVURAN TC": owner?.tcNo,
      "BAŞVURAN ADRESİ": owner?.address ?? client?.address,
      TELEFON: owner?.phone ?? client?.phone,
    });
  }

  async function saveAsNewTemplate() {
    if (!sheetRef.current) return;
    const title = window.prompt(
      "Yeni şablonun adı ne olsun?",
      `${template?.title ?? "Şablon"} (Kopya)`
    );
    if (!title?.trim()) return;
    const body = sheetRef.current.innerHTML;
    await addDocTemplate({ title: title.trim(), body });
    window.alert(
      `"${title.trim()}" şablonu kaydedildi. Şablonlar sayfasında görebilirsiniz.`
    );
  }

  const toolbarBtn =
    "flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700";

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
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          <PrinterIcon className="h-4 w-4" />
          PDF Olarak Kaydet / Yazdır
        </button>
      </div>

      {/* Veri doldurma */}
      <div className={`${cardCls} no-print flex flex-wrap items-center gap-2 p-3`}>
        <span className="px-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
          Verilerden doldur:
        </span>
        <select
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) fillFromProject(e.target.value);
            e.target.value = "";
          }}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        >
          <option value="" disabled>
            Proje seç (müşteri + arsa sahibi dahil)
          </option>
          {db.projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() =>
            fillTokens({
              TARİH: format(new Date(), "d MMMM yyyy", { locale: tr }),
            })
          }
          className={secondaryBtnCls}
        >
          Bugünün Tarihi
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
              setSavedAt(null);
            }
          }}
          className={secondaryBtnCls}
        >
          Şablonu Sıfırla
        </button>
        <button
          type="button"
          onClick={saveAsNewTemplate}
          className={secondaryBtnCls}
        >
          Yeni Şablon Olarak Kaydet
        </button>
        {savedAt && (
          <span className="ml-auto px-1 text-[11px] text-slate-400">
            Taslak kaydedildi ✓
          </span>
        )}
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
        <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-600" />
        <button type="button" onClick={() => exec("justifyLeft")} className={toolbarBtn} title="Sola hizala">
          ⇤
        </button>
        <button type="button" onClick={() => exec("justifyCenter")} className={toolbarBtn} title="Ortala">
          ↔
        </button>
        <button type="button" onClick={() => exec("justifyRight")} className={toolbarBtn} title="Sağa hizala">
          ⇥
        </button>
        <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-600" />
        <button type="button" onClick={() => exec("insertUnorderedList")} className={toolbarBtn} title="Madde işaretli liste">
          • —
        </button>
        <button type="button" onClick={() => exec("insertOrderedList")} className={toolbarBtn} title="Numaralı liste">
          1. —
        </button>
        <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-600" />
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
          onInput={saveDraft}
          className="doc-sheet print-sheet w-full max-w-[794px] rounded-xl border border-slate-200 bg-white px-10 py-12 shadow-xl sm:px-14 sm:py-14"
          style={{ minHeight: "1000px" }}
        />
      </div>
    </div>
  );
}
