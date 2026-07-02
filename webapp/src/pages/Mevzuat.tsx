import { useState } from "react";
import { MEVZUAT, type MevzuatItem } from "../mevzuat";
import { cardCls } from "../ui";
import PageTitle from "../components/PageTitle";
import { ScaleIcon, SearchIcon } from "../components/icons";

export default function Mevzuat() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLocaleLowerCase("tr");

  const groups = MEVZUAT.map((g) => ({
    ...g,
    items: g.items.filter((it) => {
      if (!q) return true;
      return (
        it.title.toLocaleLowerCase("tr").includes(q) ||
        it.summary.toLocaleLowerCase("tr").includes(q) ||
        it.keyPoints.some((k) => k.toLocaleLowerCase("tr").includes(q))
      );
    }),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle
          icon={<ScaleIcon className="h-5 w-5" />}
          title="Mevzuat"
          subtitle="İmar Kanunu ve ilgili yönetmeliklere hızlı başvuru."
        />
        <label className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Mevzuatta ara..."
            className="w-48 rounded-full bg-white dark:bg-zinc-800 py-2 pl-9 pr-3 text-sm text-slate-700 dark:text-slate-200 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 sm:w-64"
          />
        </label>
      </div>

      {groups.length === 0 && (
        <div className={`${cardCls} p-8 text-center text-sm text-slate-500 dark:text-slate-400`}>
          Aramanızla eşleşen mevzuat bulunamadı.
        </div>
      )}

      {groups.map((group) => (
        <section key={group.group} className="space-y-3">
          <h2 className="px-1 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {group.group}
          </h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {group.items.map((item) => (
              <MevzuatCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ))}

      <p className="text-xs text-slate-500/80 dark:text-slate-400/80">
        Not: Özetler bilgilendirme amaçlıdır ve mevzuat zaman içinde değişebilir.
        Bağlayıcı metin daima resmi kaynaktır (mevzuat.gov.tr / Resmî Gazete).
      </p>
    </div>
  );
}

function MevzuatCard({ item }: { item: MevzuatItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`${cardCls} flex flex-col p-5`}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-md dark:from-zinc-600 dark:to-zinc-800">
          <ScaleIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={
                item.kind === "Kanun"
                  ? "rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                  : "rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
              }
            >
              {item.kind}
            </span>
          </div>
          <h3 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
            {item.title}
          </h3>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {item.summary}
      </p>

      {open && (
        <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-sm text-slate-600 dark:border-zinc-700 dark:text-slate-300">
          {item.keyPoints.map((kp, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
              <span>{kp}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
        >
          {open ? "Önemli noktaları gizle" : "Önemli noktalar"}
        </button>
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
        >
          Resmi metni aç ↗
        </a>
      </div>
    </div>
  );
}
