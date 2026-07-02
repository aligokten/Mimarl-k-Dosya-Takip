import { Link } from "react-router-dom";
import { deleteDocTemplate, useApp } from "../data";
import { cardCls } from "../ui";
import PageTitle from "../components/PageTitle";
import DeleteButton from "../components/DeleteButton";
import { FileIcon, PenIcon } from "../components/icons";

export default function Templates() {
  const db = useApp();
  const templates = [...db.docTemplates].sort((a, b) =>
    a.title.localeCompare(b.title, "tr")
  );

  return (
    <div className="space-y-6">
      <PageTitle
        icon={<FileIcon className="h-5 w-5" />}
        title="Evrak Şablonları"
        subtitle="Kendi matbu dilekçe ve taslaklarınızı yükleyin, verilerle doldurup PDF olarak kaydedin."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <div
            key={template.id}
            className={`${cardCls} group relative block p-5 transition hover:shadow-lg`}
          >
            <Link to={`/sablonlar/${template.id}`} className="block">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md transition group-hover:scale-105">
                <PenIcon className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                {template.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {template.description ?? "Sizin yüklediğiniz şablon."}
              </p>
              <span className="mt-3 inline-block text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Düzenle ve PDF al →
              </span>
            </Link>
            <span className="absolute right-3 top-3">
              <DeleteButton
                confirmMessage={`"${template.title}" şablonunu silmek istediğinize emin misiniz?`}
                onDelete={() => {
                  deleteDocTemplate(template.id);
                }}
              />
            </span>
          </div>
        ))}

        <Link
          to="/sablonlar/yukle"
          className="group flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-slate-300 p-5 text-center transition hover:border-slate-400 hover:bg-white/40 dark:border-slate-600 dark:hover:border-slate-500 dark:hover:bg-zinc-800/40"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-2xl font-light text-slate-400 shadow-sm transition group-hover:scale-105 group-hover:text-slate-600 dark:bg-zinc-800 dark:text-slate-500">
            +
          </span>
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Şablon Yükle
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Word (.docx), .txt, .html veya metin yapıştırarak kendi
            şablonunuzu ekleyin
          </span>
        </Link>
      </div>

      {templates.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Henüz şablon yüklemediniz. &quot;Şablon Yükle&quot; ile kendi matbu
          evrakınızı ekleyin; proje verileriyle otomatik doldurup PDF olarak
          kaydedebilirsiniz.
        </p>
      )}

      <p className="text-xs text-slate-500/80 dark:text-slate-400/80">
        Not: Şablonlarınızdaki köşeli parantezli alanlar ([MÜŞTERİ ADI], [ADA],
        [PARSEL], [TARİH] vb.) proje verilerinden otomatik doldurulabilir.
        Vekaletname yalnızca noter huzurunda geçerlilik kazanır.
      </p>
    </div>
  );
}
