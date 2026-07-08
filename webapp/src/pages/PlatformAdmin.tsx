import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { now, useApp } from "../data";
import { cardCls, inputCls, labelCls, primaryBtnCls } from "../ui";

type AccessStatus = "ACTIVE" | "SUSPENDED" | "PAST_DUE" | "CANCELLED";
type PlanCode = "TRIAL" | "STARTER" | "PRO" | "ENTERPRISE";

type OfficeRow = {
  id: string;
  name?: string;
  ownerEmail?: string;
  ownerUid?: string;
  plan?: string;
  maxMembers?: number;
  accessStatus?: string;
  subscriptionStatus?: string;
  accessUntil?: string;
  createdAt?: string;
  updatedAt?: string;
};

type InviteRow = {
  id: string;
  email?: string;
  companyName?: string;
  plan?: string;
  maxMembers?: number;
  accessStatus?: string;
  accessUntil?: string;
  status?: string;
  officeId?: string;
  createdAt?: string;
};

type LeadRow = {
  id: string;
  email?: string;
  companyName?: string;
  contactName?: string;
  phone?: string;
  message?: string;
  source?: string;
  status?: string;
  inviteEmail?: string;
  officeId?: string;
  plan?: string;
  maxMembers?: number;
  accessUntil?: string;
  emailStatus?: string;
  emailError?: string;
  emailSentAt?: string;
  kvkkConsent?: boolean;
  kvkkConsentAt?: string;
  kvkkTextVersion?: string;
  consentSource?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

const STATUS_OPTIONS: AccessStatus[] = [
  "ACTIVE",
  "SUSPENDED",
  "PAST_DUE",
  "CANCELLED",
];

const PLAN_OPTIONS: Array<{
  code: PlanCode;
  label: string;
  maxMembers: number;
  days: number;
}> = [
  { code: "TRIAL", label: "Trial", maxMembers: 10, days: 14 },
  { code: "STARTER", label: "Başlangıç", maxMembers: 3, days: 365 },
  { code: "PRO", label: "Profesyonel", maxMembers: 10, days: 365 },
  { code: "ENTERPRISE", label: "Kurumsal", maxMembers: 20, days: 365 },
];

function planConfig(value?: string) {
  return (
    PLAN_OPTIONS.find((item) => item.code === value) ||
    PLAN_OPTIONS.find((item) => item.code === "PRO")!
  );
}

function planLabel(value?: string) {
  return planConfig(value).label;
}

function defaultAccessUntilForPlan(value?: string) {
  const cfg = planConfig(value);
  return new Date(Date.now() + cfg.days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function planPatch(value: string) {
  const cfg = planConfig(value);

  return {
    plan: cfg.code,
    maxMembers: cfg.maxMembers,
    accessUntil: defaultAccessUntilForPlan(cfg.code),
    updatedAt: now(),
  };
}

function daysUntilAccessEnd(value?: string) {
  if (!value) return null;

  const end = new Date(`${value}T23:59:59`);
  if (Number.isNaN(end.getTime())) return null;

  return Math.ceil((end.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function accessWarningText(value?: string) {
  const days = daysUntilAccessEnd(value);

  if (days === null || days > 7) return "";

  if (days < 0) return "Süre doldu";
  if (days === 0) return "Bugün bitiyor";

  return `${days} gün kaldı`;
}

function accessWarningClass(value?: string) {
  const days = daysUntilAccessEnd(value);

  if (days === null || days > 7) return "";

  if (days <= 0) {
    return "font-extrabold text-red-600 dark:text-red-300";
  }

  return "font-extrabold text-amber-600 dark:text-amber-300";
}

function officeViewHref(officeId?: string) {
  if (!officeId) return "";

  return `${window.location.origin}${window.location.pathname}?platformOfficeId=${encodeURIComponent(
    officeId
  )}#/`;
}

export default function PlatformAdmin() {
  const app = useApp();
  const [offices, setOffices] = useState<OfficeRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [leadNotes, setLeadNotes] = useState<Record<string, string>>({});

  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [plan, setPlan] = useState<PlanCode>("PRO");
  const [maxMembers, setMaxMembers] = useState(
    String(planConfig("PRO").maxMembers)
  );
  const [accessUntil, setAccessUntil] = useState(
    defaultAccessUntilForPlan("PRO")
  );

  const activeOffices = useMemo(
    () =>
      offices
        .slice()
        .sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id)),
    [offices]
  );

  const pendingInvites = useMemo(
    () =>
      invites
        .slice()
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    [invites]
  );

  const recentLeads = useMemo(
    () =>
      leads
        .slice()
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    [leads]
  );

  async function refresh() {
    setLoading(true);

    try {
      const [officeSnap, inviteSnap, leadSnap] = await Promise.all([
        getDocs(collection(db(), "offices")),
        getDocs(collection(db(), "platformInvites")),
        getDocs(collection(db(), "platformLeads")),
      ]);

      setOffices(
        officeSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as object),
        }))
      );

      const inviteRows = inviteSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as object),
      })) as InviteRow[];

      setInvites(inviteRows);

      const inviteByEmail = new Map(
        inviteRows.map((invite) => [
          String(invite.email || invite.id).toLowerCase(),
          invite,
        ])
      );

      const leadRows = leadSnap.docs.map((d) => {
        const lead = {
          id: d.id,
          ...(d.data() as object),
        } as LeadRow;

        const inviteKey = String(lead.inviteEmail || lead.email || "").toLowerCase();
        const invite = inviteByEmail.get(inviteKey);

        return {
          ...lead,
          officeId: lead.officeId || invite?.officeId,
        };
      }) as LeadRow[];

      setLeads(leadRows);
      setLeadNotes((prev) => {
        const next = { ...prev };

        for (const lead of leadRows) {
          if (next[lead.id] === undefined) {
            next[lead.id] = lead.notes || "";
          }
        }

        return next;
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (app.platformAdmin) {
      refresh();
    }
  }, [app.platformAdmin]);

  function handleInvitePlanChange(value: PlanCode) {
    const cfg = planConfig(value);

    setPlan(cfg.code);
    setMaxMembers(String(cfg.maxMembers));
    setAccessUntil(defaultAccessUntilForPlan(cfg.code));
  }

  async function createInvite() {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCompany = companyName.trim();

    if (!cleanEmail || !cleanCompany) {
      alert("E-posta ve firma adı zorunlu.");
      return;
    }

    const cfg = planConfig(plan);

    setSaving(true);

    try {
      await setDoc(
        doc(db(), "platformInvites", cleanEmail),
        {
          email: cleanEmail,
          companyName: cleanCompany,
          plan: cfg.code,
          maxMembers: Number(maxMembers) || cfg.maxMembers,
          accessStatus: "ACTIVE",
          accessUntil,
          status: "ACTIVE",
          createdAt: now(),
          createdBy: app.user?.email || "platform",
        },
        { merge: true }
      );

      setEmail("");
      setCompanyName("");
      setPlan("PRO");
      setMaxMembers(String(planConfig("PRO").maxMembers));
      setAccessUntil(defaultAccessUntilForPlan("PRO"));

      await refresh();
      alert("Müşteri daveti oluşturuldu.");
    } finally {
      setSaving(false);
    }
  }

  async function updateOfficeStatus(officeId: string, accessStatus: AccessStatus) {
    setSaving(true);

    try {
      await updateDoc(doc(db(), "offices", officeId), {
        accessStatus,
        subscriptionStatus: accessStatus,
        updatedAt: now(),
      });

      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function updateInviteStatus(invite: InviteRow, status: string) {
    setSaving(true);

    try {
      await updateDoc(doc(db(), "platformInvites", invite.id), {
        status,
        updatedAt: now(),
      });

      if (invite.officeId) {
        const officeAccessStatus =
          status === "SUSPENDED" || status === "CANCELLED"
            ? status
            : "ACTIVE";

        await updateDoc(doc(db(), "offices", invite.officeId), {
          plan: invite.plan || "TRIAL",
          maxMembers: invite.maxMembers || 10,
          accessUntil: invite.accessUntil || "",
          accessStatus: officeAccessStatus,
          subscriptionStatus: officeAccessStatus,
          updatedAt: now(),
        });
      }

      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function updateLeadStatus(leadId: string, status: string) {
    setSaving(true);

    try {
      await updateDoc(doc(db(), "platformLeads", leadId), {
        status,
        updatedAt: now(),
      });

      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function updateLeadNotes(leadId: string) {
    setSaving(true);

    try {
      await updateDoc(doc(db(), "platformLeads", leadId), {
        notes: leadNotes[leadId] || "",
        updatedAt: now(),
      });

      await refresh();
      alert("Başvuru notu kaydedildi.");
    } finally {
      setSaving(false);
    }
  }

  async function updateLeadPlan(lead: LeadRow, nextPlan: PlanCode) {
    const patch = planPatch(nextPlan);
    const inviteEmail = (lead.inviteEmail || lead.email || "").trim().toLowerCase();

    setSaving(true);

    try {
      await updateDoc(doc(db(), "platformLeads", lead.id), patch);

      if (inviteEmail) {
        const inviteRef = doc(db(), "platformInvites", inviteEmail);

        await setDoc(
          inviteRef,
          {
            ...patch,
            email: inviteEmail,
            companyName: lead.companyName || "",
            contactName: lead.contactName || null,
            phone: lead.phone || null,
            accessStatus: "ACTIVE",
            status: "ACTIVE",
          },
          { merge: true }
        );

        const inviteSnap = await getDoc(inviteRef);
        const officeId = inviteSnap.exists()
          ? (inviteSnap.data() as { officeId?: string }).officeId
          : "";

        if (officeId) {
          await updateDoc(doc(db(), "offices", officeId), {
            ...patch,
            accessStatus: "ACTIVE",
            subscriptionStatus: "ACTIVE",
          });
        }
      }

      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function updateOfficePlan(officeId: string, nextPlan: PlanCode) {
    setSaving(true);

    try {
      await updateDoc(doc(db(), "offices", officeId), planPatch(nextPlan));
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function updateInvitePlan(invite: InviteRow, nextPlan: PlanCode) {
    const patch = planPatch(nextPlan);

    setSaving(true);

    try {
      await updateDoc(doc(db(), "platformInvites", invite.id), patch);

      if (invite.officeId) {
        await updateDoc(doc(db(), "offices", invite.officeId), {
          ...patch,
          accessStatus: "ACTIVE",
          subscriptionStatus: "ACTIVE",
        });
      }

      await refresh();
    } finally {
      setSaving(false);
    }
  }

  if (!app.platformAdmin) {
    return (
      <div className={cardCls}>
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
          Platform Yönetimi
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Bu ekran yalnızca Ruhsat360 platform yöneticileri tarafından
          kullanılabilir.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className={cardCls}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Platform Yönetimi
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Müşteri davetleri, ofis abonelikleri ve erişim durumları.
            </p>
          </div>

          <button
            onClick={refresh}
            disabled={loading}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-60 dark:bg-white dark:text-slate-900"
          >
            {loading ? "Yenileniyor..." : "Yenile"}
          </button>
        </div>
      </div>

      <div className={cardCls}>
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
          Yeni Müşteri Daveti
        </h2>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <label className={labelCls}>Firma Adı</label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Örn: HSH Mimarlık"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Yönetici E-posta</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@firma.com"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Paket</label>
            <select
              value={plan}
              onChange={(e) => handleInvitePlanChange(e.target.value as PlanCode)}
              className={inputCls}
            >
              {PLAN_OPTIONS.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Üye Limiti</label>
            <input
              value={maxMembers}
              onChange={(e) => setMaxMembers(e.target.value)}
              type="number"
              min={1}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Erişim Bitiş Tarihi</label>
            <input
              value={accessUntil}
              onChange={(e) => setAccessUntil(e.target.value)}
              type="date"
              className={inputCls}
            />
          </div>
        </div>

        <button
          onClick={createInvite}
          disabled={saving}
          className={`${primaryBtnCls} mt-4 disabled:opacity-60`}
        >
          {saving ? "Kaydediliyor..." : "Davet Oluştur"}
        </button>
      </div>

      <div className={cardCls}>
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
          Web Başvuruları
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          ruhsat360.com üzerinden gelen demo ve müşteri başvuruları.
        </p>

        <div className="mt-4 grid gap-3">
          {recentLeads.length === 0 && (
            <p className="text-sm text-slate-500">Henüz web başvurusu yok.</p>
          )}

          {recentLeads.map((lead) => (
            <div
              key={lead.id}
              className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-zinc-700 dark:bg-zinc-800/60"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-base font-extrabold text-slate-900 dark:text-white">
                    {lead.companyName || "Firma adı yok"}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {lead.contactName || "Yetkili adı yok"} · {lead.email || "E-posta yok"} · {lead.phone || "Telefon yok"}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Kaynak: {lead.source || "-"} · Durum: {lead.status || "-"} · Bitiş: {lead.accessUntil || "-"}
                    {accessWarningText(lead.accessUntil) && (
                      <>
                        {" "}·{" "}
                        <span className={accessWarningClass(lead.accessUntil)}>
                          {accessWarningText(lead.accessUntil)}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    E-posta: {lead.emailStatus || "-"}
                    {lead.emailSentAt ? ` · Gönderim: ${lead.emailSentAt.slice(0, 16).replace("T", " ")}` : ""}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {["INVITE_CREATED", "CONTACTED", "CUSTOMER", "LOST"].map((status) => (
                    <button
                      key={status}
                      onClick={() => updateLeadStatus(lead.id, status)}
                      disabled={saving}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                        lead.status === status
                          ? "bg-orange-500 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-700 dark:text-slate-200"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 text-xs text-slate-600 dark:bg-zinc-900/60 dark:text-slate-300 md:grid-cols-2">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-100">Plan:</span>{" "}
                  {planLabel(lead.plan)} · {lead.maxMembers || "-"} kullanıcı
                </div>
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-100">Davet e-postası:</span>{" "}
                  {lead.inviteEmail || lead.email || "-"}
                </div>
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-100">Ofis:</span>{" "}
                  {lead.officeId || "-"}
                </div>
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-100">Oluşturulma:</span>{" "}
                  {lead.createdAt ? lead.createdAt.slice(0, 16).replace("T", " ") : "-"}
                </div>
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-100">Güncelleme:</span>{" "}
                  {lead.updatedAt ? lead.updatedAt.slice(0, 16).replace("T", " ") : "-"}
                </div>
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-100">KVKK:</span>{" "}
                  {lead.kvkkConsent ? "Onay alındı" : "Onay yok"}
                  {lead.kvkkConsentAt ? ` · ${lead.kvkkConsentAt.slice(0, 16).replace("T", " ")}` : ""}
                </div>
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-100">Rıza kaynağı:</span>{" "}
                  {lead.consentSource || "-"} {lead.kvkkTextVersion ? `· v${lead.kvkkTextVersion}` : ""}
                </div>
                <div className="md:col-span-2">
                  <span className="font-bold text-slate-800 dark:text-slate-100">Başvuru mesajı:</span>{" "}
                  {lead.message || "-"}
                </div>
                {lead.emailError && (
                  <div className="md:col-span-2 text-red-600 dark:text-red-300">
                    <span className="font-bold">E-posta hatası:</span> {lead.emailError}
                  </div>
                )}
              </div>

              {lead.officeId && (
                <div className="mt-4">
                  <a
                    href={officeViewHref(lead.officeId)}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                  >
                    Ofisi Görüntüle →
                  </a>
                </div>
              )}

              <div className="mt-4">
                <label className={labelCls}>Başvuru Planı</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PLAN_OPTIONS.map((item) => (
                    <button
                      key={item.code}
                      onClick={() => updateLeadPlan(lead, item.code)}
                      disabled={saving}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                        planConfig(lead.plan).code === item.code
                          ? "bg-orange-500 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-700 dark:text-slate-200"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <label className={labelCls}>Platform Notu</label>
                <textarea
                  value={leadNotes[lead.id] || ""}
                  onChange={(e) =>
                    setLeadNotes((prev) => ({
                      ...prev,
                      [lead.id]: e.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Örn: 09.07'de arandı, demo randevusu istiyor."
                  className={`${inputCls} min-h-24`}
                />
                <button
                  onClick={() => updateLeadNotes(lead.id)}
                  disabled={saving}
                  className="mt-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-60 dark:bg-white dark:text-slate-900"
                >
                  Notu Kaydet
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={cardCls}>
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
          Aktif Ofisler
        </h2>

        <div className="mt-4 grid gap-3">
          {activeOffices.length === 0 && (
            <p className="text-sm text-slate-500">Henüz ofis yok.</p>
          )}

          {activeOffices.map((office) => {
            const status =
              office.accessStatus || office.subscriptionStatus || "ACTIVE";

            return (
              <div
                key={office.id}
                className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-zinc-700 dark:bg-zinc-800/60"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-base font-extrabold text-slate-900 dark:text-white">
                      {office.name || office.id}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {office.ownerEmail || "E-posta yok"} · {planLabel(office.plan)} · Üye limiti:{" "}
                      {office.maxMembers || "-"} · Bitiş: {office.accessUntil || "-"}
                      {accessWarningText(office.accessUntil) && (
                        <>
                          {" "}·{" "}
                          <span className={accessWarningClass(office.accessUntil)}>
                            {accessWarningText(office.accessUntil)}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Ofis ID: {office.id}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <a
                      href={officeViewHref(office.id)}
                      target="_blank"
                      rel="noopener"
                      className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                    >
                      Ofisi Görüntüle →
                    </a>

                    {PLAN_OPTIONS.map((item) => (
                      <button
                        key={item.code}
                        onClick={() => updateOfficePlan(office.id, item.code)}
                        disabled={saving}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                          planConfig(office.plan).code === item.code
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-700 dark:text-slate-200"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}

                    {STATUS_OPTIONS.map((item) => (
                      <button
                        key={item}
                        onClick={() => updateOfficeStatus(office.id, item)}
                        disabled={saving}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                          status === item
                            ? "bg-orange-500 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-700 dark:text-slate-200"
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={cardCls}>
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
          Platform Davetleri
        </h2>

        <div className="mt-4 grid gap-3">
          {pendingInvites.length === 0 && (
            <p className="text-sm text-slate-500">Davet kaydı yok.</p>
          )}

          {pendingInvites.map((invite) => (
            <div
              key={invite.id}
              className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-zinc-700 dark:bg-zinc-800/60"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-base font-extrabold text-slate-900 dark:text-white">
                    {invite.companyName || invite.id}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {invite.email || invite.id} · {planLabel(invite.plan)} · Üye limiti:{" "}
                    {invite.maxMembers || "-"} · Bitiş: {invite.accessUntil || "-"}
                    {accessWarningText(invite.accessUntil) && (
                      <>
                        {" "}·{" "}
                        <span className={accessWarningClass(invite.accessUntil)}>
                          {accessWarningText(invite.accessUntil)}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Durum: {invite.status || "-"} · Ofis: {invite.officeId || "-"}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {invite.officeId && (
                    <a
                      href={officeViewHref(invite.officeId)}
                      target="_blank"
                      rel="noopener"
                      className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                    >
                      Ofisi Görüntüle →
                    </a>
                  )}

                  {PLAN_OPTIONS.map((item) => (
                    <button
                      key={item.code}
                      onClick={() => updateInvitePlan(invite, item.code)}
                      disabled={saving}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                        planConfig(invite.plan).code === item.code
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-700 dark:text-slate-200"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}

                  {["ACTIVE", "ACCEPTED", "SUSPENDED", "CANCELLED"].map((status) => (
                    <button
                      key={status}
                      onClick={() => updateInviteStatus(invite, status)}
                      disabled={saving}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                        invite.status === status
                          ? "bg-orange-500 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-700 dark:text-slate-200"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
