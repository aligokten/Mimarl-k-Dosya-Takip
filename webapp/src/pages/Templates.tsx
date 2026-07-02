import { Link } from "react-router-dom";
import { DOC_TEMPLATES } from "../templates";
import { mutate, useDb } from "../store";
import { cardCls } from "../ui";
import PageTitle from "../components/PageTitle";
import DeleteButton from "../components/DeleteButton";
import {
  BuildingIcon,
  FileIcon,
  PenIcon,
  ScaleIcon,
} from "../components/icons";

const TEMPLATE_ICONS = {
  scale: ScaleIcon,
  building: BuildingIcon,
  pen: PenIcon,
} as const;

export default function Templates() {
  const db = useDb();

  return (
    <div className="space-y-6">
      <PageTitle
        icon={<FileIcon className="h-5 w-5" />}
        title="Evrak Şablonları"
        subtitle="Matbu dilekçe ve taslakları düzenleyip PDF olarak kaydedin."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {DOC_TEMPLATES.map((template) => {
          const Icon = TEMPLATE_ICONS[template.icon];
          return (
            <Link
              key={template.id}
              to={`/sablonlar/${template.id}`}
              className={`${cardCls} group block p-5 transition hover:shadow-lg`}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-md transition group-hover:scale-105">
                <Icon className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                {template.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {template.description}
              </p>
              <span className="mt-3 inline-block text-xs font-semibold text-blue-600 dark:text-blue-400">
                Düzenle ve PDF al →
              </span>
            </Link>
          );
        })}

        {db.docTemplates.map((template) => (
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
            <span className="absolute right-3 top-3 flex items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                Özel
              </span>
              <DeleteButton
                confirmMessage={`"${template.title}" şablonunu silmek istediğinize emin misiniz?`}
                onDelete={() => {
                  mutate((draft) => {
                    draft.docTemplates = draft.docTemplates.filter(
                      (t) => t.id !== template.id
                    );
                  });
                }}
              />
            </span>
          </div>
        ))}

        <Link
          to="/sablonlar/yukle"
          className="group flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-slate-300 p-5 text-center transition hover:border-slate-400 hover:bg-white/40 dark:border-slate-600 dark:hover:border-slate-500 dark:hover:bg-slate-800/40"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-2xl font-light text-slate-400 shadow-sm transition group-hover:scale-105 group-hover:text-slate-600 dark:bg-slate-800 dark:text-slate-500">
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

      <p className="text-xs text-slate-500/80 dark:text-slate-400/80">
        Not: Şablonlar genel taslaklardır; kurumların istediği format
        farklılık gösterebilir. Vekaletname yalnızca noter huzurunda
        geçerlilik kazanır. Özel şablonlarınız verilerinizle birlikte
        yedeklenir.
      </p>
    </div>
  );
}
