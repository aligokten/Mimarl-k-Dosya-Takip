import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from "@/lib/status-labels";

export default async function ProjelerPage() {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      client: true,
      landOwner: true,
      services: { include: { serviceType: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Projeler</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tüm mimarlık ve ruhsat projeleri.
          </p>
        </div>
        <Link
          href="/projeler/yeni"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Yeni Proje
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {projects.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            Henüz proje eklenmemiş.
          </div>
        )}
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/projeler/${project.id}`}
            className="block rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-300"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {project.name}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {project.client.name}
                  {project.landOwner ? ` · Arsa Sahibi: ${project.landOwner.name}` : ""}
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
                {project.services.map((service) => (
                  <span
                    key={service.id}
                    className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
                  >
                    {service.serviceType.name}
                  </span>
                ))}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
