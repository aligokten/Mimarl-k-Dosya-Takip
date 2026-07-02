import { Link } from "react-router-dom";
import { DOC_TEMPLATES } from "../templates";
import { cardCls } from "../ui";
import PageTitle from "../components/PageTitle";
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
      </div>

      <p className="text-xs text-slate-500/80 dark:text-slate-400/80">
        Not: Şablonlar genel taslaklardır; kurumların istediği format
        farklılık gösterebilir. Vekaletname yalnızca noter huzurunda
        geçerlilik kazanır.
      </p>
    </div>
  );
}
