import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import clsx from "clsx";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { mutate, now, uid, useDb } from "../store";
import { uploadToDrive, useDrive } from "../drive";
import {
  DOCUMENT_KIND_LABELS,
  PROJECT_STATUS_LABELS,
  type DocumentKind,
  type Project,
  type ProjectStatus,
} from "../types";
import {
  cardCls,
  inputCls,
  primaryBtnCls,
  smallLabelCls,
  str,
  thCls,
} from "../ui";
import ProjectForm from "./ProjectForm";
import DeleteButton from "../components/DeleteButton";

const TABS = [
  { key: "genel", label: "Genel Bilgi" },
  { key: "hizmetler", label: "Hizmetler ve Aşamalar" },
  { key: "evraklar", label: "Evraklar" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function touchProject(draft: { projects: Project[] }, projectId: string) {
  const project = draft.projects.find((p) => p.id === projectId);
  if (project) project.updatedAt = now();
  return project;
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const db = useDb();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("genel");

  const project = db.projects.find((p) => p.id === id);
  if (!project) {
    return <p className="text-sm text-slate-500">Proje bulunamadı.</p>;
  }

  const client = db.clients.find((c) => c.id === project.clientId);
  const landOwner = db.landOwners.find((o) => o.id === project.landOwnerId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {project.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {client?.name ?? "-"}
            {landOwner ? ` · Arsa Sahibi: ${landOwner.name}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={project.status}
            onChange={(e) => {
              const status = e.target.value as ProjectStatus;
              mutate((draft) => {
                const target = touchProject(draft, project.id);
                if (target) target.status = status;
              });
            }}
            className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <DeleteButton
            confirmMessage="Bu projeyi silmek istediğinize emin misiniz? Tüm hizmet ve evrak kayıtları silinecek."
            onDelete={() => {
              mutate((draft) => {
                draft.projects = draft.projects.filter(
                  (p) => p.id !== project.id
                );
              });
              navigate("/projeler");
            }}
          />
        </div>
      </div>

      <div className="inline-flex max-w-full overflow-x-auto rounded-full border border-slate-200 bg-white p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={clsx(
              "whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold",
              tab === t.key
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "genel" && <GeneralTab project={project} />}
      {tab === "hizmetler" && <ServicesTab project={project} />}
      {tab === "evraklar" && <DocumentsTab project={project} />}
    </div>
  );
}

function GeneralTab({ project }: { project: Project }) {
  return (
    <div className={`${cardCls} p-6`}>
      <ProjectForm
        initialValues={project}
        submitLabel="Değişiklikleri Kaydet"
        onSubmit={(values) => {
          mutate((draft) => {
            const target = touchProject(draft, project.id);
            if (target) Object.assign(target, values);
          });
          window.alert("Proje bilgileri kaydedildi.");
        }}
      />
    </div>
  );
}

function ServicesTab({ project }: { project: Project }) {
  const db = useDb();
  const usedTypeIds = new Set(project.services.map((s) => s.serviceTypeId));
  const availableTypes = db.serviceTypes.filter(
    (st) => !usedTypeIds.has(st.id)
  );

  return (
    <div className="space-y-4">
      {project.services.length === 0 && (
        <div className={`${cardCls} p-6 text-center text-sm text-slate-500`}>
          Bu projeye henüz hizmet eklenmemiş.
        </div>
      )}

      {project.services.map((service) => {
        const serviceType = db.serviceTypes.find(
          (st) => st.id === service.serviceTypeId
        );
        const stages = serviceType?.stages ?? [];
        const completed = new Set(service.completedStageIds);
        const doneCount = stages.filter((s) => completed.has(s.id)).length;

        return (
          <div key={service.id} className={`${cardCls} p-5`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {serviceType?.name ?? "Silinmiş hizmet türü"}
                </p>
                <p className="text-xs text-slate-500">
                  {doneCount}/{stages.length} aşama tamamlandı
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={service.status}
                  onChange={(e) => {
                    const status = e.target.value as ProjectStatus;
                    mutate((draft) => {
                      const target = touchProject(draft, project.id);
                      const svc = target?.services.find(
                        (s) => s.id === service.id
                      );
                      if (svc) svc.status = status;
                    });
                  }}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                >
                  {Object.entries(PROJECT_STATUS_LABELS).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    )
                  )}
                </select>
                <input
                  type="date"
                  value={service.targetDate ?? ""}
                  onChange={(e) => {
                    const targetDate = e.target.value || undefined;
                    mutate((draft) => {
                      const target = touchProject(draft, project.id);
                      const svc = target?.services.find(
                        (s) => s.id === service.id
                      );
                      if (svc) svc.targetDate = targetDate;
                    });
                  }}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
                <DeleteButton
                  label="Kaldır"
                  confirmMessage={`"${serviceType?.name ?? "Bu hizmet"}" hizmetini projeden kaldırmak istediğinize emin misiniz?`}
                  onDelete={() => {
                    mutate((draft) => {
                      const target = touchProject(draft, project.id);
                      if (target) {
                        target.services = target.services.filter(
                          (s) => s.id !== service.id
                        );
                      }
                    });
                  }}
                />
              </div>
            </div>

            {stages.length > 0 && (
              <ol className="mt-4 space-y-1.5 border-t border-slate-100 pt-4">
                {stages.map((stage) => {
                  const isDone = completed.has(stage.id);
                  return (
                    <li key={stage.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          mutate((draft) => {
                            const target = touchProject(draft, project.id);
                            const svc = target?.services.find(
                              (s) => s.id === service.id
                            );
                            if (!svc) return;
                            svc.completedStageIds = checked
                              ? [...svc.completedStageIds, stage.id]
                              : svc.completedStageIds.filter(
                                  (sid) => sid !== stage.id
                                );
                          });
                        }}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      <span
                        className={
                          isDone
                            ? "text-sm text-slate-400 line-through"
                            : "text-sm text-slate-700"
                        }
                      >
                        {stage.name}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        );
      })}

      {availableTypes.length > 0 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const serviceTypeId = str(new FormData(e.currentTarget), "serviceTypeId");
            if (!serviceTypeId) return;
            mutate((draft) => {
              const target = touchProject(draft, project.id);
              if (target) {
                target.services.push({
                  id: uid(),
                  serviceTypeId,
                  status: "DEVAM_EDIYOR",
                  completedStageIds: [],
                });
              }
            });
            e.currentTarget.reset();
          }}
          className={`${cardCls} flex items-center gap-2 border-dashed p-4`}
        >
          <select
            name="serviceTypeId"
            required
            defaultValue=""
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="" disabled>
              Eklenecek hizmet türünü seçin
            </option>
            {availableTypes.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </select>
          <button type="submit" className={primaryBtnCls}>
            Hizmet Ekle
          </button>
        </form>
      )}
    </div>
  );
}

function DocumentsTab({ project }: { project: Project }) {
  const db = useDb();
  const drive = useDrive();
  const [kind, setKind] = useState<DocumentKind>("DIJITAL");
  const [uploading, setUploading] = useState(false);

  const documents = [...project.documents].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

  return (
    <div className="space-y-6">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const formData = new FormData(form);
          const file = formData.get("file");
          const hasFile = file instanceof File && file.size > 0;
          let name = str(formData, "name");
          if (!name && hasFile) name = (file as File).name;
          if (!name) return;
          let url = kind === "FIZIKSEL" ? undefined : str(formData, "url");
          const physicalLocation =
            kind === "DIJITAL" ? undefined : str(formData, "physicalLocation");
          const projectServiceId = str(formData, "projectServiceId");

          if (kind !== "FIZIKSEL" && hasFile) {
            setUploading(true);
            try {
              const uploaded = await uploadToDrive(file as File, project.name);
              url = uploaded.url ?? url;
            } catch (err) {
              window.alert(
                err instanceof Error ? err.message : "Dosya yüklenemedi."
              );
              setUploading(false);
              return;
            }
            setUploading(false);
          }

          mutate((draft) => {
            const target = touchProject(draft, project.id);
            if (target) {
              target.documents.push({
                id: uid(),
                name: name!,
                kind,
                url,
                physicalLocation,
                projectServiceId,
                createdAt: now(),
              });
            }
          });
          form.reset();
        }}
        className={`${cardCls} space-y-3 p-5`}
      >
        <p className="text-sm font-semibold text-slate-900">Yeni Evrak Ekle</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={smallLabelCls}>Evrak Adı</label>
            <input name="name" required className={inputCls} />
          </div>
          <div>
            <label className={smallLabelCls}>İlişkili Hizmet</label>
            <select
              name="projectServiceId"
              defaultValue=""
              className={inputCls}
            >
              <option value="">Genel (hizmete bağlı değil)</option>
              {project.services.map((service) => {
                const serviceType = db.serviceTypes.find(
                  (st) => st.id === service.serviceTypeId
                );
                return (
                  <option key={service.id} value={service.id}>
                    {serviceType?.name ?? "-"}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div>
          <label className={smallLabelCls}>Evrak Türü</label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as DocumentKind)}
            className={`${inputCls} sm:w-64`}
          >
            <option value="DIJITAL">Dijital (Drive linki)</option>
            <option value="FIZIKSEL">Fiziksel (basılı arşiv)</option>
            <option value="IKISI_DE">Dijital + Fiziksel</option>
          </select>
        </div>

        {kind !== "FIZIKSEL" && (
          <div className="space-y-3">
            {drive.connected ? (
              <div>
                <label className={smallLabelCls}>
                  Dosya (Drive&apos;a otomatik yüklenir)
                </label>
                <input
                  type="file"
                  name="file"
                  className="mt-1 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-200"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Dosya, Drive&apos;daki &quot;{project.name}&quot; proje
                  klasörüne yüklenir. Evrak adı boş bırakılırsa dosya adı
                  kullanılır.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Dosyayı uygulama içinden yüklemek için Ayarlar &gt; Google
                Drive bölümünden bağlanın; ya da aşağıya hazır bir Drive
                linki yapıştırın.
              </p>
            )}
            <div>
              <label className={smallLabelCls}>
                Dosya Bağlantısı (isteğe bağlı — hazır Drive linki)
              </label>
              <input
                name="url"
                type="url"
                placeholder="https://drive.google.com/..."
                className={inputCls}
              />
            </div>
          </div>
        )}

        {kind !== "DIJITAL" && (
          <div>
            <label className={smallLabelCls}>
              Fiziksel Konum (Dolap / Raf / Klasör No)
            </label>
            <input
              name="physicalLocation"
              placeholder="Örn: Dolap 2, Klasör B, Proje Kutusu 14"
              className={inputCls}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={uploading}
          className={`${primaryBtnCls} disabled:opacity-60`}
        >
          {uploading ? "Drive'a yükleniyor..." : "Evrakı Kaydet"}
        </button>
      </form>

      <div className={`${cardCls} overflow-hidden`}>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className={thCls}>Evrak</th>
              <th className={thCls}>Tür</th>
              <th className={thCls}>Hizmet</th>
              <th className={thCls}>Konum / Bağlantı</th>
              <th className={thCls}>Tarih</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {documents.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-sm text-slate-500"
                >
                  Henüz evrak eklenmemiş.
                </td>
              </tr>
            )}
            {documents.map((doc) => {
              const service = project.services.find(
                (s) => s.id === doc.projectServiceId
              );
              const serviceType = service
                ? db.serviceTypes.find((st) => st.id === service.serviceTypeId)
                : undefined;
              return (
                <tr key={doc.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {doc.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {DOCUMENT_KIND_LABELS[doc.kind]}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {serviceType?.name ?? "Genel"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {doc.url && (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Bağlantıyı Aç
                      </a>
                    )}
                    {doc.physicalLocation && (
                      <span className={doc.url ? "ml-2" : ""}>
                        {doc.physicalLocation}
                      </span>
                    )}
                    {!doc.url && !doc.physicalLocation && "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {format(new Date(doc.createdAt), "d MMM yyyy", {
                      locale: tr,
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DeleteButton
                      confirmMessage={`"${doc.name}" evrakını silmek istediğinize emin misiniz?`}
                      onDelete={() => {
                        mutate((draft) => {
                          const target = touchProject(draft, project.id);
                          if (target) {
                            target.documents = target.documents.filter(
                              (d) => d.id !== doc.id
                            );
                          }
                        });
                      }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}
