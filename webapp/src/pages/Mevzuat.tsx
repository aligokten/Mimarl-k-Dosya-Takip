import { useMemo, useState } from "react";
import { addMevzuat, deleteMevzuat, useApp } from "../data";
import { useDrive, connectDrive, uploadSharedPdf } from "../drive";
import type { MevzuatDoc, MevzuatKind } from "../types";
import { cardCls, inputCls, labelCls, primaryBtnCls, secondaryBtnCls } from "../ui";
import PageTitle from "../components/PageTitle";
import DeleteButton from "../components/DeleteButton";
import { ScaleIcon, SearchIcon, FileIcon } from "../components/icons";

const TABS: { kind: MevzuatKind; label: string }[] = [
  { kind: "MEVZUAT", label: "Mevzuat" },
  { kind: "PLAN_NOTU", label: "İmar Plan Notu" },
];

function docKind(item: MevzuatDoc): MevzuatKind {
  return item.kind ?? "MEVZUAT";
}

export default function Mevzuat() {
  const app = useApp();
  const isAdmin = app.me?.role === "ADMIN";
  const [tab, setTab] = useState<MevzuatKind>("MEVZUAT");
  const [query, setQuery] = useState("");
  const [viewing, setViewing] = useState<MevzuatDoc | null>(null);

  const q = query.trim().toLocaleLowerCase("tr");
  const items = useMemo(
    () =>
      [...app.mevzuat]
        .filter((m) => docKind(m) === tab)
        .filter(
          (m) =>
            !q ||
            m.title.toLocaleLowerCase("tr").includes(q) ||
            (m.category ?? "").toLocaleLowerCase("tr").includes(q)
        )
        .sort((a, b) => a.title.localeCompare(b.title, "tr")),
    [app.mevzuat, tab, q]
  );

  const isPlan = tab === "PLAN_NOTU";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle
          icon={<ScaleIcon className="h-5 w-5" />}
          title="Mevzuat"
          subtitle="Yüklenen mevzuat ve imar plan notu PDF'lerini uygulama içinde görüntüleyin."
        />
        <label className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ara..."
            className="w-48 rounded-full bg-white dark:bg-zinc-800 py-2 pl-9 pr-3 text-sm text-slate-700 dark:text-slate-200 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 sm:w-64"
          />
        </label>
      </div>

      <div className="flex gap-1 rounded-full bg-slate-100 p-1 dark:bg-zinc-800 w-fit">
        {TABS.map((t) => (
          <button
            key={t.kind}
            type="button"
            onClick={() => setTab(t.kind)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              tab === t.kind
                ? "bg-white text-slate-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isAdmin && <UploadMevzuat kind={tab} />}

      {items.length === 0 ? (
        <div className={`${cardCls} p-8 text-center text-sm text-slate-500 dark:text-slate-400`}>
          {q
            ? "Aramanızla eşleşen kayıt yok."
            : isAdmin
              ? `Henüz ${isPlan ? "imar plan notu" : "mevzuat"} yüklenmedi. Yukarıdan PDF ekleyin.`
              : `Henüz ${isPlan ? "imar plan notu" : "mevzuat"} yüklenmedi.`}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className={`${cardCls} flex flex-col p-5`}>
              <button
                type="button"
                onClick={() => setViewing(item)}
                className="flex flex-1 items-start gap-3 text-left"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 text-white shadow-md">
                  <FileIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  {item.category && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-zinc-700 dark:text-slate-300">
                      {item.category}
                    </span>
                  )}
                  <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                    {item.title}
                  </p>
                </div>
              </button>
              <div className="mt-4 flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setViewing(item)}
                  className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                >
                  Görüntüle
                </button>
                {isAdmin && (
                  <span className="ml-auto">
                    <DeleteButton
                      confirmMessage={`"${item.title}" kaydını silmek istediğinize emin misiniz?`}
                      onDelete={() => deleteMevzuat(item)}
                    />
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewing && (
        <PdfViewer item={viewing} onClose={() => setViewing(null)} />
      )}
    </div>
  );
}

function UploadMevzuat({ kind }: { kind: MevzuatKind }) {
  const drive = useDrive();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const isPlan = kind === "PLAN_NOTU";

  return (
    <section className={`${cardCls} p-6`}>
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
        {isPlan ? "İmar Plan Notu Ekle (PDF)" : "Mevzuat Ekle (PDF)"}
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Yüklediğiniz PDF Google Drive'da saklanır, tüm ofis çalışanlarında
        görünür ve uygulama içinde açılır.
      </p>

      {!drive.connected ? (
        <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          <p>
            PDF yüklemek için önce Google Drive'a bağlanmanız gerekir.
          </p>
          <button
            type="button"
            disabled={drive.busy || !drive.configured}
            onClick={() => {
              setMsg(null);
              connectDrive().catch((e) =>
                setMsg({
                  ok: false,
                  text: e instanceof Error ? e.message : String(e),
                })
              );
            }}
            className={`${primaryBtnCls} mt-3 disabled:opacity-60`}
          >
            {drive.busy ? "Bağlanıyor..." : "Google Drive'a Bağlan"}
          </button>
          {!drive.configured && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
              Yönetici, Ayarlar &gt; Google Drive bölümünden Client ID
              tanımlamalıdır.
            </p>
          )}
          {msg && !msg.ok && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              {msg.text}
            </p>
          )}
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const file = new FormData(form).get("file");
            if (!(file instanceof File) || file.size === 0) {
              setMsg({ ok: false, text: "Bir PDF dosyası seçin." });
              return;
            }
            if (file.type && file.type !== "application/pdf") {
              setMsg({ ok: false, text: "Yalnızca PDF yükleyebilirsiniz." });
              return;
            }
            setBusy(true);
            setMsg(null);
            try {
              const { fileId, previewUrl, webViewLink } = await uploadSharedPdf(
                file,
                isPlan ? "Imar Plan Notu" : "Mevzuat"
              );
              await addMevzuat({
                kind,
                title: title || file.name,
                category,
                fileId,
                previewUrl,
                webViewLink,
              });
              setTitle("");
              setCategory("");
              form.reset();
              setMsg({ ok: true, text: "PDF yüklendi." });
            } catch (err) {
              setMsg({
                ok: false,
                text:
                  "Yüklenemedi: " +
                  (err instanceof Error ? err.message : String(err)),
              });
            } finally {
              setBusy(false);
            }
          }}
          className="mt-4 space-y-3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Başlık</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  isPlan ? "Ör: 1/1000 Uygulama İmar Planı Notu" : "Ör: İmar Kanunu (3194)"
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Kategori (isteğe bağlı)</label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ör: İmar, Yangın, Deprem"
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>PDF Dosyası</label>
            <input
              type="file"
              name="file"
              accept="application/pdf,.pdf"
              className="mt-1 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-200 dark:text-slate-300 dark:file:bg-zinc-700 dark:file:text-slate-200"
            />
          </div>
          {msg && (
            <p
              className={
                msg.ok
                  ? "text-sm text-green-700 dark:text-green-300"
                  : "text-sm text-red-600 dark:text-red-400"
              }
            >
              {msg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className={`${primaryBtnCls} disabled:opacity-60`}
          >
            {busy ? "Yükleniyor..." : "PDF Yükle"}
          </button>
        </form>
      )}
    </section>
  );
}

function PdfViewer({ item, onClose }: { item: MevzuatDoc; onClose: () => void }) {
  // Yeni kayıtlar Drive önizleme (previewUrl); eski kayıtlar Storage (fileUrl).
  const src = item.previewUrl ?? item.fileUrl;
  const downloadHref = item.webViewLink ?? item.fileUrl;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 dark:border-zinc-700">
          <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">
            {item.title}
          </h3>
          <div className="flex items-center gap-2">
            {downloadHref && (
              <a
                href={downloadHref}
                target="_blank"
                rel="noreferrer"
                className={secondaryBtnCls}
              >
                Yeni sekmede aç
              </a>
            )}
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
          src={src}
          title={item.title}
          className="min-h-0 flex-1 bg-slate-100 dark:bg-zinc-800"
        />
      </div>
    </div>
  );
}
