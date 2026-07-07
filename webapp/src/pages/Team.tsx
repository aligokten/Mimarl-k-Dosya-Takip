import { useState } from "react";
import { Navigate } from "react-router-dom";
import {
  createInvite,
  deleteInvite,
  removeMember,
  setMemberRole,
  useApp,
} from "../data";
import { cardCls, inputCls, labelCls, primaryBtnCls, secondaryBtnCls } from "../ui";
import PageTitle from "../components/PageTitle";
import { UsersIcon } from "../components/icons";
import { MAX_MEMBERS, MEMBER_ROLE_LABELS, type MemberRole } from "../types";
import { Avatar } from "../App";

function randomPassword(): string {
  // Okunaklı, 8 karakterlik geçici şifre.
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 8; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function Team() {
  const app = useApp();
  const me = app.me!;

  if (me.role !== "ADMIN") {
    return <Navigate to="/profil" replace />;
  }

  const members = [...app.members]
    .filter((m) => m && m.uid && m.email)
    .sort((a, b) =>
      String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? ""))
    );

  const invites = [...app.invites]
    .filter((i) => i && i.email)
    .sort((a, b) =>
      String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? ""))
    );

  const total = members.length + invites.length;

  return (
    <div className="max-w-3xl space-y-6">
      <PageTitle
        icon={<UsersIcon className="h-5 w-5" />}
        title="Ekip Yönetimi"
        subtitle={`Ofisinizde ${total}/${MAX_MEMBERS} kullanıcı (üye + bekleyen).`}
      />

      <AddEmployee full={total >= MAX_MEMBERS} />

      {invites.length > 0 && (
        <section className={`${cardCls} overflow-hidden`}>
          <div className="border-b border-slate-100 px-6 py-4 dark:border-zinc-700">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Bekleyen Davetler
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Bu kişiler henüz ilk girişini yapmadı. Geçici şifreyi kendilerine
              iletin.
            </p>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-zinc-700">
            {invites.map((inv) => (
              <li
                key={inv.email}
                className="flex flex-wrap items-center gap-3 px-6 py-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {inv.displayName || inv.email.split("@")[0]}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {inv.email}
                  </p>
                </div>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-700 dark:bg-zinc-700 dark:text-slate-200">
                  Geçici şifre: {inv.tempPassword}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-zinc-700 dark:text-slate-300">
                  {MEMBER_ROLE_LABELS[inv.role] ?? inv.role ?? "Rol"}
                </span>
                <button
                  onClick={() => {
                    if (window.confirm(`${inv.email} daveti silinsin mi?`))
                      deleteInvite(inv.email);
                  }}
                  className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  İptal
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={`${cardCls} overflow-hidden`}>
        <div className="border-b border-slate-100 px-6 py-4 dark:border-zinc-700">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Üyeler
          </h2>
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-zinc-700">
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
                    : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-zinc-700 dark:text-slate-300"
                }
              >
                {MEMBER_ROLE_LABELS[m.role] ?? m.role ?? "Rol"}
              </span>
              {m.uid !== me.uid && (
                <div className="flex items-center gap-1.5">
                  <select
                    value={m.role}
                    onChange={(e) =>
                      setMemberRole(m.uid, e.target.value as MemberRole)
                    }
                    title="Rolü değiştir"
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-600 dark:bg-zinc-800 dark:text-slate-100"
                  >
                    <option value="STAFF">Çalışan</option>
                    <option value="STAJYER">Stajyer</option>
                    <option value="ADMIN">Yönetici</option>
                  </select>
                  <button
                    onClick={() => {
                      if (
                        window.confirm(`${m.displayName} ofisten çıkarılsın mı?`)
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

function AddEmployee({ full }: { full: boolean }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [tempPassword, setTempPassword] = useState(randomPassword());
  const [role, setRole] = useState<MemberRole>("STAFF");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null
  );

  return (
    <section className={`${cardCls} p-6`}>
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
        Çalışan Ekle
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Çalışanın <strong>Gmail adresini</strong> ve bir <strong>geçici
        şifre</strong> girin. Bu bilgileri çalışana iletin; ilk girişte kendi
        şifresini belirleyecek.
      </p>
      {full && (
        <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
          Kullanıcı sınırına ulaştınız. Yeni ekleme için önce bir üye/davet
          çıkarın.
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          setResult(null);
          createInvite(email, tempPassword, role, name)
            .then((r) => {
              setResult(r);
              if (!r.ok) {
                alert(r.message);
              }
              if (r.ok) {
                alert(r.message);
                setEmail("");
                setName("");
                setTempPassword(randomPassword());
              }
            })
            .catch((err) => {
              console.error("Çalışan ekleme hatası:", err);
              const message =
                err?.message ||
                "Çalışan eklenemedi. Firestore izinlerini ve bağlantıyı kontrol edin.";
              alert(message);
              setResult({
                ok: false,
                message,
              });
            })
            .finally(() => setBusy(false));
        }}
        className="mt-4 space-y-3"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>E-posta (Gmail)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="calisan@gmail.com"
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Ad Soyad (isteğe bağlı)</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ör: Ayşe Yılmaz"
              className={inputCls}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Geçici Şifre</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-600 dark:bg-zinc-800 dark:text-slate-100"
                required
              />
              <button
                type="button"
                onClick={() => setTempPassword(randomPassword())}
                className={secondaryBtnCls}
              >
                Yenile
              </button>
            </div>
          </div>
          <div>
            <label className={labelCls}>Rol</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as MemberRole)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-600 dark:bg-zinc-800 dark:text-slate-100"
            >
              <option value="STAFF">Çalışan</option>
              <option value="STAJYER">Stajyer</option>
              <option value="ADMIN">Yönetici</option>
            </select>
          </div>
        </div>
        {result && (
          <p
            className={
              result.ok
                ? "text-sm text-green-700 dark:text-green-300"
                : "text-sm text-red-600 dark:text-red-400"
            }
          >
            {result.message}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || full}
          className={`${primaryBtnCls} disabled:opacity-50`}
        >
          {busy ? "Ekleniyor..." : "Çalışanı Ekle"}
        </button>
      </form>
    </section>
  );
}
