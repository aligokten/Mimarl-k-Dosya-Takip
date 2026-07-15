import { useState } from "react";
import { createPortal } from "react-dom";
import {
  CONTACT_ROLE_LABELS,
  type Contact,
  type ContactRole,
} from "../types";
import { drivePreviewUrl } from "../drive";
import {
  inputCls,
  labelCls,
  primaryBtnCls,
  secondaryBtnCls,
  smallLabelCls,
  str,
} from "../ui";

function PoaPreviewModal({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  const previewUrl = drivePreviewUrl(url);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 dark:border-zinc-700">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Taranmış Vekaletname
          </h3>
          <div className="flex items-center gap-2">
            <a href={url} target="_blank" rel="noreferrer" className={secondaryBtnCls}>
              Yeni sekmede aç
            </a>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-zinc-800"
              title="Kapat"
            >
              ✕
            </button>
          </div>
        </div>
        {previewUrl ? (
          <iframe
            src={previewUrl}
            title="Taranmış Vekaletname"
            className="min-h-0 flex-1 bg-slate-100 dark:bg-zinc-800"
          />
        ) : (
          <p className="p-6 text-sm text-slate-500 dark:text-slate-400">
            Bu bağlantı için uygulama içi önizleme oluşturulamadı. &quot;Yeni
            sekmede aç&quot; ile açabilirsiniz.
          </p>
        )}
      </div>
    </div>,
    document.body
  );
}

export type ContactFormValues = Omit<Contact, "id" | "createdAt">;

const ALL_ROLES: ContactRole[] = ["MUSTERI", "ARSA_SAHIBI", "MUTEAHHIT"];

export default function ContactForm({
  initialValues,
  submitLabel,
  onSubmit,
  saving,
  error,
}: {
  initialValues?: Contact;
  submitLabel: string;
  onSubmit: (values: ContactFormValues) => void;
  saving?: boolean;
  error?: string | null;
}) {
  const [roles, setRoles] = useState<ContactRole[]>(
    initialValues?.roles ?? ["MUSTERI"]
  );
  const [poaUrl, setPoaUrl] = useState(initialValues?.poaUrl ?? "");
  const [editingPoaUrl, setEditingPoaUrl] = useState(!initialValues?.poaUrl);
  const [previewOpen, setPreviewOpen] = useState(false);

  function toggleRole(role: ContactRole) {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = str(formData, "name");
        if (!name) return;
        if (roles.length === 0) {
          window.alert("En az bir rol seçmelisiniz.");
          return;
        }
        onSubmit({
          name,
          roles,
          phone: str(formData, "phone"),
          email: str(formData, "email"),
          address: str(formData, "address"),
          tcNo: str(formData, "tcNo"),
          taxNo: str(formData, "taxNo"),
          poaNo: roles.includes("ARSA_SAHIBI")
            ? str(formData, "poaNo")
            : initialValues?.poaNo,
          poaDate: roles.includes("ARSA_SAHIBI")
            ? str(formData, "poaDate")
            : initialValues?.poaDate,
          poaExpiryDate: roles.includes("ARSA_SAHIBI")
            ? str(formData, "poaExpiryDate")
            : initialValues?.poaExpiryDate,
          notaryName: roles.includes("ARSA_SAHIBI")
            ? str(formData, "notaryName")
            : initialValues?.notaryName,
          poaUrl: roles.includes("ARSA_SAHIBI")
            ? str(formData, "poaUrl")
            : initialValues?.poaUrl,
          notes: str(formData, "notes"),
        });
      }}
      className="space-y-4"
    >
      <div>
        <label className={labelCls}>Ad Soyad / Firma Unvanı</label>
        <input
          name="name"
          required
          defaultValue={initialValues?.name}
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>Roller</label>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {ALL_ROLES.map((role) => {
            const active = roles.includes(role);
            return (
              <button
                key={role}
                type="button"
                onClick={() => toggleRole(role)}
                className={
                  active
                    ? "rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white dark:bg-white dark:text-slate-900"
                    : "rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-zinc-800 dark:text-slate-300 dark:hover:bg-zinc-700"
                }
              >
                {active ? "✓ " : ""}
                {CONTACT_ROLE_LABELS[role]}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Aynı kişi birden fazla rol taşıyabilir (örn. hem müşteri hem arsa
          sahibi).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Telefon</label>
          <input
            name="phone"
            defaultValue={initialValues?.phone ?? ""}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>E-posta</label>
          <input
            name="email"
            type="email"
            defaultValue={initialValues?.email ?? ""}
            className={inputCls}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>TC Kimlik No</label>
          <input
            name="tcNo"
            defaultValue={initialValues?.tcNo ?? ""}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Vergi No</label>
          <input
            name="taxNo"
            defaultValue={initialValues?.taxNo ?? ""}
            className={inputCls}
          />
        </div>
      </div>
      <div>
        <label className={labelCls}>Adres</label>
        <input
          name="address"
          defaultValue={initialValues?.address ?? ""}
          className={inputCls}
        />
      </div>

      {roles.includes("ARSA_SAHIBI") && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Vekaletname Bilgileri
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={smallLabelCls}>Vekaletname No</label>
              <input
                name="poaNo"
                defaultValue={initialValues?.poaNo ?? ""}
                className={inputCls}
              />
            </div>
            <div>
              <label className={smallLabelCls}>Vekaletname Tarihi</label>
              <input
                type="date"
                name="poaDate"
                defaultValue={initialValues?.poaDate ?? ""}
                className={inputCls}
              />
            </div>
            <div>
              <label className={smallLabelCls}>Noter</label>
              <input
                name="notaryName"
                defaultValue={initialValues?.notaryName ?? ""}
                className={inputCls}
              />
            </div>
            <div>
              <label className={smallLabelCls}>Geçerlilik Bitişi</label>
              <input
                type="date"
                name="poaExpiryDate"
                defaultValue={initialValues?.poaExpiryDate ?? ""}
                className={inputCls}
              />
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                Girilirse süre dolmadan otomatik hatırlatılır.
              </p>
            </div>
          </div>
          <div className="mt-3">
            <label className={smallLabelCls}>
              Taranmış Vekaletname Bağlantısı (Google Drive linki)
            </label>
            {editingPoaUrl ? (
              <input
                name="poaUrl"
                type="url"
                placeholder="https://drive.google.com/..."
                value={poaUrl}
                onChange={(e) => setPoaUrl(e.target.value)}
                onBlur={() => {
                  if (poaUrl.trim()) setEditingPoaUrl(false);
                }}
                className={inputCls}
              />
            ) : (
              <>
                <input type="hidden" name="poaUrl" value={poaUrl} />
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(true)}
                    className={secondaryBtnCls}
                  >
                    Önizle
                  </button>
                  <a
                    href={poaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={secondaryBtnCls}
                  >
                    Bağlantıyı Aç
                  </a>
                  <button
                    type="button"
                    onClick={() => setEditingPoaUrl(true)}
                    className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    Değiştir
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {previewOpen && poaUrl && (
        <PoaPreviewModal url={poaUrl} onClose={() => setPreviewOpen(false)} />
      )}

      <div>
        <label className={labelCls}>Notlar</label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={initialValues?.notes ?? ""}
          className={inputCls}
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <button
        type="submit"
        disabled={saving}
        className={`${primaryBtnCls} disabled:opacity-60`}
      >
        {saving ? "Kaydediliyor..." : submitLabel}
      </button>
    </form>
  );
}
