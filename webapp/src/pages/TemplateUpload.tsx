import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { addDocTemplate } from "../data";
import { cardCls, inputCls, labelCls, primaryBtnCls, smallLabelCls } from "../ui";
import PageTitle from "../components/PageTitle";
import { FileIcon } from "../components/icons";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function textToHtml(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => `<p>${escapeHtml(line) || "&nbsp;"}</p>`)
    .join("\n");
}

async function fileToHtml(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth/mammoth.browser");
    const result = await mammoth.convertToHtml({
      arrayBuffer: await file.arrayBuffer(),
    });
    return result.value;
  }
  if (name.endsWith(".html") || name.endsWith(".htm")) {
    const text = await file.text();
    // Yalnızca body içeriğini al (varsa)
    const match = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    return match ? match[1] : text;
  }
  if (name.endsWith(".txt")) {
    return textToHtml(await file.text());
  }
  throw new Error(
    "Desteklenmeyen dosya türü. .docx (Word), .txt veya .html yükleyebilirsiniz."
  );
}

export default function TemplateUpload() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createTemplate(title: string, body: string) {
    const id = await addDocTemplate({ title, body });
    navigate(`/sablonlar/${id}`);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          to="/sablonlar"
          className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        >
          ← Evrak Şablonları
        </Link>
        <div className="mt-2">
          <PageTitle
            icon={<FileIcon className="h-5 w-5" />}
            title="Şablon Yükle"
            subtitle="Kendi matbu evrakınızı Word (.docx), .txt veya .html olarak yükleyin; ya da metni yapıştırın."
          />
        </div>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          const formData = new FormData(e.currentTarget);
          const title = String(formData.get("title") ?? "").trim();
          const file = formData.get("file");
          const pasted = String(formData.get("pasted") ?? "").trim();

          if (!title) {
            setError("Şablon adı gerekli.");
            return;
          }

          setBusy(true);
          try {
            let body: string;
            if (file instanceof File && file.size > 0) {
              body = await fileToHtml(file);
            } else if (pasted) {
              body = textToHtml(pasted);
            } else {
              setError("Bir dosya seçin veya metin yapıştırın.");
              setBusy(false);
              return;
            }
            await createTemplate(title, body);
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "Dosya dönüştürülemedi."
            );
            setBusy(false);
          }
        }}
        className={`${cardCls} space-y-4 p-6`}
      >
        <div>
          <label className={labelCls}>Şablon Adı</label>
          <input
            name="title"
            required
            placeholder="Örn: İskan Başvuru Dilekçesi"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Dosya Yükle</label>
          <input
            type="file"
            name="file"
            accept=".docx,.txt,.html,.htm"
            className="mt-1 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-200 dark:text-slate-300 dark:file:bg-slate-700 dark:file:text-slate-200"
          />
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Word (.docx) belgeleri biçimlendirmesiyle birlikte aktarılır.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200 dark:bg-zinc-600" />
          <span className="text-xs font-medium text-slate-400">veya</span>
          <span className="h-px flex-1 bg-slate-200 dark:bg-zinc-600" />
        </div>

        <div>
          <label className={labelCls}>Metni Yapıştır</label>
          <textarea
            name="pasted"
            rows={8}
            placeholder="Şablon metnini buraya yapıştırın..."
            className={inputCls}
          />
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            İpucu: Otomatik doldurulmasını istediğiniz yerlere köşeli
            parantezli alanlar yazın — örn. [MÜŞTERİ ADI], [ADA], [PARSEL],
            [TARİH], [MÜTEAHHİT ADI].
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={busy}
          className={`${primaryBtnCls} disabled:opacity-60`}
        >
          {busy ? "Yükleniyor..." : "Şablonu Oluştur ve Düzenle"}
        </button>
      </form>

      <div className={`${cardCls} p-5`}>
        <p className={smallLabelCls}>Otomatik doldurulabilen alanlar</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          [PROJE ADI] · [İL] · [İLÇE] · [MAHALLE] · [ADA] · [PARSEL] ·
          [BELEDİYE] · [MÜŞTERİ ADI] · [MÜŞTERİ ADRESİ] · [MÜŞTERİ TELEFON] ·
          [ARSA SAHİBİ ADI] · [ARSA SAHİBİ TC] · [ARSA SAHİBİ ADRESİ] ·
          [MÜTEAHHİT ADI] · [MÜTEAHHİT ADRESİ] · [MÜTEAHHİT TELEFON] ·
          [MÜTEAHHİT VERGİ NO] · [BAŞVURAN ADI] · [BAŞVURAN TC] · [TARİH]
        </p>
      </div>
    </div>
  );
}
