import { useState } from "react";
import { Link } from "react-router-dom";
import {
  computeLeaveBalance,
  deleteLeaveRequest,
  memberLeaveQuota,
  signOutUser,
  updateMyProfile,
  useApp,
} from "../data";
import { cardCls, inputCls, labelCls, primaryBtnCls, secondaryBtnCls } from "../ui";
import PageTitle from "../components/PageTitle";
import { UsersIcon } from "../components/icons";
import LeaveRequestModal from "../components/LeaveRequestModal";
import {
  LEAVE_KIND_LABELS,
  LEAVE_STATUS_CHIP,
  LEAVE_STATUS_LABELS,
  MEMBER_ROLE_LABELS,
} from "../types";
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

      <MyLeaveCard />

      <div className="flex flex-wrap gap-3">
        {me.role === "ADMIN" && (
          <Link
            to="/ekip"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-zinc-800 dark:text-slate-200 dark:hover:bg-zinc-700"
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

function MyLeaveCard() {
  const app = useApp();
  const me = app.me!;
  const [modalOpen, setModalOpen] = useState(false);

  const quota = memberLeaveQuota(me);
  const { used, remaining } = computeLeaveBalance(app.leaveRequests, me.uid, quota);
  const myRequests = app.leaveRequests.filter((r) => r.memberUid === me.uid);

  return (
    <div className={`${cardCls} p-6`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            İzinlerim
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {new Date().getFullYear()} yılı yıllık izin hakkı: {quota} gün ·
            kullanılan: {used} gün · kalan:{" "}
            <span
              className={
                remaining <= 0
                  ? "font-semibold text-red-600 dark:text-red-400"
                  : remaining <= 3
                    ? "font-semibold text-amber-600 dark:text-amber-400"
                    : "font-semibold text-emerald-600 dark:text-emerald-400"
              }
            >
              {remaining} gün
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className={secondaryBtnCls}
        >
          + Yeni İzin Talebi
        </button>
      </div>

      {myRequests.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400 dark:text-slate-500">
          Henüz izin talebiniz yok.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100 dark:divide-zinc-700">
          {myRequests.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                  {LEAVE_KIND_LABELS[r.kind]} · {r.startDate} → {r.endDate} (
                  {r.days} gün)
                </p>
                {r.status === "REDDEDILDI" && r.decisionNote && (
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    Not: {r.decisionNote}
                  </p>
                )}
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${LEAVE_STATUS_CHIP[r.status]}`}
              >
                {LEAVE_STATUS_LABELS[r.status]}
              </span>
              {r.status === "BEKLIYOR" && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Bu izin talebi iptal edilsin mi?")) {
                      deleteLeaveRequest(r.id);
                    }
                  }}
                  className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  İptal Et
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {modalOpen && (
        <LeaveRequestModal
          memberName={me.displayName || me.email}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
