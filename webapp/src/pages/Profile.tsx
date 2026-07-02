import { useState } from "react";
import { Link } from "react-router-dom";
import { signOutUser, updateMyProfile, useApp } from "../data";
import { cardCls, inputCls, labelCls, primaryBtnCls } from "../ui";
import PageTitle from "../components/PageTitle";
import { UsersIcon } from "../components/icons";
import { MEMBER_ROLE_LABELS } from "../types";
import { Avatar } from "../App";

export default function Profile() {
  const app = useApp();
  const me = app.me!;
  const [displayName, setDisplayName] = useState(me.displayName ?? "");
  const [phone, setPhone] = useState(me.phone ?? "");
  const [title, setTitle] = useState(me.title ?? "");
  const [saved, setSaved] = useState(false);

  return (
    <div className="max-w-2xl space-y-6">
      <PageTitle
        icon={<UsersIcon className="h-5 w-5" />}
        title="Profilim"
        subtitle="Kişisel bilgilerinizi güncelleyin."
      />

      <div className={`${cardCls} p-6`}>
        <div className="flex items-center gap-3">
          <Avatar member={me} />
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {me.email}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {MEMBER_ROLE_LABELS[me.role]} · {app.office?.name}
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateMyProfile({
              displayName: displayName.trim() || me.email,
              phone: phone.trim() || undefined,
              title: title.trim() || undefined,
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
          }}
          className="mt-5 space-y-4"
        >
          <div>
            <label className={labelCls}>Ad Soyad</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Telefon</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Görev / Unvan</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Örn: Mimar, Teknik Personel"
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" className={primaryBtnCls}>
              Kaydet
            </button>
            {saved && (
              <span className="text-sm text-green-700 dark:text-green-300">
                Kaydedildi ✓
              </span>
            )}
          </div>
        </form>
      </div>

      <div className="flex flex-wrap gap-3">
        {me.role === "ADMIN" && (
          <Link
            to="/ekip"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Ekip Yönetimi →
          </Link>
        )}
        <button
          onClick={() => signOutUser()}
          className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10"
        >
          Çıkış Yap
        </button>
      </div>
    </div>
  );
}
