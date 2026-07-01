import type { LandOwner } from "../types";
import { inputCls, labelCls, primaryBtnCls, smallLabelCls, str } from "../ui";

export type LandOwnerFormValues = Omit<LandOwner, "id" | "createdAt">;

export function readLandOwnerForm(
  formData: FormData
): LandOwnerFormValues | null {
  const name = str(formData, "name");
  if (!name) return null;
  return {
    name,
    phone: str(formData, "phone"),
    email: str(formData, "email"),
    address: str(formData, "address"),
    tcNo: str(formData, "tcNo"),
    poaNo: str(formData, "poaNo"),
    poaDate: str(formData, "poaDate"),
    notaryName: str(formData, "notaryName"),
    poaUrl: str(formData, "poaUrl"),
    notes: str(formData, "notes"),
  };
}

export default function LandOwnerForm({
  initialValues,
  submitLabel,
  onSubmit,
}: {
  initialValues?: LandOwner;
  submitLabel: string;
  onSubmit: (values: LandOwnerFormValues) => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const values = readLandOwnerForm(new FormData(e.currentTarget));
        if (values) onSubmit(values);
      }}
      className="space-y-4"
    >
      <div>
        <label className={labelCls}>Ad Soyad</label>
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
          <label className={labelCls}>Adres</label>
          <input
            name="address"
            defaultValue={initialValues?.address ?? ""}
            className={inputCls}
          />
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-900">
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
          <p className="mt-1 text-xs text-amber-800">
            Dosyayı Drive&apos;a yükleyip paylaşım linkini buraya
            yapıştırabilirsiniz. Otomatik yükleme sonraki aşamada eklenecek.
          </p>
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
