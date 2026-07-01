"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  addServiceToProject,
  removeServiceFromProject,
  updateProjectServiceDates,
  toggleStageCompletion,
} from "@/lib/actions/projects";
import { PROJECT_STATUS_LABELS } from "@/lib/status-labels";
import DeleteButton from "@/components/delete-button";

type StageTemplate = { id: string; name: string; order: number };
type ProjectServiceStage = {
  stageTemplateId: string;
  completed: boolean;
};
type ProjectService = {
  id: string;
  status: string;
  targetDate: Date | null;
  serviceType: { id: string; name: string; stages: StageTemplate[] };
  stages: ProjectServiceStage[];
};
type Project = {
  id: string;
  services: ProjectService[];
};

export default function ServicesTab({
  project,
  allServiceTypes,
}: {
  project: Project;
  allServiceTypes: { id: string; name: string }[];
}) {
  const usedServiceTypeIds = new Set(
    project.services.map((s) => s.serviceType.id)
  );
  const availableServiceTypes = allServiceTypes.filter(
    (st) => !usedServiceTypeIds.has(st.id)
  );
  const addService = addServiceToProject.bind(null, project.id);

  return (
    <div className="space-y-4">
      {project.services.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          Bu projeye henüz hizmet eklenmemiş.
        </div>
      )}

      {project.services.map((service) => (
        <ServiceCard key={service.id} projectId={project.id} service={service} />
      ))}

      {availableServiceTypes.length > 0 && (
        <form
          action={addService}
          className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white p-4"
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
            {availableServiceTypes.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Hizmet Ekle
          </button>
        </form>
      )}
    </div>
  );
}

function ServiceCard({
  projectId,
  service,
}: {
  projectId: string;
  service: ProjectService;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [completedIds, setCompletedIds] = useState(
    () =>
      new Set(
        service.stages.filter((s) => s.completed).map((s) => s.stageTemplateId)
      )
  );
  const totalStages = service.serviceType.stages.length;
  const doneStages = service.serviceType.stages.filter((st) =>
    completedIds.has(st.id)
  ).length;

  const updateDates = updateProjectServiceDates.bind(
    null,
    projectId,
    service.id
  );
  const removeService = removeServiceFromProject.bind(
    null,
    projectId,
    service.id
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {service.serviceType.name}
          </p>
          <p className="text-xs text-slate-500">
            {doneStages}/{totalStages} aşama tamamlandı
          </p>
        </div>
        <div className="flex items-center gap-3">
          <form action={updateDates} className="flex items-center gap-2">
            <select
              name="status"
              defaultValue={service.status}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-xs focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input
              type="date"
              name="targetDate"
              defaultValue={
                service.targetDate
                  ? format(service.targetDate, "yyyy-MM-dd")
                  : ""
              }
              className="rounded-md border border-slate-300 px-2 py-1.5 text-xs focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
            <button
              type="submit"
              className="rounded-md border border-slate-300 px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Kaydet
            </button>
          </form>
          <DeleteButton
            action={removeService}
            confirmMessage={`"${service.serviceType.name}" hizmetini projeden kaldırmak istediğinize emin misiniz?`}
            label="Kaldır"
          />
        </div>
      </div>

      {totalStages > 0 && (
        <ol className="mt-4 space-y-1.5 border-t border-slate-100 pt-4">
          {service.serviceType.stages.map((stage) => {
            const completed = completedIds.has(stage.id);
            return (
              <li key={stage.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={completed}
                  disabled={isPending}
                  onChange={(e) => {
                    const nextChecked = e.currentTarget.checked;
                    setCompletedIds((prev) => {
                      const next = new Set(prev);
                      if (nextChecked) next.add(stage.id);
                      else next.delete(stage.id);
                      return next;
                    });
                    startTransition(async () => {
                      await toggleStageCompletion(
                        projectId,
                        service.id,
                        stage.id,
                        nextChecked
                      );
                      router.refresh();
                    });
                  }}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span
                  className={
                    completed
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
}
