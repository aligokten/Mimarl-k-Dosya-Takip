import { useState } from "react";
import { Navigate } from "react-router-dom";
import {
  computeLeaveBalance,
  createInvite,
  decideLeaveRequest,
  deleteInvite,
  deleteLeaveRequest,
  memberLeaveQuota,
  removeMember,
  setMemberLeaveQuota,
  setMemberRole,
  updateLeaveRequestDates,
  useApp,
} from "../data";
import { cardCls, inputCls, labelCls, primaryBtnCls, secondaryBtnCls } from "../ui";
import PageTitle from "../components/PageTitle";
import { UsersIcon } from "../components/icons";
import {
  LEAVE_KIND_LABELS,
  LEAVE_STATUS_CHIP,
  LEAVE_STATUS_LABELS,
  MAX_MEMBERS,
  MEMBER_ROLE_LABELS,
  type LeaveRequest,
  type Member,
  type MemberRole,
} from "../types";
import { Avatar } from "../App";





function safeText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function safeCreatedAt(value: unknown): string {
  return safeText(value);
}

function randomPassword(): string {
  // Okunaklı, 8 karakterlik geçici şifre.
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 8; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function officeMemberLimit(office: unknown): number {
  const value = Number((office as { maxMembers?: number } | null)?.maxMembers);

  if (Number.isFinite(value) && value > 0) {
    return value;
  }

  return MAX_MEMBERS;
}

export default function Team() {
  const app = useApp();
  const me = app.me!;
  const [tab, setTab] = useState<"uyeler" | "izinler">("uyeler");

  if (me.role !== "ADMIN") {
    return <Navigate to="/profil" replace />;
  }

  const members = [...app.members].sort((a, b) =>
    safeCreatedAt(a.createdAt).localeCompare(safeCreatedAt(b.createdAt))
  );
  const invites = [...app.invites].sort((a, b) =>
    safeCreatedAt(a.createdAt).localeCompare(safeCreatedAt(b.createdAt))
  );
  const total = members.length + invites.length;
  const limit = officeMemberLimit(app.office);
  const full = total >= limit;
  const pendingLeaveCount = app.leaveRequests.filter(
    (r) => r.status === "BEKLIYOR"
  ).length;

  return (
    <div className="max-w-3xl space-y-6">
      <PageTitle
        icon={<UsersIcon className="h-5 w-5" />}
        title="Ekip Yönetimi"
        subtitle={`Ofisinizde ${total}/${limit} kullanıcı (üye + bekleyen).`}
      />

      <div className="flex gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setTab("uyeler")}
          className={
            tab === "uyeler"
              ? "rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
              : "rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-600 dark:border-slate-600 dark:text-slate-300"
          }
        >
          Üyeler
        </button>
        <button
          type="button"
          onClick={() => setTab("izinler")}
          className={
            tab === "izinler"
              ? "rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
              : "rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-600 dark:border-slate-600 dark:text-slate-300"
          }
        >
          İzin Yönetimi
          {pendingLeaveCount > 0 && (
            <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {pendingLeaveCount}
            </span>
          )}
        </button>
      </div>

      {tab === "izinler" && <LeaveManagementSection members={members} />}

      {tab === "uyeler" && (
        <>
      <AddEmployee full={full} limit={limit} total={total} />

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
                  {MEMBER_ROLE_LABELS[inv.role]}
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
                {MEMBER_ROLE_LABELS[m.role]}
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
        </>
      )}
    </div>
  );
}

function AddEmployee({
  full,
  limit,
  total,
}: {
  full: boolean;
  limit: number;
  total: number;
}) {
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
      <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
        Plan kullanıcı limiti: {total}/{limit}
      </p>
      {full && (
        <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
          Bu planın kullanıcı sınırına ulaştınız. Yeni ekleme için önce bir üye/davet
          çıkarın veya planınızı yükseltin.
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
              if (r.ok) {
                setEmail("");
                setName("");
                setTempPassword(randomPassword());
              }
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

function LeaveManagementSection({ members }: { members: Member[] }) {
  const app = useApp();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const requests = app.leaveRequests;
  const selected = requests.find((r) => r.id === selectedId) ?? null;
  const pending = requests.filter((r) => r.status === "BEKLIYOR");
  const decided = requests.filter((r) => r.status !== "BEKLIYOR");
  // Yöneticilerin izin talebi oluşturma hakkı yok; listede yer almazlar.
  const leaveEligibleMembers = members.filter((m) => m.role !== "ADMIN");

  return (
    <div className="space-y-6">
      <section className={`${cardCls} overflow-hidden`}>
        <div className="border-b border-slate-100 px-6 py-4 dark:border-zinc-700">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Yıllık İzin Hakları
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {new Date().getFullYear()} yılı için kullanılan / kalan izin
            günleri.
          </p>
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-zinc-700">
          {leaveEligibleMembers.length === 0 && (
            <p className="px-6 py-4 text-sm text-slate-400 dark:text-slate-500">
              Kayıt yok.
            </p>
          )}
          {leaveEligibleMembers.map((m) => (
            <MemberQuotaRow key={m.uid} member={m} leaveRequests={requests} />
          ))}
        </ul>
      </section>

      <section className={`${cardCls} overflow-hidden`}>
        <div className="border-b border-slate-100 px-6 py-4 dark:border-zinc-700">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Onay Bekleyen Talepler
            {pending.length > 0 && ` (${pending.length})`}
          </h2>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-zinc-700">
          {pending.length === 0 && (
            <p className="px-6 py-4 text-sm text-slate-400 dark:text-slate-500">
              Bekleyen talep yok.
            </p>
          )}
          {pending.map((r) => (
            <LeaveRequestRow
              key={r.id}
              request={r}
              onClick={() => setSelectedId(r.id)}
            />
          ))}
        </div>
      </section>

      <section className={`${cardCls} overflow-hidden`}>
        <div className="border-b border-slate-100 px-6 py-4 dark:border-zinc-700">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Geçmiş
          </h2>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-zinc-700">
          {decided.length === 0 && (
            <p className="px-6 py-4 text-sm text-slate-400 dark:text-slate-500">
              Henüz sonuçlanmış talep yok.
            </p>
          )}
          {decided.map((r) => (
            <LeaveRequestRow
              key={r.id}
              request={r}
              onClick={() => setSelectedId(r.id)}
            />
          ))}
        </div>
      </section>

      {selected && (
        <LeaveRequestDetailModal
          request={selected}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

function MemberQuotaRow({
  member,
  leaveRequests,
}: {
  member: Member;
  leaveRequests: LeaveRequest[];
}) {
  const quota = memberLeaveQuota(member);
  const [value, setValue] = useState(String(quota));
  const { used, remaining } = computeLeaveBalance(
    leaveRequests,
    member.uid,
    quota
  );

  return (
    <li className="flex flex-wrap items-center gap-3 px-6 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
          {member.displayName}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Kullanılan: {used} gün · Kalan:{" "}
          <span
            className={
              remaining <= 0
                ? "font-semibold text-red-600 dark:text-red-400"
                : "font-semibold text-emerald-600 dark:text-emerald-400"
            }
          >
            {remaining} gün
          </span>
        </p>
      </div>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-600 dark:bg-zinc-800 dark:text-slate-100"
      />
      <button
        type="button"
        onClick={() => {
          const n = Number(value);
          if (Number.isFinite(n) && n >= 0) setMemberLeaveQuota(member.uid, n);
        }}
        className={secondaryBtnCls}
      >
        Kaydet
      </button>
    </li>
  );
}

function LeaveRequestRow({
  request,
  onClick,
}: {
  request: LeaveRequest;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col gap-2 px-6 py-3.5 text-left transition hover:bg-slate-50 dark:hover:bg-zinc-800/60 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
          {request.memberName} · {LEAVE_KIND_LABELS[request.kind]}
        </p>
        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
          {request.startDate} → {request.endDate} ({request.days} gün)
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${LEAVE_STATUS_CHIP[request.status]}`}
        >
          {LEAVE_STATUS_LABELS[request.status]}
        </span>
        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
          Detaylar →
        </span>
      </div>
    </button>
  );
}

function LeaveRequestDetailModal({
  request,
  onClose,
}: {
  request: LeaveRequest;
  onClose: () => void;
}) {
  const [startDate, setStartDate] = useState(request.startDate);
  const [endDate, setEndDate] = useState(request.endDate);
  const [savingDates, setSavingDates] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const datesChanged = startDate !== request.startDate || endDate !== request.endDate;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-3 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className={`${cardCls} w-full max-w-lg`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-zinc-700">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {request.memberName} · {LEAVE_KIND_LABELS[request.kind]}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[75vh] space-y-4 overflow-y-auto p-5">
          <span
            className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${LEAVE_STATUS_CHIP[request.status]}`}
          >
            {LEAVE_STATUS_LABELS[request.status]}
          </span>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Başlangıç Tarihi</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={request.status !== "BEKLIYOR"}
                className={`${inputCls} disabled:opacity-60`}
              />
            </div>
            <div>
              <label className={labelCls}>Bitiş Tarihi</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={request.status !== "BEKLIYOR"}
                className={`${inputCls} disabled:opacity-60`}
              />
            </div>
          </div>
          {request.status === "BEKLIYOR" && datesChanged && (
            <button
              type="button"
              disabled={savingDates}
              onClick={async () => {
                setSavingDates(true);
                try {
                  await updateLeaveRequestDates(request.id, startDate, endDate);
                } finally {
                  setSavingDates(false);
                }
              }}
              className={secondaryBtnCls}
            >
              {savingDates ? "Kaydediliyor..." : "Tarihleri Kaydet"}
            </button>
          )}

          {request.kind === "YILLIK" && request.reason && (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-white">
                Not:
              </span>{" "}
              {request.reason}
            </p>
          )}

          {request.kind === "RAPOR" && (
            <div className="space-y-2 rounded-xl border border-slate-100 p-3 text-sm dark:border-zinc-700">
              {request.reportDiagnosis && (
                <p>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Teşhis / Sebep:
                  </span>{" "}
                  {request.reportDiagnosis}
                </p>
              )}
              {request.reportHospital && (
                <p>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Hastane:
                  </span>{" "}
                  {request.reportHospital}
                </p>
              )}
              {request.reportDoctor && (
                <p>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Doktor:
                  </span>{" "}
                  {request.reportDoctor}
                </p>
              )}
              {request.reportFileUrl ? (
                <a
                  href={request.reportFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
                >
                  Rapor Belgesini Aç →
                </a>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Belge eklenmemiş.
                </p>
              )}
            </div>
          )}

          {request.status !== "BEKLIYOR" && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {request.decidedByName} tarafından{" "}
              {request.decidedAt?.slice(0, 16).replace("T", " ")} tarihinde{" "}
              {request.status === "ONAYLANDI" ? "onaylandı" : "reddedildi"}.
              {request.decisionNote && ` Not: ${request.decisionNote}`}
            </p>
          )}

          {request.status === "BEKLIYOR" && (
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4 dark:border-zinc-700">
              <button
                type="button"
                disabled={deciding}
                onClick={async () => {
                  if (
                    !window.confirm(
                      `${request.memberName} adlı çalışanın izin talebi silinsin mi?`
                    )
                  )
                    return;
                  setDeciding(true);
                  try {
                    await deleteLeaveRequest(request.id);
                    onClose();
                  } finally {
                    setDeciding(false);
                  }
                }}
                className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                Sil
              </button>
              <button
                type="button"
                disabled={deciding}
                onClick={async () => {
                  const note = window.prompt("Red gerekçesi (isteğe bağlı):") ?? undefined;
                  setDeciding(true);
                  try {
                    await decideLeaveRequest(request.id, "REDDEDILDI", note || undefined);
                    onClose();
                  } finally {
                    setDeciding(false);
                  }
                }}
                className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                Reddet
              </button>
              <button
                type="button"
                disabled={deciding}
                onClick={async () => {
                  setDeciding(true);
                  try {
                    await decideLeaveRequest(request.id, "ONAYLANDI");
                    onClose();
                  } finally {
                    setDeciding(false);
                  }
                }}
                className={`${primaryBtnCls} disabled:opacity-60`}
              >
                Onayla
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
