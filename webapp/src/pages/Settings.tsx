import { useRef, useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { exportBackup, importBackup, mutate, uid, useDb } from "../store";
import {
  backupToDrive,
  connectDrive,
  disconnectDrive,
  getClientId,
  restoreFromDrive,
  setClientId,
  useDrive,
} from "../drive";
import type { ServiceType } from "../types";
import { cardCls, inputCls, primaryBtnCls, secondaryBtnCls, str } from "../ui";
import DeleteButton from "../components/DeleteButton";

export default function Settings() {
  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Ayarlar</h1>
        <p className="mt-1 text-sm text-slate-500">
          Google Drive bağlantısı, hizmet türleri ve veri yedekleme.
        </p>
      </div>

      <DriveSection />
      <ServiceTypesSection />
      <BackupSection />
    </div>
  );
}

function DriveSection() {
  const drive = useDrive();
  const [clientIdInput, setClientIdInput] = useState(getClientId());
  const [message, setMessage] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  return (
    <section className={`${cardCls} p-6`}>
      <h2 className="text-sm font-semibold text-slate-900">
        Google Drive Bağlantısı
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Bağlandığınızda dosyaları uygulama içinden doğrudan Drive&apos;ınıza
        yükleyebilirsiniz; verileriniz de her değişiklikten sonra
        Drive&apos;a otomatik yedeklenir. Uygulama yalnızca kendi
        oluşturduğu &quot;{"Mimarlık Ofisi Dosya Takip"}&quot; klasörüne
        erişir.
      </p>

      {!drive.configured && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Tek seferlik kurulum gerekli:</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>
              <a
                href="https://console.cloud.google.com/"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                console.cloud.google.com
              </a>{" "}
              adresine Google hesabınızla girin ve yeni bir proje oluşturun.
            </li>
            <li>
              <strong>APIs &amp; Services → Library</strong> bölümünden{" "}
              <strong>Google Drive API</strong>&apos;yi bulup{" "}
              <strong>Enable</strong> deyin.
            </li>
            <li>
              <strong>APIs &amp; Services → OAuth consent screen</strong>:
              External seçin, uygulama adı girin; &quot;Test users&quot;
              kısmına kendi Gmail adresinizi ekleyin.
            </li>
            <li>
              <strong>APIs &amp; Services → Credentials → Create
              Credentials → OAuth client ID</strong>: tür olarak{" "}
              <strong>Web application</strong> seçin;{" "}
              <strong>Authorized JavaScript origins</strong> kısmına{" "}
              <code>https://aligokten.github.io</code> yazın (redirect URI
              gerekmez).
            </li>
            <li>
              Oluşan <strong>Client ID</strong>&apos;yi (
              <code>...apps.googleusercontent.com</code> ile biter) aşağıya
              yapıştırıp kaydedin.
            </li>
          </ol>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={clientIdInput}
          onChange={(e) => setClientIdInput(e.target.value)}
          placeholder="Google Client ID (....apps.googleusercontent.com)"
          className={`${inputCls} mt-0 flex-1`}
        />
        <button
          type="button"
          onClick={() => {
            setClientId(clientIdInput);
            setMessage({
              ok: true,
              message: clientIdInput.trim()
                ? "Client ID kaydedildi. Şimdi \"Drive'a Bağlan\" butonuna tıklayın."
                : "Client ID silindi.",
            });
          }}
          className={secondaryBtnCls}
        >
          Kaydet
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!drive.connected ? (
          <button
            type="button"
            disabled={!drive.configured || drive.busy}
            onClick={() => {
              setMessage(null);
              connectDrive()
                .then(() =>
                  setMessage({ ok: true, message: "Google Drive bağlandı." })
                )
                .catch(() => {
                  // hata drive.error üzerinden gösterilir
                });
            }}
            className={`${primaryBtnCls} disabled:opacity-50`}
          >
            {drive.busy ? "Bağlanıyor..." : "Drive'a Bağlan"}
          </button>
        ) : (
          <>
            <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
              Bağlı{drive.email ? `: ${drive.email}` : ""}
            </span>
            <button
              type="button"
              disabled={drive.busy}
              onClick={() => {
                setMessage(null);
                backupToDrive()
                  .then(() =>
                    setMessage({
                      ok: true,
                      message: "Veriler Drive'a yedeklendi.",
                    })
                  )
                  .catch(() => {});
              }}
              className={secondaryBtnCls}
            >
              Verileri Şimdi Yedekle
            </button>
            <button
              type="button"
              disabled={drive.busy}
              onClick={() => {
                if (
                  !window.confirm(
                    "Drive'daki yedek, bu tarayıcıdaki mevcut verilerin üzerine yazılacak. Devam edilsin mi?"
                  )
                ) {
                  return;
                }
                setMessage(null);
                restoreFromDrive().then(setMessage);
              }}
              className={secondaryBtnCls}
            >
              Drive'daki Yedeği Geri Yükle
            </button>
            <button
              type="button"
              onClick={() => {
                disconnectDrive();
                setMessage({ ok: true, message: "Drive bağlantısı kesildi." });
              }}
              className="rounded-full border border-red-200 px-3.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Bağlantıyı Kes
            </button>
          </>
        )}
      </div>

      {drive.connected && (
        <p className="mt-3 text-xs text-slate-400">
          Otomatik yedekleme açık: her değişiklikten birkaç saniye sonra
          veriler Drive&apos;a kaydedilir.
          {drive.lastBackupAt &&
            ` Son yedek: ${format(new Date(drive.lastBackupAt), "d MMMM yyyy HH:mm", { locale: tr })}`}
        </p>
      )}
      {drive.error && (
        <p className="mt-3 text-sm text-red-600">{drive.error}</p>
      )}
      {message && (
        <p
          className={
            message.ok
              ? "mt-3 text-sm text-green-700"
              : "mt-3 text-sm text-red-600"
          }
        >
          {message.message}
        </p>
      )}
    </section>
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
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
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
              className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
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
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
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

