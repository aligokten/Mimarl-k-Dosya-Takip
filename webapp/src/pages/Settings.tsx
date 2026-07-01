import { useRef, useState } from "react";
import { exportBackup, importBackup, mutate, uid, useDb } from "../store";
import type { ServiceType } from "../types";
import { cardCls, primaryBtnCls, secondaryBtnCls, str } from "../ui";
import DeleteButton from "../components/DeleteButton";

export default function Settings() {
  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Ayarlar</h1>
        <p className="mt-1 text-sm text-slate-500">
          Hizmet türleri, aşama şablonları ve veri yedekleme.
        </p>
      </div>

      <ServiceTypesSection />
      <BackupSection />
      <RoadmapSection />
    </div>
  );
}

function ServiceTypesSection() {
  const db = useDb();

  return (
    <section className={`${cardCls} p-6`}>
      <h2 className="text-sm font-semibold text-slate-900">Hizmet Türleri</h2>
      <p className="mt-1 text-sm text-slate-500">
        Her hizmet türü için proje sürecinde takip edilecek aşamaları
        tanımlayın (ör. Mimari Proje, Akustik Rapor, Yapı Ruhsatı).
      </p>

      <div className="mt-4 space-y-4">
        {db.serviceTypes.map((serviceType) => (
          <ServiceTypeCard key={serviceType.id} serviceType={serviceType} />
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const name = str(new FormData(e.currentTarget), "name");
          if (!name) return;
          mutate((draft) => {
            draft.serviceTypes.push({ id: uid(), name, stages: [] });
          });
          e.currentTarget.reset();
        }}
        className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4"
      >
        <input
          name="name"
          required
          placeholder="Yeni hizmet türü adı"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
        <button type="submit" className={primaryBtnCls}>
          Ekle
        </button>
      </form>
    </section>
  );
}

function ServiceTypeCard({ serviceType }: { serviceType: ServiceType }) {
  const db = useDb();
  const [open, setOpen] = useState(false);
  const usedByProjects = db.projects.filter((p) =>
    p.services.some((s) => s.serviceTypeId === serviceType.id)
  ).length;

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
        <DeleteButton
          confirmMessage={
            usedByProjects > 0
              ? `"${serviceType.name}" ${usedByProjects} projede kullanılıyor. Silinirse bu projelerdeki hizmet kayıtları da kaldırılır. Emin misiniz?`
              : `"${serviceType.name}" hizmet türünü silmek istediğinize emin misiniz?`
          }
          onDelete={() => {
            mutate((draft) => {
              draft.serviceTypes = draft.serviceTypes.filter(
                (st) => st.id !== serviceType.id
              );
              draft.projects.forEach((p) => {
                p.services = p.services.filter(
                  (s) => s.serviceTypeId !== serviceType.id
                );
              });
            });
          }}
        />
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
                <DeleteButton
                  confirmMessage={`"${stage.name}" aşamasını silmek istediğinize emin misiniz?`}
                  onDelete={() => {
                    mutate((draft) => {
                      const target = draft.serviceTypes.find(
                        (st) => st.id === serviceType.id
                      );
                      if (target) {
                        target.stages = target.stages.filter(
                          (s) => s.id !== stage.id
                        );
                      }
                    });
                  }}
                />
              </li>
            ))}
            {serviceType.stages.length === 0 && (
              <li className="text-sm text-slate-400">Aşama eklenmemiş.</li>
            )}
          </ol>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const name = str(new FormData(e.currentTarget), "name");
              if (!name) return;
              mutate((draft) => {
                const target = draft.serviceTypes.find(
                  (st) => st.id === serviceType.id
                );
                if (target) target.stages.push({ id: uid(), name });
              });
              e.currentTarget.reset();
            }}
            className="mt-3 flex items-center gap-2"
          >
            <input
              name="name"
              required
              placeholder="Yeni aşama adı"
              className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
            <button type="submit" className={secondaryBtnCls}>
              Aşama Ekle
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function BackupSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  return (
    <section className={`${cardCls} p-6`}>
      <h2 className="text-sm font-semibold text-slate-900">Veri Yedekleme</h2>
      <p className="mt-1 text-sm text-slate-500">
        Tüm veriler bu tarayıcıda saklanır. Bilgisayar değişikliği veya veri
        kaybına karşı düzenli olarak yedek alın. Yedek dosyasını başka bir
        bilgisayarda &quot;Yedeği Geri Yükle&quot; ile açabilirsiniz.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={exportBackup} className={primaryBtnCls}>
          Yedek Al (İndir)
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Yedeği Geri Yükle
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            if (
              !window.confirm(
                "Yedeği geri yüklemek buradaki mevcut verilerin üzerine yazar. Devam edilsin mi?"
              )
            ) {
              return;
            }
            const text = await file.text();
            setMessage(importBackup(text));
          }}
        />
      </div>
      {message && (
        <p
          className={
            message.ok ? "mt-3 text-sm text-green-700" : "mt-3 text-sm text-red-600"
          }
        >
          {message.message}
        </p>
      )}
    </section>
  );
}

function RoadmapSection() {
  return (
    <section className={`${cardCls} p-6`}>
      <h2 className="text-sm font-semibold text-slate-900">
        Yol Haritası (sonraki aşamalar)
      </h2>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
        <li>
          Google Drive entegrasyonu: dosyaları uygulama içinden doğrudan
          Drive&apos;a yükleme ve verilerin Drive&apos;da otomatik
          yedeklenmesi.
        </li>
        <li>Cihazlar arası otomatik eşitleme.</li>
        <li>Kullanıcı hesapları ve yetkilendirme.</li>
      </ul>
    </section>
  );
}
