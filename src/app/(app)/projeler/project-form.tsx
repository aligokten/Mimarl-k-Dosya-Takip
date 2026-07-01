type ProjectFormValues = {
  name: string;
  clientId: string;
  landOwnerId: string | null;
  province: string | null;
  district: string | null;
  neighborhood: string | null;
  ada: string | null;
  parsel: string | null;
  pafta: string | null;
  address: string | null;
  notes: string | null;
};

export default function ProjectForm({
  action,
  initialValues,
  clients,
  landOwners,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  initialValues?: ProjectFormValues;
  clients: { id: string; name: string }[];
  landOwners: { id: string; name: string }[];
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">
          Proje Adı / İş Adı
        </label>
        <input
          name="name"
          required
          defaultValue={initialValues?.name}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Müşteri
          </label>
          <select
            name="clientId"
            required
            defaultValue={initialValues?.clientId ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
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
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Arsa Sahibi
          </label>
          <select
            name="landOwnerId"
            defaultValue={initialValues?.landOwnerId ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
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
          <div>
            <label className="block text-xs font-medium text-slate-600">
              İl
            </label>
            <input
              name="province"
              defaultValue={initialValues?.province ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">
              İlçe
            </label>
            <input
              name="district"
              defaultValue={initialValues?.district ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">
              Mahalle
            </label>
            <input
              name="neighborhood"
              defaultValue={initialValues?.neighborhood ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">
              Ada
            </label>
            <input
              name="ada"
              defaultValue={initialValues?.ada ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">
              Parsel
            </label>
            <input
              name="parsel"
              defaultValue={initialValues?.parsel ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">
              Pafta
            </label>
            <input
              name="pafta"
              defaultValue={initialValues?.pafta ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-xs font-medium text-slate-600">
            Açık Adres
          </label>
          <input
            name="address"
            defaultValue={initialValues?.address ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Notlar
        </label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={initialValues?.notes ?? ""}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      <button
        type="submit"
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        {submitLabel}
      </button>
    </form>
  );
}
