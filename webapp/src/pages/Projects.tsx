import { Link } from "react-router-dom";
import { useDb } from "../store";
import { cardCls, primaryBtnCls } from "../ui";
import { PROJECT_STATUS_COLORS, PROJECT_STATUS_LABELS } from "../types";

export default function Projects() {
  const db = useDb();
  const projects = [...db.projects].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Projeler</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tüm mimarlık ve ruhsat projeleri.
          </p>
        </div>
        <Link to="/projeler/yeni" className={primaryBtnCls}>
          Yeni Proje
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {projects.length === 0 && (
          <div className={`${cardCls} p-6 text-center text-sm text-slate-500`}>
            Henüz proje eklenmemiş.
          </div>
        )}
        {projects.map((project) => {
          const client = db.clients.find((c) => c.id === project.clientId);
          const landOwner = db.landOwners.find(
            (o) => o.id === project.landOwnerId
          );
          return (
            <Link
              key={project.id}
              to={`/projeler/${project.id}`}
              className={`${cardCls} block p-5 hover:border-slate-300`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {project.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {client?.name ?? "-"}
                    {landOwner ? ` · Arsa Sahibi: ${landOwner.name}` : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${PROJECT_STATUS_COLORS[project.status]}`}
                >
                  {PROJECT_STATUS_LABELS[project.status]}
                </span>
              </div>
              {project.services.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {project.services.map((service) => {
                    const serviceType = db.serviceTypes.find(
                      (st) => st.id === service.serviceTypeId
                    );
                    return (
                      <span
                        key={service.id}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
                      >
                        {serviceType?.name ?? "-"}
                      </span>
                    );
                  })}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
