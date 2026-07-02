import { useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useApp } from "../data";
import { cardCls, chipCls, primaryBtnCls } from "../ui";
import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  PROJECT_STATUS_LABELS,
  type Project,
  type ProjectStatus,
} from "../types";
import {
  CalendarIcon,
  FlagIcon,
  FolderIcon,
  PaperclipIcon,
  SearchIcon,
} from "../components/icons";
import PageTitle from "../components/PageTitle";

const COLUMNS: { status: ProjectStatus; dot: string; pill: string }[] = [
  {
    status: "DEVAM_EDIYOR",
    dot: "bg-orange-500",
    pill: "bg-orange-50 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/30",
  },
  {
    status: "TAMAMLANDI",
    dot: "bg-blue-500",
    pill: "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30",
  },
  {
    status: "DURDURULDU",
    dot: "bg-slate-400",
    pill: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600",
  },
];

function projectProgress(
  project: Project,
  stageCountByType: Map<string, number>
): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const service of project.services) {
    const stageCount = stageCountByType.get(service.serviceTypeId) ?? 0;
    total += stageCount;
    done += Math.min(service.completedStageIds.length, stageCount);
  }
  return { done, total };
}

export default function Projects() {
  const db = useApp();
  const [view, setView] = useState<"board" | "list">("board");
  const [query, setQuery] = useState("");

  const stageCountByType = new Map(
    db.serviceTypes.map((st) => [st.id, st.stages.length])
  );
  const normalizedQuery = query.trim().toLocaleLowerCase("tr");
  const projects = [...db.projects]
    .filter((p) => {
      if (!normalizedQuery) return true;
      const client = db.contacts.find((c) => c.id === p.clientId);
      return (
        p.name.toLocaleLowerCase("tr").includes(normalizedQuery) ||
        (client?.name.toLocaleLowerCase("tr") ?? "").includes(normalizedQuery)
      );
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle
          icon={<FolderIcon className="h-5 w-5" />}
          title="Projeler"
          subtitle="Tüm mimarlık ve ruhsat projeleri."
        />
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Proje veya müşteri ara..."
              className="w-44 rounded-full bg-white dark:bg-slate-800 py-2 pl-9 pr-3 text-sm text-slate-700 dark:text-slate-200 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 sm:w-56"
            />
          </label>
          <div className="inline-flex rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-1">
            {(
              [
                ["board", "Pano"],
                ["list", "Liste"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                className={clsx(
                  "rounded-full px-3.5 py-1 text-xs font-semibold",
                  view === key
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <Link to="/projeler/yeni" className={primaryBtnCls}>
            + Yeni Proje
          </Link>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className={`${cardCls} p-8 text-center text-sm text-slate-500 dark:text-slate-400`}>
          {normalizedQuery
            ? "Aramanızla eşleşen proje bulunamadı."
            : 'Henüz proje eklenmemiş. "+ Yeni Proje" ile başlayın.'}
        </div>
      ) : view === "board" ? (
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-3">
          {COLUMNS.map((column) => {
            const columnProjects = projects.filter(
              (p) => p.status === column.status
            );
            return (
              <div key={column.status} className="space-y-3">
                <div className={`${cardCls} flex items-center gap-2 px-4 py-2.5`}>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${column.pill}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${column.dot}`} />
                    {PROJECT_STATUS_LABELS[column.status]}
                  </span>
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                    {columnProjects.length}
                  </span>
                </div>
                {columnProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    stageCountByType={stageCountByType}
                  />
                ))}
                {columnProjects.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 p-5 text-center text-xs text-slate-400 dark:text-slate-500">
                    Bu durumda proje yok.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              stageCountByType={stageCountByType}
              wide
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({
  project,
  stageCountByType,
  wide = false,
}: {
  project: Project;
  stageCountByType: Map<string, number>;
  wide?: boolean;
}) {
  const db = useApp();
  const client = db.contacts.find((c) => c.id === project.clientId);
  const { done, total } = projectProgress(project, stageCountByType);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const barColor =
    total === 0
      ? "bg-slate-300"
      : pct === 100
        ? "bg-blue-500"
        : "bg-orange-500";
  const priority = project.priority ?? "ORTA";
  const nextTarget = project.services
    .filter((s) => s.status === "DEVAM_EDIYOR" && s.targetDate)
    .map((s) => s.targetDate!)
    .sort()[0];

  return (
    <Link
      to={`/projeler/${project.id}`}
      className={`${cardCls} block p-4 transition hover:border-slate-300 hover:shadow-md`}
    >
      <span
        className={`inline-flex items-center gap-1 text-xs font-semibold ${PRIORITY_COLORS[priority]}`}
      >
        <FlagIcon className="h-3.5 w-3.5" />
        {PRIORITY_LABELS[priority]}
      </span>
      <p className="mt-1.5 text-sm font-bold text-slate-900 dark:text-white">{project.name}</p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{client?.name ?? "-"}</p>

      <div className={wide ? "mt-3 max-w-md" : "mt-3"}>
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-slate-500 dark:text-slate-400">İlerleme</span>
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {total > 0 ? `${done}/${total}` : "-"}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div
            className={`h-full rounded-full ${barColor}`}
            style={{ width: `${total > 0 ? Math.max(pct, 4) : 0}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-slate-700 pt-3">
        {nextTarget && (
          <span className={chipCls}>
            <CalendarIcon className="h-3.5 w-3.5" />
            {format(new Date(nextTarget), "d MMM yyyy", { locale: tr })}
          </span>
        )}
        <span className={chipCls}>{project.services.length} hizmet</span>
        <span className={`${chipCls} ml-auto`}>
          <PaperclipIcon className="h-3.5 w-3.5" />
          {project.documents.length}
        </span>
      </div>
    </Link>
  );
}
