import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { addDocTemplate } from "../data";
import { uploadToDrive, useDrive } from "../drive";
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
    // Tablolar, görseller (base64) ve başlıklar korunur; altı çizili/üstü
    // çizili gibi biçimler de aktarılır. Sayfa/tablo yapısı bozulmaz.
    // (Tür tanımı tek argüman bildiriyor; options çalışma zamanında geçerli.)
    const convert = mammoth.convertToHtml as unknown as (
      input: { arrayBuffer: ArrayBuffer },
      options?: { styleMap?: string[]; includeDefaultStyleMap?: boolean }
    ) => Promise<{ value: string }>;
    const result = await convert(
      { arrayBuffer: await file.arrayBuffer() },
      {
        styleMap: [
          "u => u",
          "strike => s",
          "p[style-name='Title'] => h1:fresh",
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
        ],
        includeDefaultStyleMap: true,
      }
    );
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
  const drive = useDrive();
  const [busy, setBusy] = useState(false);
  const [busyText, setBusyText] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function createTemplate(
    title: string,
    body: string,
    source?: { sourceDriveFileId: string; sourceFileName: string }
  ) {
    const id = await addDocTemplate({ title, body, ...source });
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
            let source: { sourceDriveFileId: string; sourceFileName: string } | undefined;
            if (file instanceof File && file.size > 0) {
              // Drive'a yükleme (gerekirse Google yetkilendirme penceresi
              // açar) mutlaka İLK adım olmalı: tarayıcılar, kullanıcı
              // tıklamasından sonra araya giren başka bir bekleme (ör.
              // mammoth dönüşümü) varsa açılır pencereyi engelleyebilir.
              // Bu adım isteğe bağlıdır (Taahhütname'de birebir sayfa
              // düzeni için kullanılır) — başarısız olsa bile şablonun
              // kendisinin yüklenmesini engellemesin.
              if (file.name.toLowerCase().endsWith(".docx") && drive.connected) {
                try {
                  setBusyText("Orijinal Word dosyası Drive'a yükleniyor...");
                  const uploaded = await uploadToDrive(file, "Şablon Word Dosyaları");
                  source = { sourceDriveFileId: uploaded.id, sourceFileName: file.name };
                } catch (driveErr) {
                  console.error("Drive'a orijinal dosya yüklenemedi:", driveErr);
                  // navigate() az sonra bu sayfadan çıkaracağı için setError
                  // yerine alert kullanıyoruz — kullanıcı bunu görmeden
                  // sayfadan ayrılmasın.
                  window.alert(
                    "Orijinal Word dosyası Drive'a yüklenemedi, bu yüzden " +
                      "Taahhütname Oluştur'da birebir sayfa düzeniyle " +
                      "kullanılamayacak; ancak şablonun kendisi normal " +
                      "şekilde yükleniyor.\n\nHata: " +
                      (driveErr instanceof Error ? driveErr.message : String(driveErr))
                  );
                }
              }
              setBusyText("Dosya dönüştürülüyor...");
              body = await fileToHtml(file);
            } else if (pasted) {
              body = textToHtml(pasted);
            } else {
              setError("Bir dosya seçin veya metin yapıştırın.");
              setBusy(false);
              return;
            }
            setBusyText("Şablon kaydediliyor...");
            await createTemplate(title, body, source);
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
            className="mt-1 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-200 dark:text-slate-300 dark:file:bg-slate-700 dark:file:text-slate-200"
          />
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Word (.docx) belgeleri biçimlendirmesiyle birlikte aktarılır.
          </p>
          {drive.connected ? (
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
              Drive bağlı: orijinal Word dosyası da saklanacak, böylece
              Uzmanlar &gt; Taahhütname Oluştur akışında sayfa düzeni birebir
              korunarak doldurulabilir.
            </p>
          ) : (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              Taahhütname gibi birebir sayfa düzeni korunması gereken
              belgeler için önce Ayarlar &gt; Google Drive&apos;a bağlanın;
              aksi halde yalnızca ekran içi düzenleme kullanılabilir.
            </p>
          )}
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
          {busy ? busyText || "Yükleniyor..." : "Şablonu Oluştur ve Düzenle"}
        </button>
      </form>

      <div className={`${cardCls} p-5`}>
        <p className={smallLabelCls}>Otomatik doldurulabilen alanlar</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          [PROJE ADI] · [İL] · [İLÇE] · [MAHALLE] · [ADA] · [PARSEL] ·
          [BELEDİYE] · [MÜŞTERİ ADI] · [MÜŞTERİ ADRESİ] · [MÜŞTERİ TELEFON] ·
          [ARSA SAHİBİ ADI] · [ARSA SAHİBİ TC] · [ARSA SAHİBİ ADRESİ] ·
          [MÜTEAHHİT ADI] · [MÜTEAHHİT ADRESİ] · [MÜTEAHHİT TELEFON] ·
          [MÜTEAHHİT VERGİ NO] · [BAŞVURAN ADI] · [BAŞVURAN TC] · [TARİH] ·
          [VEKİL ADI] · [VEKİL ÜNVAN] · [VEKİL TELEFON] · [VEKİL E-POSTA] ·
          [İMZALAYAN ADI]
        </p>
        <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Taahhütname şablonları için ayrıca: [MÜELLİF ADI] / [FENNİ MESUL
          ADI] · [MÜELLİF TC] / [FENNİ MESUL TC] · [MÜELLİF MESLEK] ·
          [MÜELLİF FİRMA] · [MÜELLİF ODA SİCİL NO] · [MÜELLİF BÜRO TESCİL
          NO] · [MÜELLİF TELEFON] · [MÜELLİF E-POSTA] · [MÜELLİF ADRESİ]
          (Uzmanlar sayfasında seçilen kişiye göre otomatik dolar; şablonda
          hangi adlandırmayı kullandıysanız — müellif ya da fenni mesul — o
          dolar.)
        </p>
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          İmza kısmına <strong>[VEKİL ADI]</strong> / <strong>[İMZALAYAN ADI]</strong>
          yazın; düzenleme sayfasında &quot;Vekil (imzalayan üye) seç&quot;
          ile ofis üyelerinden biri seçilerek otomatik doldurulur.
        </p>
      </div>
    </div>
  );
}
