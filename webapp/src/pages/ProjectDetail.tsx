import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import clsx from "clsx";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { mutate, now, uid, useDb } from "../store";
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
          <h1 className="text-2xl font-semibold text-slate-900">
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
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
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

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={clsx(
                "border-b-2 px-1 py-3 text-sm font-medium",
                tab === t.key
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
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
                  className="rounded-md border border-slate-300 px-2 py-1.5 text-xs focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
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
                  className="rounded-md border border-slate-300 px-2 py-1.5 text-xs focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
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
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
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
  const [kind, setKind] = useState<DocumentKind>("DIJITAL");

  const documents = [...project.documents].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const name = str(formData, "name");
          if (!name) return;
          const url = kind === "FIZIKSEL" ? undefined : str(formData, "url");
          const physicalLocation =
            kind === "DIJITAL" ? undefined : str(formData, "physicalLocation");
          const projectServiceId = str(formData, "projectServiceId");
          mutate((draft) => {
            const target = touchProject(draft, project.id);
            if (target) {
              target.documents.push({
                id: uid(),
                name,
                kind,
                url,
                physicalLocation,
                projectServiceId,
                createdAt: now(),
              });
            }
          });
          e.currentTarget.reset();
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
          <div>
            <label className={smallLabelCls}>
              Dosya Bağlantısı (Google Drive linki)
            </label>
            <input
              name="url"
              type="url"
              placeholder="https://drive.google.com/..."
              className={inputCls}
            />
            <p className="mt-1 text-xs text-slate-400">
              Dosyayı Drive&apos;a yükleyip paylaşım linkini buraya
              yapıştırın. Otomatik yükleme sonraki aşamada eklenecek.
            </p>
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

        <button type="submit" className={primaryBtnCls}>
          Evrakı Kaydet
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

      <p className="text-xs text-slate-400">
        Not: Dosyaların Drive&apos;a otomatik yüklenmesi 2. aşamada
        eklenecek. Şimdilik dosyayı Google Drive&apos;a kendiniz yükleyip
        linkini kaydedebilirsiniz.
      </p>
    </div>
  );
}
