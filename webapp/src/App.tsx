import { Link, Navigate, NavLink, Route, Routes } from "react-router-dom";
import clsx from "clsx";
import { useDrive } from "./drive";
import { toggleTheme, useTheme } from "./theme";
import {
  FileIcon,
  FolderIcon,
  GearIcon,
  GridIcon,
  MoonIcon,
  SunIcon,
  UsersIcon,
} from "./components/icons";
import Dashboard from "./pages/Dashboard";
import Contacts from "./pages/Contacts";
import ContactNew from "./pages/ContactNew";
import ContactDetail from "./pages/ContactDetail";
import Projects from "./pages/Projects";
import ProjectNew from "./pages/ProjectNew";
import ProjectDetail from "./pages/ProjectDetail";
import Settings from "./pages/Settings";
import Templates from "./pages/Templates";
import TemplateEditor from "./pages/TemplateEditor";
import TemplateUpload from "./pages/TemplateUpload";

const NAV_ITEMS = [
  { to: "/", label: "Panel", end: true, icon: GridIcon },
  { to: "/projeler", label: "Projeler", end: false, icon: FolderIcon },
  { to: "/kisiler", label: "Kişiler", end: false, icon: UsersIcon },
  { to: "/sablonlar", label: "Şablonlar", end: false, icon: FileIcon },
  { to: "/ayarlar", label: "Ayarlar", end: false, icon: GearIcon },
];

export default function App() {
  const drive = useDrive();
  const theme = useTheme();

  return (
    <div className="min-h-screen px-2 py-3 sm:px-4 sm:py-6">
      <div className="mx-auto max-w-[1240px] rounded-[2rem] bg-white/45 shadow-[0_24px_70px_rgba(15,23,42,0.18)] ring-1 ring-white/60 backdrop-blur-2xl dark:bg-slate-900/55 dark:ring-white/10">
        <header className="no-print flex items-center justify-between gap-2 px-5 pt-5 sm:px-8 sm:pt-6">
          <Link to="/" className="leading-tight">
            <span className="block text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              dosyatakip<span className="text-orange-500">.</span>
            </span>
            <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              mimarlık ofisi
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === "dark" ? "Açık moda geç" : "Koyu moda geç"}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-slate-600 shadow-sm ring-1 ring-white/60 backdrop-blur hover:bg-white dark:bg-slate-800/80 dark:text-amber-300 dark:ring-white/10 dark:hover:bg-slate-700"
            >
              {theme === "dark" ? (
                <SunIcon className="h-4.5 w-4.5" />
              ) : (
                <MoonIcon className="h-4.5 w-4.5" />
              )}
            </button>
            <Link
              to="/ayarlar"
              title={
                drive.connected
                  ? `Google Drive bağlı${drive.email ? `: ${drive.email}` : ""}`
                  : "Google Drive bağlı değil"
              }
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/80 px-3.5 py-2 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-white/60 backdrop-blur hover:bg-white dark:bg-slate-800/80 dark:text-slate-300 dark:ring-white/10 dark:hover:bg-slate-700"
            >
              <span
                className={clsx(
                  "h-2 w-2 rounded-full",
                  drive.connected ? "bg-emerald-500" : "bg-slate-300"
                )}
              />
              Drive
            </Link>
          </div>
        </header>

        {/* Mobil gezinme */}
        <nav className="no-print mt-4 flex gap-1 overflow-x-auto px-4 md:hidden">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  "whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium",
                  isActive
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "bg-white/70 text-slate-600 shadow-sm backdrop-blur dark:bg-slate-800/70 dark:text-slate-300"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex gap-3 px-3 pb-8 pt-5 sm:px-5 md:gap-6 md:pl-4">
          {/* Masaüstü ikon rayı */}
          <aside className="no-print hidden w-20 shrink-0 flex-col items-center gap-3 pt-2 md:flex">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  title={item.label}
                  className="group flex flex-col items-center gap-1"
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={clsx(
                          "flex h-12 w-12 items-center justify-center rounded-full transition",
                          isActive
                            ? "bg-slate-900 text-white shadow-md dark:bg-white dark:text-slate-900"
                            : "bg-white/70 text-slate-500 shadow-sm backdrop-blur group-hover:text-slate-900 dark:bg-slate-800/70 dark:text-slate-400 dark:group-hover:text-white"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span
                        className={clsx(
                          "max-w-[4.5rem] truncate text-center text-[10px] font-medium",
                          isActive
                            ? "text-slate-900 dark:text-white"
                            : "text-slate-500 dark:text-slate-400"
                        )}
                      >
                        {item.label}
                      </span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </aside>

          <main className="min-w-0 flex-1">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/projeler" element={<Projects />} />
              <Route path="/projeler/yeni" element={<ProjectNew />} />
              <Route path="/projeler/:id" element={<ProjectDetail />} />
              <Route path="/kisiler" element={<Contacts />} />
              <Route path="/kisiler/yeni" element={<ContactNew />} />
              <Route path="/kisiler/:id" element={<ContactDetail />} />
              <Route
                path="/musteriler/*"
                element={<Navigate to="/kisiler" replace />}
              />
              <Route
                path="/arsa-sahipleri/*"
                element={<Navigate to="/kisiler" replace />}
              />
              <Route path="/sablonlar" element={<Templates />} />
              <Route path="/sablonlar/yukle" element={<TemplateUpload />} />
              <Route path="/sablonlar/:id" element={<TemplateEditor />} />
              <Route path="/ayarlar" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </div>
      <p className="no-print mx-auto mt-3 hidden max-w-[1240px] px-4 text-center text-[11px] text-slate-500/70 sm:block dark:text-slate-400/60">
        Veriler tarayıcınızda saklanır; Drive bağlıyken otomatik yedeklenir.
      </p>
    </div>
  );
}
