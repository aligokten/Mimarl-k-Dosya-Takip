"use client";

import { useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { uploadDocument, deleteDocument } from "@/lib/actions/documents";
import DeleteButton from "@/components/delete-button";

type Document = {
  id: string;
  name: string;
  kind: string;
  driveFileUrl: string | null;
  physicalLocation: string | null;
  createdAt: Date;
  projectService: { serviceType: { name: string } } | null;
};
type Project = {
  id: string;
  documents: Document[];
  services: { id: string; serviceType: { name: string } }[];
};

const KIND_LABELS: Record<string, string> = {
  DIJITAL: "Dijital",
  FIZIKSEL: "Fiziksel",
  IKISI_DE: "Dijital + Fiziksel",
};

export default function DocumentsTab({ project }: { project: Project }) {
  return (
    <div className="space-y-6">
      <UploadForm project={project} />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Evrak
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Tür
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Hizmet
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Konum / Bağlantı
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Tarih
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {project.documents.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-sm text-slate-500"
                >
                  Henüz evrak eklenmemiş.
                </td>
              </tr>
            )}
            {project.documents.map((doc) => (
              <tr key={doc.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm font-medium text-slate-900">
                  {doc.name}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {KIND_LABELS[doc.kind]}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {doc.projectService?.serviceType.name ?? "Genel"}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {doc.driveFileUrl && (
                    <a
                      href={doc.driveFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Drive&apos;da Görüntüle
                    </a>
                  )}
                  {doc.physicalLocation && (
                    <span className={doc.driveFileUrl ? "ml-2" : ""}>
                      {doc.physicalLocation}
                    </span>
                  )}
                  {!doc.driveFileUrl && !doc.physicalLocation && "-"}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {format(doc.createdAt, "d MMM yyyy", { locale: tr })}
                </td>
                <td className="px-4 py-3 text-right">
                  <DeleteButton
                    action={deleteDocument.bind(null, project.id, doc.id)}
                    confirmMessage={`"${doc.name}" evrakını silmek istediğinize emin misiniz?`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UploadForm({ project }: { project: Project }) {
  const [kind, setKind] = useState<"DIJITAL" | "FIZIKSEL" | "IKISI_DE">(
    "DIJITAL"
  );
  const uploadAction = uploadDocument.bind(null, project.id, null);

  return (
    <form
      action={(formData: FormData) => {
        const projectServiceId = formData.get("projectServiceId") as string;
        const action = projectServiceId
          ? uploadDocument.bind(null, project.id, projectServiceId)
          : uploadAction;
        return action(formData);
      }}
      className="space-y-3 rounded-xl border border-slate-200 bg-white p-5"
    >
      <p className="text-sm font-semibold text-slate-900">Yeni Evrak Ekle</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-600">
            Evrak Adı
          </label>
          <input
            name="name"
            placeholder="Dosya seçilirse otomatik doldurulur"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">
            İlişkili Hizmet
          </label>
          <select
            name="projectServiceId"
            defaultValue=""
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="">Genel (hizmete bağlı değil)</option>
            {project.services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.serviceType.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600">
          Evrak Türü
        </label>
        <select
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 sm:w-64"
        >
          <option value="DIJITAL">Dijital (Drive&apos;a yüklenir)</option>
          <option value="FIZIKSEL">Fiziksel (basılı arşiv)</option>
          <option value="IKISI_DE">Dijital + Fiziksel</option>
        </select>
      </div>

      {kind !== "FIZIKSEL" && (
        <div>
          <label className="block text-xs font-medium text-slate-600">
            Dosya
          </label>
          <input
            type="file"
            name="file"
            className="mt-1 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-200"
          />
        </div>
      )}

      {kind !== "DIJITAL" && (
        <div>
          <label className="block text-xs font-medium text-slate-600">
            Fiziksel Konum (Dolap / Raf / Klasör No)
          </label>
          <input
            name="physicalLocation"
            placeholder="Örn: Dolap 2, Klasör B, Proje Kutusu 14"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
      )}

      <button
        type="submit"
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        Evrakı Kaydet
      </button>
    </form>
  );
}
