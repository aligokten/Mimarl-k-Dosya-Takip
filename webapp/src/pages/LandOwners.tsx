import { Link } from "react-router-dom";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useDb } from "../store";
import { cardCls, primaryBtnCls, thCls } from "../ui";
import PageTitle from "../components/PageTitle";
import { HomeIcon } from "../components/icons";

export default function LandOwners() {
  const db = useDb();
  const landOwners = [...db.landOwners].sort((a, b) =>
    a.name.localeCompare(b.name, "tr")
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageTitle icon={<HomeIcon className="h-5 w-5" />} title="Arsa Sahipleri" subtitle="Vekaletname alınan arsa sahipleri." />
        <Link to="/arsa-sahipleri/yeni" className={primaryBtnCls}>
          Yeni Arsa Sahibi
        </Link>
      </div>

      <div className={`${cardCls} overflow-hidden`}>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50 dark:bg-slate-800/60">
            <tr>
              <th className={thCls}>Ad Soyad</th>
              <th className={thCls}>Telefon</th>
              <th className={thCls}>Vekaletname No</th>
              <th className={thCls}>Vekaletname Tarihi</th>
              <th className={thCls}>Proje Sayısı</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {landOwners.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400"
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
                  <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                    <Link
                      to={`/arsa-sahipleri/${owner.id}`}
                      className="hover:underline"
                    >
                      {owner.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    {owner.phone || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    {owner.poaNo || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    {owner.poaDate
                      ? format(new Date(owner.poaDate), "d MMMM yyyy", {
                          locale: tr,
                        })
                      : "-"}
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
