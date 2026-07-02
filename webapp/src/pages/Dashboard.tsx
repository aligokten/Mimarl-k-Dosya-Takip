import { Link } from "react-router-dom";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useDb } from "../store";
import { useDrive } from "../drive";
import { cardCls, chipCls } from "../ui";
import {
  CalendarIcon,
  CheckCircleIcon,
  CloudIcon,
  FileIcon,
  FolderIcon,
  UsersIcon,
} from "../components/icons";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "İyi geceler";
  if (hour < 12) return "Günaydın";
  if (hour < 18) return "İyi günler";
  return "İyi akşamlar";
}

export default function Dashboard() {
  const db = useDb();
  const drive = useDrive();

  const activeCount = db.projects.filter(
    (p) => p.status === "DEVAM_EDIYOR"
  ).length;
  const completedCount = db.projects.filter(
    (p) => p.status === "TAMAMLANDI"
  ).length;
  const documentCount = db.projects.reduce(
    (sum, p) => sum + p.documents.length,
    0
  );

  const recentProjects = [...db.projects]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6);

  const upcoming = db.projects
    .flatMap((p) =>
      p.services
        .filter((s) => s.status === "DEVAM_EDIYOR" && s.targetDate)
        .map((s) => ({
          project: p,
          service: s,
          serviceType: db.serviceTypes.find(
            (st) => st.id === s.serviceTypeId
          ),
        }))
    )
    .sort((a, b) =>
      (a.service.targetDate ?? "").localeCompare(b.service.targetDate ?? "")
    )
    .slice(0, 6);

  const stats = [
    {
      label: "Devam Eden Proje",
      value: activeCount,
      icon: <FolderIcon className="h-5 w-5" />,
      to: "/projeler",
    },
    {
      label: "Tamamlanan Proje",
      value: completedCount,
      icon: <CheckCircleIcon className="h-5 w-5" />,
      to: "/projeler",
    },
    {
      label: "Kayıtlı Evrak",
      value: documentCount,
      icon: <FileIcon className="h-5 w-5" />,
      to: "/projeler",
    },
    {
      label: "Müşteri",
      value: db.clients.length,
      icon: <UsersIcon className="h-5 w-5" />,
      to: "/musteriler",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {greeting()} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Projelerinizi takip edin, süreçleri ve evrakları yönetin.
        </p>
      </div>

      {!drive.connected && (
        <div className={`${cardCls} flex flex-wrap items-center gap-3 p-4`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white">
            <CloudIcon className="h-5 w-5" />
          </span>
          <p className="min-w-0 flex-1 text-sm text-slate-600">
            <span className="font-semibold text-slate-900">
              Google Drive bağlı değil.
            </span>{" "}
            Dosya yükleme ve otomatik yedekleme için bağlanın.
          </p>
          <Link
            to="/ayarlar"
            className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Ayarlara Git
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            to={stat.to}
            className={`${cardCls} flex items-center gap-3 p-4 hover:border-slate-300`}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              {stat.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-xl font-bold leading-tight text-slate-900">
                {stat.value}
              </span>
              <span className="block truncate text-xs text-slate-500">
                {stat.label}
              </span>
            </span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={`${cardCls} p-5`}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Son Güncellenen Projeler
            </h2>
            <Link
              to="/projeler"
              className="text-xs font-medium text-slate-400 hover:text-slate-700"
            >
              Tümünü Gör
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-slate-100">
            {recentProjects.length === 0 && (
              <li className="py-4 text-sm text-slate-500">
                Henüz proje eklenmemiş.
              </li>
            )}
            {recentProjects.map((project) => {
              const client = db.clients.find((c) => c.id === project.clientId);
              return (
                <li key={project.id}>
                  <Link
                    to={`/projeler/${project.id}`}
                    className="block rounded-lg px-2 py-2.5 hover:bg-slate-50"
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      {project.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {client?.name ?? "-"}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className={`${cardCls} p-5`}>
          <h2 className="text-sm font-semibold text-slate-900">
            Yaklaşan Hedef Tarihler
          </h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {upcoming.length === 0 && (
              <li className="py-4 text-sm text-slate-500">
                Yaklaşan hedef tarih bulunmuyor.
              </li>
            )}
            {upcoming.map(({ project, service, serviceType }) => (
              <li key={service.id}>
                <Link
                  to={`/projeler/${project.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-slate-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-900">
                      {project.name}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {serviceType?.name ?? "-"}
                    </span>
                  </span>
                  <span className={chipCls}>
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {service.targetDate
                      ? format(new Date(service.targetDate), "d MMM yyyy", {
                          locale: tr,
                        })
                      : "-"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
