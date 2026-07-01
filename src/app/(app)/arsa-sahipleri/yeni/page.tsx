import { createLandOwner } from "@/lib/actions/land-owners";
import LandOwnerForm from "../land-owner-form";

export default function YeniArsaSahibiPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Yeni Arsa Sahibi
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Arsa sahibi ve vekaletname bilgilerini girin.
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <LandOwnerForm
          action={createLandOwner}
          submitLabel="Arsa Sahibini Kaydet"
        />
      </div>
    </div>
  );
}
