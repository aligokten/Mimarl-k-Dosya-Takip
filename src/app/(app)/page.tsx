import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export default async function DashboardPage() {
  const [
    activeProjectCount,
    completedProjectCount,
    totalDocumentCount,
    recentProjects,
    upcomingServices,
  ] = await Promise.all([
    prisma.project.count({ where: { status: "DEVAM_EDIYOR" } }),
    prisma.project.count({ where: { status: "TAMAMLANDI" } }),
    prisma.document.count(),
    prisma.project.findMany({
      take: 6,
      orderBy: { updatedAt: "desc" },
      include: { client: true },
    }),
    prisma.projectService.findMany({
      where: {
        status: "DEVAM_EDIYOR",
        targetDate: { not: null },
      },
      take: 6,
      orderBy: { targetDate: "asc" },
      include: { project: true, serviceType: true },
    }),
  ]);

  const stats = [
    { label: "Devam Eden Proje", value: activeProjectCount },
    { label: "Tamamlanan Proje", value: completedProjectCount },
    { label: "Kayıtlı Evrak", value: totalDocumentCount },
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
          <div
            key={stat.label}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Son Güncellenen Projeler
            </h2>
            <Link
              href="/projeler"
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
            {recentProjects.map((project) => (
              <li key={project.id} className="py-3">
                <Link
                  href={`/projeler/${project.id}`}
                  className="block hover:text-slate-600"
                >
                  <p className="text-sm font-medium text-slate-900">
                    {project.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {project.client.name}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">
            Yaklaşan Hedef Tarihler
          </h2>
          <ul className="mt-4 divide-y divide-slate-100">
            {upcomingServices.length === 0 && (
              <li className="py-4 text-sm text-slate-500">
                Yaklaşan hedef tarih bulunmuyor.
              </li>
            )}
            {upcomingServices.map((service) => (
              <li key={service.id} className="py-3">
                <Link
                  href={`/projeler/${service.projectId}`}
                  className="block hover:text-slate-600"
                >
                  <p className="text-sm font-medium text-slate-900">
                    {service.project.name} — {service.serviceType.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    Hedef:{" "}
                    {service.targetDate
                      ? format(service.targetDate, "d MMMM yyyy", {
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
