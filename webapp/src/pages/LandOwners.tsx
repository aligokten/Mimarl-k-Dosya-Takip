import { Link } from "react-router-dom";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useDb } from "../store";
import { cardCls, primaryBtnCls, thCls } from "../ui";

export default function LandOwners() {
  const db = useDb();
  const landOwners = [...db.landOwners].sort((a, b) =>
    a.name.localeCompare(b.name, "tr")
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Arsa Sahipleri
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Vekaletname alınan arsa sahipleri.
          </p>
        </div>
        <Link to="/arsa-sahipleri/yeni" className={primaryBtnCls}>
          Yeni Arsa Sahibi
        </Link>
      </div>

      <div className={`${cardCls} overflow-hidden`}>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className={thCls}>Ad Soyad</th>
              <th className={thCls}>Telefon</th>
              <th className={thCls}>Vekaletname No</th>
              <th className={thCls}>Vekaletname Tarihi</th>
              <th className={thCls}>Proje Sayısı</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {landOwners.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-sm text-slate-500"
                >
                  Henüz arsa sahibi eklenmemiş.
                </td>
              </tr>
            )}
            {landOwners.map((owner) => {
              const projectCount = db.projects.filter(
                (p) => p.landOwnerId === owner.id
              ).length;
              return (
                <tr key={owner.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    <Link
                      to={`/arsa-sahipleri/${owner.id}`}
                      className="hover:underline"
                    >
                      {owner.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {owner.phone || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {owner.poaNo || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {owner.poaDate
                      ? format(new Date(owner.poaDate), "d MMMM yyyy", {
                          locale: tr,
                        })
                      : "-"}
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
