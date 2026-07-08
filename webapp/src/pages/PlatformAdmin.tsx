import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { now, useApp } from "../data";
import { cardCls, inputCls, labelCls, primaryBtnCls } from "../ui";

type AccessStatus = "ACTIVE" | "SUSPENDED" | "PAST_DUE" | "CANCELLED";

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
  plan?: string;
  maxMembers?: number;
  accessUntil?: string;
  emailStatus?: string;
  emailError?: string;
  emailSentAt?: string;
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
  const [plan, setPlan] = useState("PRO");
  const [maxMembers, setMaxMembers] = useState("10");
  const [accessUntil, setAccessUntil] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
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

      setInvites(
        inviteSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as object),
        }))
      );

      const leadRows = leadSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as object),
      })) as LeadRow[];

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

  async function createInvite() {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCompany = companyName.trim();

    if (!cleanEmail || !cleanCompany) {
      alert("E-posta ve firma adı zorunlu.");
      return;
    }

    setSaving(true);

    try {
      await setDoc(
        doc(db(), "platformInvites", cleanEmail),
        {
          email: cleanEmail,
          companyName: cleanCompany,
          plan: plan.trim() || "PRO",
          maxMembers: Number(maxMembers) || 10,
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
      setMaxMembers("10");

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

  async function updateInviteStatus(inviteId: string, status: string) {
    setSaving(true);

    try {
      await updateDoc(doc(db(), "platformInvites", inviteId), {
        status,
        updatedAt: now(),
      });

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
            <input
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              placeholder="PRO"
              className={inputCls}
            />
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
                  {lead.plan || "-"} · {lead.maxMembers || "-"} kullanıcı
                </div>
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-100">Davet e-postası:</span>{" "}
                  {lead.inviteEmail || lead.email || "-"}
                </div>
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-100">Oluşturulma:</span>{" "}
                  {lead.createdAt ? lead.createdAt.slice(0, 16).replace("T", " ") : "-"}
                </div>
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-100">Güncelleme:</span>{" "}
                  {lead.updatedAt ? lead.updatedAt.slice(0, 16).replace("T", " ") : "-"}
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
                      {office.ownerEmail || "E-posta yok"} · {office.plan || "Plan yok"} · Üye limiti:{" "}
                      {office.maxMembers || "-"} · Bitiş: {office.accessUntil || "-"}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Ofis ID: {office.id}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
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
                    {invite.email || invite.id} · {invite.plan || "Plan yok"} · Üye limiti:{" "}
                    {invite.maxMembers || "-"} · Bitiş: {invite.accessUntil || "-"}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Durum: {invite.status || "-"} · Ofis: {invite.officeId || "-"}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {["ACTIVE", "ACCEPTED", "SUSPENDED", "CANCELLED"].map((status) => (
                    <button
                      key={status}
                      onClick={() => updateInviteStatus(invite.id, status)}
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
