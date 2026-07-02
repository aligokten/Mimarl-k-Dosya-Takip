import { useState } from "react";
import { Navigate } from "react-router-dom";
import {
  regenerateInvite,
  removeMember,
  setMemberRole,
  useApp,
} from "../data";
import { cardCls, secondaryBtnCls } from "../ui";
import PageTitle from "../components/PageTitle";
import { UsersIcon } from "../components/icons";
import { MAX_MEMBERS, MEMBER_ROLE_LABELS } from "../types";
import { Avatar } from "../App";

export default function Team() {
  const app = useApp();
  const me = app.me!;
  const [copied, setCopied] = useState(false);

  if (me.role !== "ADMIN") {
    return <Navigate to="/profil" replace />;
  }

  const inviteLink = `${location.origin}${location.pathname}#/davet/${app.office?.inviteCode ?? ""}`;
  const members = [...app.members].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  );
  const full = members.length >= MAX_MEMBERS;

  return (
    <div className="max-w-3xl space-y-6">
      <PageTitle
        icon={<UsersIcon className="h-5 w-5" />}
        title="Ekip Yönetimi"
        subtitle={`Ofisinizde ${members.length}/${MAX_MEMBERS} kullanıcı.`}
      />

      <section className={`${cardCls} p-6`}>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          Çalışan Davet Et
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Aşağıdaki daveti çalışanınıza gönderin. Linki açıp kendi Gmail
          hesabıyla giriş yapan kişi ofise katılır.
        </p>
        {full && (
          <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
            Kullanıcı sınırına ulaştınız. Yeni davet için önce bir üyeyi
            çıkarın.
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            readOnly
            value={inviteLink}
            className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-300"
          />
          <button
            onClick={() => {
              navigator.clipboard?.writeText(inviteLink);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className={secondaryBtnCls}
          >
            {copied ? "Kopyalandı ✓" : "Linki Kopyala"}
          </button>
          <button
            onClick={() => {
              if (
                window.confirm(
                  "Yeni davet kodu üretilsin mi? Eski link geçersiz olur."
                )
              ) {
                regenerateInvite();
              }
            }}
            className={secondaryBtnCls}
          >
            Yeni Kod Üret
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          Davet kodu: <strong>{app.office?.inviteCode}</strong>
        </p>
      </section>

      <section className={`${cardCls} overflow-hidden`}>
        <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Üyeler
          </h2>
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {members.map((m) => (
            <li
              key={m.uid}
              className="flex flex-wrap items-center gap-3 px-6 py-4"
            >
              <Avatar member={m} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {m.displayName}
                  {m.uid === me.uid && (
                    <span className="ml-1.5 text-xs font-normal text-slate-400">
                      (siz)
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {m.email}
                  {m.title ? ` · ${m.title}` : ""}
                </p>
              </div>
              <span
                className={
                  m.role === "ADMIN"
                    ? "rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-600 dark:bg-orange-500/15 dark:text-orange-400"
                    : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                }
              >
                {MEMBER_ROLE_LABELS[m.role]}
              </span>
              {m.uid !== me.uid && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      setMemberRole(
                        m.uid,
                        m.role === "ADMIN" ? "STAFF" : "ADMIN"
                      )
                    }
                    className={secondaryBtnCls}
                  >
                    {m.role === "ADMIN" ? "Çalışan yap" : "Yönetici yap"}
                  </button>
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          `${m.displayName} ofisten çıkarılsın mı?`
                        )
                      ) {
                        removeMember(m.uid);
                      }
                    }}
                    className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    Çıkar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
