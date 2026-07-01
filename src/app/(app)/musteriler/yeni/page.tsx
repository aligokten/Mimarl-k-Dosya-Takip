import { createClient } from "@/lib/actions/clients";
import ClientForm from "../client-form";

export default function YeniMusteriPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Yeni Müşteri
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Müşteri bilgilerini girin.
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <ClientForm action={createClient} submitLabel="Müşteriyi Kaydet" />
      </div>
    </div>
  );
}
