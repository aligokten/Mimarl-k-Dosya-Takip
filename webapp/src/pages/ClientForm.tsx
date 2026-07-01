import type { Client } from "../types";
import { inputCls, labelCls, primaryBtnCls, str } from "../ui";

export type ClientFormValues = Omit<Client, "id" | "createdAt">;

export function readClientForm(formData: FormData): ClientFormValues | null {
  const name = str(formData, "name");
  if (!name) return null;
  return {
    name,
    phone: str(formData, "phone"),
    email: str(formData, "email"),
    address: str(formData, "address"),
    taxNo: str(formData, "taxNo"),
    notes: str(formData, "notes"),
  };
}

export default function ClientForm({
  initialValues,
  submitLabel,
  onSubmit,
}: {
  initialValues?: Client;
  submitLabel: string;
  onSubmit: (values: ClientFormValues) => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const values = readClientForm(new FormData(e.currentTarget));
        if (values) onSubmit(values);
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
      <div>
        <label className={labelCls}>Adres</label>
        <input
          name="address"
          defaultValue={initialValues?.address ?? ""}
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls}>Vergi No / TC Kimlik No</label>
        <input
          name="taxNo"
          defaultValue={initialValues?.taxNo ?? ""}
          className={inputCls}
        />
      </div>
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
