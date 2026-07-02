import { Link, NavLink, Route, Routes } from "react-router-dom";
import clsx from "clsx";
import { useDrive } from "./drive";
import {
  FileIcon,
  FolderIcon,
  GearIcon,
  GridIcon,
  HomeIcon,
  UsersIcon,
} from "./components/icons";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import LandOwners from "./pages/LandOwners";
import LandOwnerDetail from "./pages/LandOwnerDetail";
import Projects from "./pages/Projects";
import ProjectNew from "./pages/ProjectNew";
import ProjectDetail from "./pages/ProjectDetail";
import ClientNew from "./pages/ClientNew";
import LandOwnerNew from "./pages/LandOwnerNew";
import Settings from "./pages/Settings";

const NAV_ITEMS = [
  { to: "/", label: "Panel", end: true, icon: GridIcon },
  { to: "/projeler", label: "Projeler", end: false, icon: FolderIcon },
  { to: "/musteriler", label: "Müşteriler", end: false, icon: UsersIcon },
  {
    to: "/arsa-sahipleri",
    label: "Arsa Sahipleri",
    end: false,
    icon: HomeIcon,
  },
  { to: "/ayarlar", label: "Ayarlar", end: false, icon: GearIcon },
];

export default function App() {
  const drive = useDrive();

  return (
    <div className="min-h-screen px-2 py-3 sm:px-4 sm:py-6">
      <div className="mx-auto max-w-[1240px] rounded-[2rem] bg-[#f4f5f7]/95 shadow-[0_24px_70px_rgba(15,23,42,0.18)] ring-1 ring-white/70 backdrop-blur">
        <header className="flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-6">
          <Link to="/" className="leading-tight">
            <span className="block text-xl font-extrabold tracking-tight text-slate-900">
              dosyatakip<span className="text-orange-500">.</span>
            </span>
            <span className="block text-[11px] font-medium text-slate-400">
              mimarlık ofisi
            </span>
          </Link>
          <Link
            to="/ayarlar"
            title={
              drive.connected
                ? `Google Drive bağlı${drive.email ? `: ${drive.email}` : ""}`
                : "Google Drive bağlı değil"
            }
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <span
              className={clsx(
                "h-2 w-2 rounded-full",
                drive.connected ? "bg-emerald-500" : "bg-slate-300"
              )}
            />
            Drive
          </Link>
        </header>

        {/* Mobil gezinme */}
        <nav className="mt-4 flex gap-1 overflow-x-auto px-4 md:hidden">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  "whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium",
                  isActive
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 shadow-sm"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex gap-3 px-3 pb-8 pt-5 sm:px-5 md:gap-6 md:pl-4">
          {/* Masaüstü ikon rayı */}
          <aside className="hidden w-20 shrink-0 flex-col items-center gap-3 pt-2 md:flex">
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
                            ? "bg-slate-900 text-white shadow-md"
                            : "bg-white text-slate-500 shadow-sm group-hover:text-slate-900"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span
                        className={clsx(
                          "max-w-[4.5rem] truncate text-center text-[10px] font-medium",
                          isActive ? "text-slate-900" : "text-slate-400"
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
              <Route path="/musteriler" element={<Clients />} />
              <Route path="/musteriler/yeni" element={<ClientNew />} />
              <Route path="/musteriler/:id" element={<ClientDetail />} />
              <Route path="/arsa-sahipleri" element={<LandOwners />} />
              <Route path="/arsa-sahipleri/yeni" element={<LandOwnerNew />} />
              <Route
                path="/arsa-sahipleri/:id"
                element={<LandOwnerDetail />}
              />
              <Route path="/ayarlar" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </div>
      <p className="mx-auto mt-3 hidden max-w-[1240px] px-4 text-center text-[11px] text-slate-500/70 sm:block">
        <FileIcon className="mr-1 inline h-3 w-3" />
        Veriler tarayıcınızda saklanır; Drive bağlıyken otomatik yedeklenir.
      </p>
    </div>
  );
}
