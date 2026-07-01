import { Link } from "react-router-dom";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useDb } from "../store";
import { cardCls } from "../ui";

export default function Dashboard() {
  const db = useDb();

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
    { label: "Devam Eden Proje", value: activeCount },
    { label: "Tamamlanan Proje", value: completedCount },
    { label: "Kayıtlı Evrak", value: documentCount },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Panel</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ofis projelerinizin genel durumu.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className={`${cardCls} p-5`}>
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={`${cardCls} p-5`}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Son Güncellenen Projeler
            </h2>
            <Link
              to="/projeler"
              className="text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              Tümünü Gör
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-slate-100">
            {recentProjects.length === 0 && (
              <li className="py-4 text-sm text-slate-500">
                Henüz proje eklenmemiş.
              </li>
            )}
            {recentProjects.map((project) => {
              const client = db.clients.find((c) => c.id === project.clientId);
              return (
                <li key={project.id} className="py-3">
                  <Link
                    to={`/projeler/${project.id}`}
                    className="block hover:text-slate-600"
                  >
                    <p className="text-sm font-medium text-slate-900">
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
          <ul className="mt-4 divide-y divide-slate-100">
            {upcoming.length === 0 && (
              <li className="py-4 text-sm text-slate-500">
                Yaklaşan hedef tarih bulunmuyor.
              </li>
            )}
            {upcoming.map(({ project, service, serviceType }) => (
              <li key={service.id} className="py-3">
                <Link
                  to={`/projeler/${project.id}`}
                  className="block hover:text-slate-600"
                >
                  <p className="text-sm font-medium text-slate-900">
                    {project.name} — {serviceType?.name ?? "-"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Hedef:{" "}
                    {service.targetDate
                      ? format(new Date(service.targetDate), "d MMMM yyyy", {
                          locale: tr,
                        })
                      : "-"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
