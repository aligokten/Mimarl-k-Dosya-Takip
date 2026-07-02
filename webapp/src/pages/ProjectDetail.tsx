import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import clsx from "clsx";
import { format, formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import {
  addActivity,
  deleteProject,
  loadActivities,
  patchProject,
  uid,
  useApp,
} from "../data";
import { uploadToDrive, useDrive } from "../drive";
import {
  DOCUMENT_KIND_LABELS,
  PROJECT_STATUS_LABELS,
  type Activity,
  type DocumentKind,
  type Project,
  type ProjectDocument,
  type ProjectService,
  type ProjectStatus,
} from "../types";
import {
  cardCls,
  inputCls,
  primaryBtnCls,
  secondaryBtnCls,
  smallLabelCls,
  str,
  thCls,
} from "../ui";
import ProjectForm from "./ProjectForm";
import DeleteButton from "../components/DeleteButton";
import { ChevronLeftIcon } from "../components/icons";
import { Avatar } from "../App";

const TABS = [
  { key: "genel", label: "Proje Bilgileri" },
  { key: "hizmetler", label: "Hizmetler ve Aşamalar" },
  { key: "evraklar", label: "Evraklar" },
  { key: "notlar", label: "Notlar" },
  { key: "aktivite", label: "Geçmiş Aktiviteler" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const db = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("genel");

  const project = db.projects.find((p) => p.id === id);
  if (!project) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Proje bulunamadı.
      </p>
    );
  }

  const client = db.contacts.find((c) => c.id === project.clientId);
  const landOwner = db.contacts.find((o) => o.id === project.landOwnerId);

  return (
    <div className="space-y-6">
      <Link
        to="/projeler"
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Projeler
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {project.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {client?.name ?? "-"}
            {landOwner ? ` · Arsa Sahibi: ${landOwner.name}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={project.status}
            onChange={(e) => {
              const status = e.target.value as ProjectStatus;
              patchProject(
                project.id,
                { status },
                {
                  type: "DURUM_DEGISTI",
                  text: `Proje durumu "${PROJECT_STATUS_LABELS[status]}" olarak güncellendi`,
                  notify: true,
                }
              );
            }}
            className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-600 dark:bg-zinc-800 dark:text-slate-200"
          >
            {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <DeleteButton
            confirmMessage="Bu projeyi silmek istediğinize emin misiniz? Tüm hizmet ve evrak kayıtları silinecek."
            onDelete={async () => {
              await deleteProject(project.id);
              navigate("/projeler");
            }}
          />
        </div>
      </div>

      <div className="inline-flex max-w-full overflow-x-auto rounded-full border border-slate-200 bg-white p-1 dark:border-slate-600 dark:bg-zinc-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={clsx(
              "whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold",
              tab === t.key
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "genel" && <GeneralTab project={project} />}
      {tab === "hizmetler" && <ServicesTab project={project} />}
      {tab === "evraklar" && <DocumentsTab project={project} />}
      {tab === "notlar" && <NotesTab project={project} />}
      {tab === "aktivite" && <ActivityTab project={project} />}
    </div>
  );
}

function GeneralTab({ project }: { project: Project }) {
  return (
    <div className="space-y-6">
      <AssigneesCard project={project} />
      <div className={`${cardCls} p-6`}>
        <ProjectForm
          initialValues={project}
          submitLabel="Değişiklikleri Kaydet"
          onSubmit={async (values) => {
            await patchProject(project.id, values, {
              type: "PROJE_GUNCELLENDI",
              text: "Proje bilgileri güncellendi",
            });
            window.alert("Proje bilgileri kaydedildi.");
          }}
        />
      </div>
    </div>
  );
}

function AssigneesCard({ project }: { project: Project }) {
  const db = useApp();
  const canManage = db.me?.role === "ADMIN";
  const assigned = new Set(project.memberIds ?? []);
  const members = [...db.members].sort((a, b) =>
    a.displayName.localeCompare(b.displayName, "tr")
  );

  return (
    <div className={`${cardCls} p-6`}>
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
        Görevli Ekip
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {canManage
          ? "Bu projede görevli çalışanları seçin. Projedeki değişikliklerde onlara bildirim gider."
          : "Bu projede görevli çalışanlar."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {members.map((m) => {
          const isOn = assigned.has(m.uid);
          const toggle = async () => {
            if (!canManage) return;
            const next = new Set(assigned);
            if (isOn) next.delete(m.uid);
            else next.add(m.uid);
            await patchProject(
              project.id,
              { memberIds: [...next] },
              isOn
                ? undefined
                : {
                    type: "GOREVLI_ATANDI",
                    text: `${m.displayName} projeye görevli olarak eklendi`,
                    notify: true,
                  }
            );
          };
          return (
            <button
              key={m.uid}
              type="button"
              disabled={!canManage}
              onClick={toggle}
              className={clsx(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                isOn
                  ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                  : "border-slate-200 bg-white text-slate-600 dark:border-slate-600 dark:bg-zinc-800 dark:text-slate-300",
                !canManage && "cursor-default opacity-80"
              )}
            >
              <Avatar member={m} />
              {m.displayName}
              {isOn && " ✓"}
            </button>
          );
        })}
        {members.length === 0 && (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Ekipte kimse yok.
          </p>
        )}
      </div>
    </div>
  );
}

function ServicesTab({ project }: { project: Project }) {
  const db = useApp();
  const usedTypeIds = new Set(project.services.map((s) => s.serviceTypeId));
  const availableTypes = db.serviceTypes.filter((st) => !usedTypeIds.has(st.id));

  return (
    <div className="space-y-4">
      {project.services.length === 0 && (
        <div
          className={`${cardCls} p-6 text-center text-sm text-slate-500 dark:text-slate-400`}
        >
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
        const stName = serviceType?.name ?? "Hizmet";

        const replaceService = (next: Partial<ProjectService>) =>
          project.services.map((s) =>
            s.id === service.id ? { ...s, ...next } : s
          );

        return (
          <div key={service.id} className={`${cardCls} p-5`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {serviceType?.name ?? "Silinmiş hizmet türü"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {doneCount}/{stages.length} aşama tamamlandı
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={service.status}
                  onChange={(e) => {
                    const status = e.target.value as ProjectStatus;
                    patchProject(
                      project.id,
                      { services: replaceService({ status }) },
                      {
                        type: "DURUM_DEGISTI",
                        text: `${stName} durumu "${PROJECT_STATUS_LABELS[status]}" oldu`,
                        notify: true,
                      }
                    );
                  }}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-zinc-800 dark:text-slate-200"
                >
                  {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={service.targetDate ?? ""}
                  onChange={(e) => {
                    const targetDate = e.target.value || "";
                    patchProject(project.id, {
                      services: replaceService({ targetDate }),
                    });
                  }}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-zinc-800 dark:text-slate-200"
                />
                <DeleteButton
                  label="Kaldır"
                  confirmMessage={`"${stName}" hizmetini projeden kaldırmak istediğinize emin misiniz?`}
                  onDelete={() =>
                    patchProject(
                      project.id,
                      {
                        services: project.services.filter(
                          (s) => s.id !== service.id
                        ),
                      },
                      {
                        type: "HIZMET_KALDIRILDI",
                        text: `${stName} hizmeti kaldırıldı`,
                        notify: true,
                      }
                    )
                  }
                />
              </div>
            </div>

            {stages.length > 0 && (
              <ol className="mt-4 space-y-1.5 border-t border-slate-100 pt-4 dark:border-slate-700">
                {stages.map((stage) => {
                  const isDone = completed.has(stage.id);
                  return (
                    <li key={stage.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const completedStageIds = checked
                            ? [...service.completedStageIds, stage.id]
                            : service.completedStageIds.filter(
                                (sid) => sid !== stage.id
                              );
                          patchProject(
                            project.id,
                            { services: replaceService({ completedStageIds }) },
                            {
                              type: checked
                                ? "ASAMA_TAMAMLANDI"
                                : "ASAMA_GERI_ALINDI",
                              text: `${stName} · "${stage.name}" ${
                                checked ? "tamamlandı" : "geri alındı"
                              }`,
                              notify: true,
                            }
                          );
                        }}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      <span
                        className={
                          isDone
                            ? "text-sm text-slate-400 line-through dark:text-slate-500"
                            : "text-sm text-slate-700 dark:text-slate-200"
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
            const serviceTypeId = str(
              new FormData(e.currentTarget),
              "serviceTypeId"
            );
            if (!serviceTypeId) return;
            const stName =
              db.serviceTypes.find((s) => s.id === serviceTypeId)?.name ??
              "Hizmet";
            patchProject(
              project.id,
              {
                services: [
                  ...project.services,
                  {
                    id: uid(),
                    serviceTypeId,
                    status: "DEVAM_EDIYOR" as ProjectStatus,
                    completedStageIds: [],
                  },
                ],
              },
              {
                type: "HIZMET_EKLENDI",
                text: `${stName} hizmeti eklendi`,
                notify: true,
              }
            );
            e.currentTarget.reset();
          }}
          className={`${cardCls} flex items-center gap-2 border-dashed p-4`}
        >
          <select
            name="serviceTypeId"
            required
            defaultValue=""
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-zinc-800 dark:text-slate-200"
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
  const db = useApp();
  const drive = useDrive();
  const [kind, setKind] = useState<DocumentKind>("DIJITAL");
  const [uploading, setUploading] = useState(false);

  const documents = [...project.documents].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

  async function onDownload(docItem: ProjectDocument) {
    await addActivity(
      project.id,
      "EVRAK_INDIRILDI",
      `"${docItem.name}" evrakı açıldı/indirildi`
    );
  }

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

          const newDoc: ProjectDocument = {
            id: uid(),
            name: name!,
            kind,
            url,
            physicalLocation,
            projectServiceId,
            createdAt: new Date().toISOString(),
          };
          await patchProject(
            project.id,
            { documents: [...project.documents, newDoc] },
            {
              type: "EVRAK_YUKLENDI",
              text: `"${name}" evrakı eklendi`,
              notify: true,
            }
          );
          form.reset();
          setKind("DIJITAL");
        }}
        className={`${cardCls} space-y-3 p-5`}
      >
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          Yeni Evrak Ekle
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={smallLabelCls}>Evrak Adı</label>
            <input name="name" className={inputCls} />
          </div>
          <div>
            <label className={smallLabelCls}>İlişkili Hizmet</label>
            <select name="projectServiceId" defaultValue="" className={inputCls}>
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
                  className="mt-1 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-200 dark:text-slate-300 dark:file:bg-slate-700 dark:file:text-slate-200"
                />
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  Dosya, Drive&apos;daki &quot;{project.name}&quot; klasörüne
                  yüklenir. Evrak adı boşsa dosya adı kullanılır.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Dosyayı uygulama içinden yüklemek için Ayarlar &gt; Google
                Drive&apos;dan bağlanın; ya da aşağıya hazır bir link
                yapıştırın.
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
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-600">
          <thead className="bg-slate-50 dark:bg-zinc-800/60">
            <tr>
              <th className={thCls}>Evrak</th>
              <th className={thCls}>Tür</th>
              <th className={thCls}>Hizmet</th>
              <th className={thCls}>Konum / Bağlantı</th>
              <th className={thCls}>Tarih</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {documents.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400"
                >
                  Henüz evrak eklenmemiş.
                </td>
              </tr>
            )}
            {documents.map((docItem) => {
              const service = project.services.find(
                (s) => s.id === docItem.projectServiceId
              );
              const serviceType = service
                ? db.serviceTypes.find((st) => st.id === service.serviceTypeId)
                : undefined;
              return (
                <tr
                  key={docItem.id}
                  className="hover:bg-slate-50 dark:hover:bg-zinc-700/50"
                >
                  <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                    {docItem.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    {DOCUMENT_KIND_LABELS[docItem.kind]}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    {serviceType?.name ?? "Genel"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    {docItem.url && (
                      <a
                        href={docItem.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => onDownload(docItem)}
                        className="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Bağlantıyı Aç
                      </a>
                    )}
                    {docItem.physicalLocation && (
                      <span className={docItem.url ? "ml-2" : ""}>
                        {docItem.physicalLocation}
                      </span>
                    )}
                    {!docItem.url && !docItem.physicalLocation && "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    {format(new Date(docItem.createdAt), "d MMM yyyy", {
                      locale: tr,
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DeleteButton
                      confirmMessage={`"${docItem.name}" evrakını silmek istediğinize emin misiniz?`}
                      onDelete={() =>
                        patchProject(
                          project.id,
                          {
                            documents: project.documents.filter(
                              (d) => d.id !== docItem.id
                            ),
                          },
                          {
                            type: "EVRAK_SILINDI",
                            text: `"${docItem.name}" evrakı silindi`,
                          }
                        )
                      }
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

function NotesTab({ project }: { project: Project }) {
  const db = useApp();
  const me = db.me!;
  const notes = [...(project.noteList ?? [])].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

  return (
    <div className="space-y-4">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const text = str(new FormData(form), "note");
          if (!text) return;
          const newNote = {
            id: uid(),
            text,
            authorUid: me.uid,
            authorName: me.displayName,
            createdAt: new Date().toISOString(),
          };
          await patchProject(
            project.id,
            { noteList: [...(project.noteList ?? []), newNote] },
            {
              type: "NOT_EKLENDI",
              text: "Projeye not eklendi",
              notify: true,
            }
          );
          form.reset();
        }}
        className={`${cardCls} p-5`}
      >
        <label className={smallLabelCls}>Yeni Not</label>
        <textarea
          name="note"
          rows={3}
          placeholder="Projeyle ilgili bir not yazın..."
          className={inputCls}
        />
        <button type="submit" className={`${primaryBtnCls} mt-3`}>
          Not Ekle
        </button>
      </form>

      <div className={`${cardCls} p-5`}>
        {notes.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Henüz not eklenmemiş.
          </p>
        ) : (
          <ul className="space-y-3">
            {notes.map((note) => (
              <li
                key={note.id}
                className="rounded-xl border border-slate-100 p-3 dark:border-slate-700"
              >
                <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
                  {note.text}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    {note.authorName} ·{" "}
                    {formatDistanceToNow(new Date(note.createdAt), {
                      addSuffix: true,
                      locale: tr,
                    })}
                  </span>
                  {note.authorUid === me.uid && (
                    <button
                      onClick={() =>
                        patchProject(project.id, {
                          noteList: (project.noteList ?? []).filter(
                            (n) => n.id !== note.id
                          ),
                        })
                      }
                      className="text-[11px] font-medium text-red-500 hover:underline"
                    >
                      Sil
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const ACTIVITY_ICON: Record<string, string> = {
  PROJE_OLUSTURULDU: "🎉",
  PROJE_GUNCELLENDI: "✏️",
  DURUM_DEGISTI: "🔄",
  HIZMET_EKLENDI: "➕",
  HIZMET_KALDIRILDI: "➖",
  ASAMA_TAMAMLANDI: "✅",
  ASAMA_GERI_ALINDI: "↩️",
  EVRAK_YUKLENDI: "📎",
  EVRAK_INDIRILDI: "📥",
  EVRAK_SILINDI: "🗑️",
  NOT_EKLENDI: "📝",
  GOREVLI_ATANDI: "👤",
};

function ActivityTab({ project }: { project: Project }) {
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const db = useApp();

  useEffect(() => {
    let alive = true;
    loadActivities(project.id).then((list) => {
      if (alive) setActivities(list);
    });
    return () => {
      alive = false;
    };
    // proje güncellendikçe yeniden yükle
  }, [project.id, project.updatedAt, db.projects]);

  return (
    <div className={`${cardCls} p-5`}>
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
        Geçmiş Aktiviteler
      </h2>
      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
        Bu projede kim ne yaptı — dosya yükleme/indirme dahil.
      </p>
      {activities === null ? (
        <p className="mt-4 text-sm text-slate-400 dark:text-slate-500">
          Yükleniyor...
        </p>
      ) : activities.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          Henüz aktivite yok.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {activities.map((a) => (
            <li key={a.id} className="flex gap-3">
              <span className="mt-0.5 text-base">
                {ACTIVITY_ICON[a.type] ?? "•"}
              </span>
              <div>
                <p className="text-sm text-slate-700 dark:text-slate-200">
                  {a.text}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {a.byName} ·{" "}
                  {format(new Date(a.at), "d MMM yyyy HH:mm", { locale: tr })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
