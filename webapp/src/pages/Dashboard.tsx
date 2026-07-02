import { Link } from "react-router-dom";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useDb } from "../store";
import { useDrive } from "../drive";
import { cardCls } from "../ui";
import {
  CheckCircleIcon,
  CloudIcon,
  FolderIcon,
} from "../components/icons";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "İyi geceler";
  if (hour < 12) return "Günaydın";
  if (hour < 18) return "İyi günler";
  return "İyi akşamlar";
}

const STATUS_SEGMENTS = [
  { status: "DEVAM_EDIYOR" as const, label: "Devam Ediyor", color: "#f97316" },
  { status: "TAMAMLANDI" as const, label: "Tamamlandı", color: "#3b82f6" },
  { status: "DURDURULDU" as const, label: "Durduruldu", color: "#cbd5e1" },
];

function Donut({
  segments,
}: {
  segments: { value: number; color: string }[];
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const R = 40;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <svg viewBox="0 0 100 100" className="h-36 w-36 -rotate-90">
      <circle
        cx="50"
        cy="50"
        r={R}
        fill="none"
        stroke="#e9edf2"
        strokeWidth="13"
      />
      {total > 0 &&
        segments.map((segment, i) => {
          if (segment.value === 0) return null;
          const length = (segment.value / total) * C;
          const el = (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke={segment.color}
              strokeWidth="13"
              strokeDasharray={`${Math.max(length - 1.5, 0.5)} ${C}`}
              strokeDashoffset={-offset}
            />
          );
          offset += length;
          return el;
        })}
    </svg>
  );
}

export default function Dashboard() {
  const db = useDb();
  const drive = useDrive();

  const statusCounts = STATUS_SEGMENTS.map((s) => ({
    ...s,
    value: db.projects.filter((p) => p.status === s.status).length,
  }));
  const documentCount = db.projects.reduce(
    (sum, p) => sum + p.documents.length,
    0
  );

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
    .slice(0, 4);

  const recentProjects = [...db.projects]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);

  const serviceDistribution = db.serviceTypes
    .map((st) => ({
      name: st.name,
      count: db.projects.reduce(
        (sum, p) =>
          sum + p.services.filter((s) => s.serviceTypeId === st.id).length,
        0
      ),
    }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count);
  const maxServiceCount = Math.max(
    1,
    ...serviceDistribution.map((s) => s.count)
  );
  const BAR_COLORS = [
    "bg-violet-600",
    "bg-orange-500",
    "bg-blue-500",
    "bg-emerald-500",
    "bg-rose-500",
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-slate-500">
          {greeting()} — projelerinizi yönetin ve takip edin
        </p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Proje Paneli
        </h1>
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
            className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
          >
            Ayarlara Git
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Yaklaşan İşler */}
        <div className={`${cardCls} p-5`}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Yaklaşan İşler
            </h2>
            <Link
              to="/projeler/yeni"
              title="Yeni Proje"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
            >
              +
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {upcoming.length === 0 && (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                Hedef tarihi girilmiş devam eden iş yok. Proje detayındaki
                &quot;Hizmetler ve Aşamalar&quot; sekmesinden hedef tarih
                verebilirsiniz.
              </p>
            )}
            {upcoming.map(({ project, service, serviceType }, idx) => (
              <Link
                key={service.id}
                to={`/projeler/${project.id}`}
                className={`block rounded-2xl p-4 transition hover:brightness-[0.98] ${
                  idx % 2 === 0 ? "bg-orange-50" : "bg-blue-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm">
                    <FolderIcon className="h-4 w-4" />
                  </span>
                  <CheckCircleIcon className="h-5 w-5 shrink-0 text-slate-300" />
                </div>
                <p className="mt-2 text-sm font-bold text-slate-900">
                  {project.name}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {serviceType?.name ?? "-"} · Hedef:{" "}
                  {service.targetDate
                    ? format(new Date(service.targetDate), "d MMMM yyyy", {
                        locale: tr,
                      })
                    : "-"}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* Projeler Özeti (donut) */}
        <div className={`${cardCls} p-5`}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Projeler Özeti
            </h2>
            <Link
              to="/projeler"
              title="Projelere git"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
            >
              ↗
            </Link>
          </div>
          <div className="mt-2 flex flex-col items-center">
            <div className="relative">
              <Donut segments={statusCounts} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-slate-900">
                  {db.projects.length}
                </span>
                <span className="text-[10px] font-medium text-slate-400">
                  proje
                </span>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
              {statusCounts.map((s) => (
                <span
                  key={s.status}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.label}: {s.value}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Toplam {documentCount} kayıtlı evrak · {db.clients.length}{" "}
              müşteri
            </p>
          </div>
        </div>

        {/* Son Güncellenen Projeler */}
        <div className={`${cardCls} p-5`}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Son Projeler
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
              const client = db.clients.find(
                (c) => c.id === project.clientId
              );
              return (
                <li key={project.id}>
                  <Link
                    to={`/projeler/${project.id}`}
                    className="block rounded-xl px-2 py-2.5 hover:bg-slate-50"
                  >
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {project.name}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {client?.name ?? "-"}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Hizmet Dağılımı */}
      <div className={`${cardCls} p-5`}>
        <h2 className="text-base font-bold text-slate-900">
          Hizmet Dağılımı
        </h2>
        {serviceDistribution.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Henüz projelere hizmet eklenmemiş.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {serviceDistribution.map((service, idx) => (
              <div key={service.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-600">
                    {service.name}
                  </span>
                  <span className="font-bold text-slate-900">
                    {service.count} proje
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${BAR_COLORS[idx % BAR_COLORS.length]}`}
                    style={{
                      width: `${Math.max((service.count / maxServiceCount) * 100, 6)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
