import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  addDays,
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { tr } from "date-fns/locale";
import clsx from "clsx";
import { useApp } from "../data";
import { useDrive } from "../drive";
import { cardCls } from "../ui";
import {
  CalendarIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloudIcon,
  FolderIcon,
} from "../components/icons";
import type { AppState } from "../data";

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
  { status: "DURDURULDU" as const, label: "Durduruldu", color: "#94a3b8" },
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
        stroke="var(--donut-track)"
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

interface DayEvent {
  projectId: string;
  projectName: string;
  serviceName: string;
  date: string;
}

function collectEvents(db: AppState): Map<string, DayEvent[]> {
  const map = new Map<string, DayEvent[]>();
  for (const project of db.projects) {
    for (const service of project.services) {
      if (!service.targetDate) continue;
      const serviceType = db.serviceTypes.find(
        (st) => st.id === service.serviceTypeId
      );
      const list = map.get(service.targetDate) ?? [];
      list.push({
        projectId: project.id,
        projectName: project.name,
        serviceName: serviceType?.name ?? "-",
        date: service.targetDate,
      });
      map.set(service.targetDate, list);
    }
  }
  return map;
}

function CalendarCard({ db }: { db: AppState }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<string | null>(null);
  const events = useMemo(() => collectEvents(db), [db]);
  const today = new Date();

  const gridStart = startOfWeek(month, { weekStartsOn: 1 });
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const selectedEvents = selected ? (events.get(selected) ?? []) : [];

  return (
    <div className={`${cardCls} p-5`}>
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white">
            <CalendarIcon className="h-4 w-4" />
          </span>
          Takvim
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMonth((m) => addMonths(m, -1))}
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
            title="Önceki ay"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <span className="min-w-[7.5rem] text-center text-sm font-semibold capitalize text-slate-700 dark:text-slate-200">
            {format(month, "LLLL yyyy", { locale: tr })}
          </span>
          <button
            type="button"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
            title="Sonraki ay"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500">
        {["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const hasEvents = events.has(key);
          const isSelected = selected === key;
          const inMonth = isSameMonth(day, month);
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(isSelected ? null : key)}
              className={clsx(
                "relative flex h-9 items-center justify-center rounded-xl text-xs font-medium transition",
                isSelected
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : inMonth
                    ? "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                    : "text-slate-300 dark:text-slate-600",
                isSameDay(day, today) &&
                  !isSelected &&
                  "ring-2 ring-orange-400/70"
              )}
            >
              {format(day, "d")}
              {hasEvents && (
                <span
                  className={clsx(
                    "absolute bottom-1 h-1.5 w-1.5 rounded-full",
                    isSelected ? "bg-orange-300" : "bg-orange-500"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-700">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {format(new Date(selected), "d MMMM yyyy", { locale: tr })}
          </p>
          {selectedEvents.length === 0 && (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Bu günde planlanmış iş yok.
            </p>
          )}
          {selectedEvents.map((event, i) => (
            <Link
              key={i}
              to={`/projeler/${event.projectId}`}
              className="block rounded-xl bg-orange-50 px-3 py-2 text-xs hover:brightness-[0.98] dark:bg-orange-500/15"
            >
              <span className="font-semibold text-slate-900 dark:text-white">
                {event.projectName}
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                {" "}
                — {event.serviceName}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const db = useApp();
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
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {greeting()} — projelerinizi yönetin ve takip edin
        </p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Proje Paneli
        </h1>
      </div>

      {!drive.connected && (
        <div className={`${cardCls} flex flex-wrap items-center gap-3 p-4`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white">
            <CloudIcon className="h-5 w-5" />
          </span>
          <p className="min-w-0 flex-1 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-white">
              Google Drive bağlı değil.
            </span>{" "}
            Dosya yükleme ve otomatik yedekleme için bağlanın.
          </p>
          <Link
            to="/ayarlar"
            className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600 dark:hover:bg-slate-700"
          >
            Ayarlara Git
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Yaklaşan İşler */}
        <div className={`${cardCls} p-5`}>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 text-white">
                <CheckCircleIcon className="h-4 w-4" />
              </span>
              Yaklaşan İşler
            </h2>
            <Link
              to="/projeler/yeni"
              title="Yeni Proje"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600 dark:hover:bg-slate-700"
            >
              +
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {upcoming.length === 0 && (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                Hedef tarihi girilmiş devam eden iş yok. Proje detayındaki
                &quot;Hizmetler ve Aşamalar&quot; sekmesinden hedef tarih
                verebilirsiniz.
              </p>
            )}
            {upcoming.map(({ project, service, serviceType }, idx) => (
              <Link
                key={service.id}
                to={`/projeler/${project.id}`}
                className={clsx(
                  "block rounded-2xl p-4 transition hover:brightness-[0.98]",
                  idx % 2 === 0
                    ? "bg-orange-50 dark:bg-orange-500/15"
                    : "bg-blue-50 dark:bg-blue-500/15"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">
                    <FolderIcon className="h-4 w-4" />
                  </span>
                  <CheckCircleIcon className="h-5 w-5 shrink-0 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                  {project.name}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
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
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 text-white">
                <FolderIcon className="h-4 w-4" />
              </span>
              Projeler Özeti
            </h2>
            <Link
              to="/projeler"
              title="Projelere git"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-600 dark:hover:bg-slate-700"
            >
              ↗
            </Link>
          </div>
          <div className="mt-2 flex flex-col items-center">
            <div className="relative">
              <Donut segments={statusCounts} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  {db.projects.length}
                </span>
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                  proje
                </span>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
              {statusCounts.map((s) => (
                <span
                  key={s.status}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.label}: {s.value}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
              Toplam {documentCount} kayıtlı evrak · {db.contacts.length}{" "}
              kişi
            </p>
          </div>
        </div>

        {/* Takvim */}
        <CalendarCard db={db} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Hizmet Dağılımı */}
        <div className={`${cardCls} p-5`}>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Hizmet Dağılımı
          </h2>
          {serviceDistribution.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Henüz projelere hizmet eklenmemiş.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {serviceDistribution.map((service, idx) => (
                <div key={service.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      {service.name}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {service.count} proje
                    </span>
                  </div>
                  <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
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

        {/* Son Projeler */}
        <div className={`${cardCls} p-5`}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Son Projeler
            </h2>
            <Link
              to="/projeler"
              className="text-xs font-medium text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
            >
              Tümünü Gör
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-700">
            {recentProjects.length === 0 && (
              <li className="py-4 text-sm text-slate-500 dark:text-slate-400">
                Henüz proje eklenmemiş.
              </li>
            )}
            {recentProjects.map((project) => {
              const client = db.contacts.find(
                (c) => c.id === project.clientId
              );
              return (
                <li key={project.id}>
                  <Link
                    to={`/projeler/${project.id}`}
                    className="block rounded-xl px-2 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/60"
                  >
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {project.name}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {client?.name ?? "-"}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
