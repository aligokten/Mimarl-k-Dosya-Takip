import { Link, NavLink, Route, Routes } from "react-router-dom";
import clsx from "clsx";
import { useDrive } from "./drive";
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
  { to: "/", label: "Panel", end: true },
  { to: "/projeler", label: "Projeler", end: false },
  { to: "/musteriler", label: "Müşteriler", end: false },
  { to: "/arsa-sahipleri", label: "Arsa Sahipleri", end: false },
  { to: "/ayarlar", label: "Ayarlar", end: false },
];

export default function App() {
  const drive = useDrive();

  return (
    <div className="min-h-screen w-full pb-10">
      <header className="mx-auto max-w-6xl px-3 pt-4 sm:px-6">
        <div className="flex items-center gap-2 rounded-full border border-slate-200/70 bg-white py-2 pl-3 pr-2 shadow-[0_1px_2px_rgba(15,23,42,0.05)] sm:gap-3 sm:pl-4">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-sm font-bold text-white">
              M
            </span>
            <span className="hidden text-sm font-bold text-slate-900 md:block">
              Dosya Takip
            </span>
          </Link>
          <nav className="flex flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  clsx(
                    "rounded-full px-3.5 py-1.5 text-sm font-medium",
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <Link
            to="/ayarlar"
            title={
              drive.connected
                ? `Google Drive bağlı${drive.email ? `: ${drive.email}` : ""}`
                : "Google Drive bağlı değil"
            }
            className="hidden shrink-0 items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 sm:flex"
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

      <main className="mx-auto max-w-6xl px-3 py-6 sm:px-6">
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
          <Route path="/arsa-sahipleri/:id" element={<LandOwnerDetail />} />
          <Route path="/ayarlar" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
