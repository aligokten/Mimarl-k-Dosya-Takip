import { Link } from "react-router-dom";
import { useDb } from "../store";
import { cardCls, primaryBtnCls, thCls } from "../ui";

export default function Clients() {
  const db = useDb();
  const clients = [...db.clients].sort((a, b) =>
    a.name.localeCompare(b.name, "tr")
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Müşteriler</h1>
          <p className="mt-1 text-sm text-slate-500">Kayıtlı müşteri listesi.</p>
        </div>
        <Link to="/musteriler/yeni" className={primaryBtnCls}>
          Yeni Müşteri
        </Link>
      </div>

      <div className={`${cardCls} overflow-hidden`}>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className={thCls}>Ad Soyad / Unvan</th>
              <th className={thCls}>Telefon</th>
              <th className={thCls}>E-posta</th>
              <th className={thCls}>Proje Sayısı</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clients.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-sm text-slate-500"
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
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    <Link
                      to={`/musteriler/${client.id}`}
                      className="hover:underline"
                    >
                      {client.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {client.phone || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {client.email || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
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
