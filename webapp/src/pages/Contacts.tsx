import { Link } from "react-router-dom";
import { useApp } from "../data";
import { cardCls, primaryBtnCls } from "../ui";
import PageTitle from "../components/PageTitle";
import { UsersIcon, ChevronRightIcon } from "../components/icons";
import {
  CONTACT_ROLE_CHIP,
  CONTACT_ROLE_LABELS,
  type Contact,
} from "../types";

export default function Contacts() {
  const db = useApp();
  const contacts = [...db.contacts].sort((a, b) =>
    a.name.localeCompare(b.name, "tr")
  );

  const projectCountFor = (c: Contact) =>
    db.projects.filter(
      (p) =>
        p.clientId === c.id ||
        p.landOwnerId === c.id ||
        p.contractorId === c.id
    ).length;

  const maxProjects = Math.max(1, ...contacts.map(projectCountFor));

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

      {contacts.length === 0 ? (
        <div
          className={`${cardCls} p-8 text-center text-sm text-slate-500 dark:text-slate-400`}
        >
          Henüz kişi eklenmemiş. &quot;+ Yeni Kişi&quot; ile başlayın.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {contacts.map((contact) => (
            <ContactWidget
              key={contact.id}
              contact={contact}
              projectCount={projectCountFor(contact)}
              maxProjects={maxProjects}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase("tr");
  return (parts[0][0] + parts[parts.length - 1][0]).toLocaleUpperCase("tr");
}

function ContactWidget({
  contact,
  projectCount,
  maxProjects,
}: {
  contact: Contact;
  projectCount: number;
  maxProjects: number;
}) {
  const primaryRole = contact.roles[0];
  const pct = Math.round((projectCount / maxProjects) * 100);

  return (
    <Link
      to={`/kisiler/${contact.id}`}
      className={`${cardCls} group flex flex-col p-5 transition hover:border-slate-300 hover:shadow-md dark:hover:border-slate-500`}
    >
      {/* Üst: avatar + ad/unvan + detay oku */}
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-sm font-bold text-white shadow-sm dark:from-slate-500 dark:to-slate-700">
          {initialsOf(contact.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
            {contact.name}
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {primaryRole ? CONTACT_ROLE_LABELS[primaryRole] : "Kişi"}
          </p>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition group-hover:bg-orange-500 group-hover:text-white dark:bg-zinc-700 dark:text-slate-300">
          <ChevronRightIcon className="h-4 w-4" />
        </span>
      </div>

      {/* Roller */}
      <div className="mt-3 flex flex-wrap gap-1">
        {contact.roles.map((role) => (
          <span
            key={role}
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${CONTACT_ROLE_CHIP[role]}`}
          >
            {CONTACT_ROLE_LABELS[role]}
          </span>
        ))}
      </div>

      {/* Proje katılımı çubuğu */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-slate-500 dark:text-slate-400">
            Projeler
          </span>
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {projectCount}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
            style={{ width: `${projectCount > 0 ? Math.max(pct, 6) : 0}%` }}
          />
        </div>
      </div>

      {/* Alt bilgi: telefon + vekaletname */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-zinc-700 dark:text-slate-400">
        <span className="inline-flex items-center gap-1">
          <span className="font-medium text-slate-400 dark:text-slate-500">
            Tel:
          </span>
          {contact.phone || "-"}
        </span>
        {contact.poaNo && (
          <span className="inline-flex items-center gap-1">
            <span className="font-medium text-slate-400 dark:text-slate-500">
              Vekâletname:
            </span>
            {contact.poaNo}
          </span>
        )}
      </div>
    </Link>
  );
}
