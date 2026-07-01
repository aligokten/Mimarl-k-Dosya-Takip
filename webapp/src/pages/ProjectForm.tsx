import type { Project } from "../types";
import { useDb } from "../store";
import { inputCls, labelCls, primaryBtnCls, smallLabelCls, str } from "../ui";

export type ProjectFormValues = Pick<
  Project,
  | "name"
  | "clientId"
  | "landOwnerId"
  | "province"
  | "district"
  | "neighborhood"
  | "ada"
  | "parsel"
  | "pafta"
  | "address"
  | "notes"
>;

export function readProjectForm(formData: FormData): ProjectFormValues | null {
  const name = str(formData, "name");
  const clientId = str(formData, "clientId");
  if (!name || !clientId) return null;
  return {
    name,
    clientId,
    landOwnerId: str(formData, "landOwnerId"),
    province: str(formData, "province"),
    district: str(formData, "district"),
    neighborhood: str(formData, "neighborhood"),
    ada: str(formData, "ada"),
    parsel: str(formData, "parsel"),
    pafta: str(formData, "pafta"),
    address: str(formData, "address"),
    notes: str(formData, "notes"),
  };
}

export default function ProjectForm({
  initialValues,
  submitLabel,
  onSubmit,
}: {
  initialValues?: Project;
  submitLabel: string;
  onSubmit: (values: ProjectFormValues) => void;
}) {
  const db = useDb();
  const clients = [...db.clients].sort((a, b) =>
    a.name.localeCompare(b.name, "tr")
  );
  const landOwners = [...db.landOwners].sort((a, b) =>
    a.name.localeCompare(b.name, "tr")
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const values = readProjectForm(new FormData(e.currentTarget));
        if (values) onSubmit(values);
      }}
      className="space-y-4"
    >
      <div>
        <label className={labelCls}>Proje Adı / İş Adı</label>
        <input
          name="name"
          required
          defaultValue={initialValues?.name}
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Müşteri</label>
          <select
            name="clientId"
            required
            defaultValue={initialValues?.clientId ?? ""}
            className={inputCls}
          >
            <option value="" disabled>
              Seçiniz
            </option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          {clients.length === 0 && (
            <p className="mt-1 text-xs text-red-600">
              Önce Müşteriler sayfasından bir müşteri ekleyin.
            </p>
          )}
        </div>
        <div>
          <label className={labelCls}>Arsa Sahibi</label>
          <select
            name="landOwnerId"
            defaultValue={initialValues?.landOwnerId ?? ""}
            className={inputCls}
          >
            <option value="">Seçilmedi</option>
            {landOwners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 p-4">
        <p className="text-sm font-semibold text-slate-800">
          Arsa / Adres Bilgileri
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(
            [
              ["province", "İl"],
              ["district", "İlçe"],
              ["neighborhood", "Mahalle"],
              ["ada", "Ada"],
              ["parsel", "Parsel"],
              ["pafta", "Pafta"],
            ] as const
          ).map(([field, label]) => (
            <div key={field}>
              <label className={smallLabelCls}>{label}</label>
              <input
                name={field}
                defaultValue={initialValues?.[field] ?? ""}
                className={inputCls}
              />
            </div>
          ))}
        </div>
        <div className="mt-3">
          <label className={smallLabelCls}>Açık Adres</label>
          <input
            name="address"
            defaultValue={initialValues?.address ?? ""}
            className={inputCls}
          />
        </div>
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
