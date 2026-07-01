import { NavLink, Route, Routes } from "react-router-dom";
import clsx from "clsx";
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
  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-5">
          <p className="text-sm font-semibold text-slate-900">
            Dosya Takip Sistemi
          </p>
          <p className="text-xs text-slate-500">Mimarlık Ofisi</p>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  "block rounded-md px-3 py-2 text-sm font-medium",
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 px-5 py-4">
          <p className="text-xs text-slate-400">
            Veriler bu tarayıcıda saklanır. Düzenli olarak Ayarlar &gt; Yedek
            bölümünden yedek alın.
          </p>
        </div>
      </aside>
      <main className="flex-1 px-6 py-6 md:px-10 md:py-8">
        <div className="mx-auto max-w-6xl">
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
        </div>
      </main>
    </div>
  );
}
