import { useState } from "react";
import {
  CONTACT_ROLE_LABELS,
  type Contact,
  type ContactRole,
} from "../types";
import { inputCls, labelCls, primaryBtnCls, smallLabelCls, str } from "../ui";

export type ContactFormValues = Omit<Contact, "id" | "createdAt">;

const ALL_ROLES: ContactRole[] = ["MUSTERI", "ARSA_SAHIBI", "MUTEAHHIT"];

export default function ContactForm({
  initialValues,
  submitLabel,
  onSubmit,
}: {
  initialValues?: Contact;
  submitLabel: string;
  onSubmit: (values: ContactFormValues) => void;
}) {
  const [roles, setRoles] = useState<ContactRole[]>(
    initialValues?.roles ?? ["MUSTERI"]
  );

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
                    : "rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
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
          </div>
          <div className="mt-3">
            <label className={smallLabelCls}>
              Taranmış Vekaletname Bağlantısı (Google Drive linki)
            </label>
            <input
              name="poaUrl"
              type="url"
              placeholder="https://drive.google.com/..."
              defaultValue={initialValues?.poaUrl ?? ""}
              className={inputCls}
            />
          </div>
        </div>
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
      <button type="submit" className={primaryBtnCls}>
        {submitLabel}
      </button>
    </form>
  );
}
