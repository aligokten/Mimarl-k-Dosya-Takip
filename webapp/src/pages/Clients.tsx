import { Link } from "react-router-dom";
import { useDb } from "../store";
import { cardCls, primaryBtnCls, thCls } from "../ui";
import PageTitle from "../components/PageTitle";
import { UsersIcon } from "../components/icons";

export default function Clients() {
  const db = useDb();
  const clients = [...db.clients].sort((a, b) =>
    a.name.localeCompare(b.name, "tr")
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageTitle icon={<UsersIcon className="h-5 w-5" />} title="Müşteriler" subtitle="Kayıtlı müşteri listesi." />
        <Link to="/musteriler/yeni" className={primaryBtnCls}>
          Yeni Müşteri
        </Link>
      </div>

      <div className={`${cardCls} overflow-hidden`}>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50 dark:bg-slate-800/60">
            <tr>
              <th className={thCls}>Ad Soyad / Unvan</th>
              <th className={thCls}>Telefon</th>
              <th className={thCls}>E-posta</th>
              <th className={thCls}>Proje Sayısı</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {clients.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400"
                >
                  Henüz müşteri eklenmemiş.
                </td>
              </tr>
            )}
            {clients.map((client) => {
              const projectCount = db.projects.filter(
                (p) => p.clientId === client.id
              ).length;
              return (
                <tr key={client.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                    <Link
                      to={`/musteriler/${client.id}`}
                      className="hover:underline"
                    >
                      {client.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    {client.phone || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    {client.email || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    {projectCount}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
