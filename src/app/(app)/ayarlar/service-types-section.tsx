"use client";

import { useState } from "react";
import {
  createServiceType,
  deleteServiceType,
  addStageTemplate,
  deleteStageTemplate,
} from "@/lib/actions/service-types";
import DeleteButton from "@/components/delete-button";

type StageTemplate = { id: string; name: string; order: number };
type ServiceType = {
  id: string;
  name: string;
  stages: StageTemplate[];
};

export default function ServiceTypesSection({
  serviceTypes,
  isAdmin,
}: {
  serviceTypes: ServiceType[];
  isAdmin: boolean;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-semibold text-slate-900">Hizmet Türleri</h2>
      <p className="mt-1 text-sm text-slate-500">
        Her hizmet türü için proje sürecinde takip edilecek aşamaları
        tanımlayın (ör. Mimari Proje, Akustik Rapor, Yapı Ruhsatı).
      </p>

      <div className="mt-4 space-y-4">
        {serviceTypes.map((serviceType) => (
          <ServiceTypeCard
            key={serviceType.id}
            serviceType={serviceType}
            isAdmin={isAdmin}
          />
        ))}
      </div>

      {isAdmin && (
        <form
          action={createServiceType}
          className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4"
        >
          <input
            name="name"
            required
            placeholder="Yeni hizmet türü adı"
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Ekle
          </button>
        </form>
      )}
    </section>
  );
}

function ServiceTypeCard({
  serviceType,
  isAdmin,
}: {
  serviceType: ServiceType;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const addStage = addStageTemplate.bind(null, serviceType.id);
  const deleteServiceTypeWithId = deleteServiceType.bind(null, serviceType.id);

  return (
    <div className="rounded-lg border border-slate-200">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-sm font-medium text-slate-900"
        >
          {open ? "▾" : "▸"} {serviceType.name}{" "}
          <span className="font-normal text-slate-400">
            ({serviceType.stages.length} aşama)
          </span>
        </button>
        {isAdmin && (
          <DeleteButton
            action={deleteServiceTypeWithId}
            confirmMessage={`"${serviceType.name}" hizmet türünü silmek istediğinize emin misiniz?`}
          />
        )}
      </div>
      {open && (
        <div className="border-t border-slate-100 px-4 py-3">
          <ol className="space-y-1">
            {serviceType.stages.map((stage, idx) => (
              <li
                key={stage.id}
                className="flex items-center justify-between text-sm text-slate-700"
              >
                <span>
                  {idx + 1}. {stage.name}
                </span>
                {isAdmin && (
                  <DeleteButton
                    action={deleteStageTemplate.bind(null, stage.id)}
                    confirmMessage={`"${stage.name}" aşamasını silmek istediğinize emin misiniz?`}
                  />
                )}
              </li>
            ))}
            {serviceType.stages.length === 0 && (
              <li className="text-sm text-slate-400">Aşama eklenmemiş.</li>
            )}
          </ol>
          {isAdmin && (
            <form action={addStage} className="mt-3 flex items-center gap-2">
              <input
                name="name"
                required
                placeholder="Yeni aşama adı"
                className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
              <button
                type="submit"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Aşama Ekle
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
