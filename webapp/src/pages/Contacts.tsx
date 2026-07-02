import { Link } from "react-router-dom";
import { useDb } from "../store";
import { cardCls, primaryBtnCls, thCls } from "../ui";
import PageTitle from "../components/PageTitle";
import { UsersIcon } from "../components/icons";
import { CONTACT_ROLE_CHIP, CONTACT_ROLE_LABELS } from "../types";

export default function Contacts() {
  const db = useDb();
  const contacts = [...db.contacts].sort((a, b) =>
    a.name.localeCompare(b.name, "tr")
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle
          icon={<UsersIcon className="h-5 w-5" />}
          title="Kişiler"
          subtitle="Müşteriler, arsa sahipleri ve müteahhitler."
        />
        <Link to="/kisiler/yeni" className={primaryBtnCls}>
          + Yeni Kişi
        </Link>
      </div>

      <div className={`${cardCls} overflow-hidden`}>
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-600">
          <thead className="bg-slate-50 dark:bg-slate-800/60">
            <tr>
              <th className={thCls}>Ad Soyad / Unvan</th>
              <th className={thCls}>Roller</th>
              <th className={thCls}>Telefon</th>
              <th className={thCls}>Vekaletname</th>
              <th className={thCls}>Proje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {contacts.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400"
                >
                  Henüz kişi eklenmemiş.
                </td>
              </tr>
            )}
            {contacts.map((contact) => {
              const projectCount = db.projects.filter(
                (p) =>
                  p.clientId === contact.id ||
                  p.landOwnerId === contact.id ||
                  p.contractorId === contact.id
              ).length;
              return (
                <tr
                  key={contact.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/60"
                >
                  <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                    <Link
                      to={`/kisiler/${contact.id}`}
                      className="hover:underline"
                    >
                      {contact.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex flex-wrap gap-1">
                      {contact.roles.map((role) => (
                        <span
                          key={role}
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${CONTACT_ROLE_CHIP[role]}`}
                        >
                          {CONTACT_ROLE_LABELS[role]}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    {contact.phone || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    {contact.poaNo || "-"}
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
