import { useState } from "react";
import { Link } from "react-router-dom";
import {
  addServiceType,
  addStage,
  deleteServiceType,
  deleteStage,
  useApp,
} from "../data";
import { connectDrive, disconnectDrive, getClientId, setClientId, useDrive } from "../drive";
import {
  AI_MODELS,
  getAiKey,
  getAiModel,
  setAiKey,
  setAiModel,
  useAiConfigured,
} from "../ai";
import type { ServiceType } from "../types";
import { cardCls, inputCls, primaryBtnCls, secondaryBtnCls, str } from "../ui";
import PageTitle from "../components/PageTitle";
import { GearIcon } from "../components/icons";
import DeleteButton from "../components/DeleteButton";

export default function Settings() {
  const app = useApp();
  return (
    <div className="max-w-3xl space-y-8">
      <PageTitle
        icon={<GearIcon className="h-5 w-5" />}
        title="Ayarlar"
        subtitle="Hizmet türleri, dosya depolama ve ekip."
      />

      {app.me?.role === "ADMIN" && (
        <section className={`${cardCls} flex flex-wrap items-center gap-3 p-6`}>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Ekip & Davet
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Çalışanları davet edin, rolleri düzenleyin.
            </p>
          </div>
          <Link to="/ekip" className={primaryBtnCls}>
            Ekip Yönetimi
          </Link>
        </section>
      )}

      <AiSection />
      <DriveSection />
      <ServiceTypesSection />
    </div>
  );
}

function AiSection() {
  const configured = useAiConfigured();
  const [keyInput, setKeyInput] = useState(getAiKey());
  const [model, setModel] = useState(getAiModel());
  const [message, setMessage] = useState<string | null>(null);

  return (
    <section className={`${cardCls} p-6`}>
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
        AI Asistan (İmar Mevzuatı)
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Paneldeki İmar Asistanı, sorularınızı imar mevzuatından yararlanarak
        yanıtlar. Çalışması için ücretsiz bir Google Gemini API anahtarı girin.
        Anahtar yalnızca bu tarayıcıda saklanır.
      </p>

      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
        <p className="font-semibold">Anahtar nasıl alınır (ücretsiz):</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              aistudio.google.com/app/apikey
            </a>{" "}
            adresine Google hesabınızla girin.
          </li>
          <li>
            <strong>Create API key</strong> deyin ve verilen anahtarı kopyalayın.
          </li>
          <li>Anahtarı aşağıya yapıştırıp kaydedin.</li>
        </ol>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          type="password"
          placeholder="Gemini API anahtarı (AIza...)"
          className={`${inputCls} mt-0 flex-1`}
        />
        <button
          type="button"
          onClick={() => {
            setAiKey(keyInput);
            setMessage(
              keyInput.trim()
                ? "AI anahtarı kaydedildi. Panelde İmar Asistanı'na soru sorabilirsiniz."
                : "AI anahtarı silindi."
            );
          }}
          className={secondaryBtnCls}
        >
          Kaydet
        </button>
      </div>

      <div className="mt-4">
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
          Model (kota dolarsa değiştirin)
        </label>
        <select
          value={model}
          onChange={(e) => {
            setModel(e.target.value);
            setAiModel(e.target.value);
            setMessage(`Model "${e.target.value}" olarak ayarlandı.`);
          }}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-600 dark:bg-zinc-800 dark:text-slate-100"
        >
          {AI_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Ücretsiz katmanın günlük/dakikalık istek sınırı vardır. Bir model
          &quot;kota doldu&quot; derse buradan başka bir modele geçebilirsiniz.
        </p>
      </div>

      <div className="mt-3">
        {configured ? (
          <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700 dark:border-green-500/30 dark:bg-green-500/15 dark:text-green-300">
            AI Asistan etkin
          </span>
        ) : (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500 dark:border-slate-600 dark:bg-zinc-800 dark:text-slate-400">
            Henüz anahtar girilmedi
          </span>
        )}
      </div>
      {message && (
        <p className="mt-3 text-sm text-green-700 dark:text-green-300">
          {message}
        </p>
      )}
    </section>
  );
}

function DriveSection() {
  const drive = useDrive();
  const [clientIdInput, setClientIdInput] = useState(getClientId());
  const [message, setMessage] = useState<{ ok: boolean; message: string } | null>(
    null
  );

  return (
    <section className={`${cardCls} p-6`}>
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
        Google Drive (Dosya Depolama)
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Evrak dosyaları uygulama içinden doğrudan Drive&apos;a yüklensin
        istiyorsanız bağlanın. (Proje verileri artık bulut veritabanında
        tutulur; Drive yalnızca dosyalar içindir.)
      </p>

      {!drive.configured && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <p className="font-semibold">Kurulum:</p>
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
              → proje → Google Drive API&apos;yi etkinleştirin.
            </li>
            <li>
              OAuth consent screen (External) + Test users&apos;a e-postanızı
              ekleyin.
            </li>
            <li>
              Credentials → OAuth client ID → Web application; Authorized
              JavaScript origins: <code>https://aligokten.github.io</code>.
            </li>
            <li>Client ID&apos;yi aşağıya yapıştırın.</li>
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
                ? "Client ID kaydedildi. Şimdi \"Drive'a Bağlan\"a tıklayın."
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
                .catch(() => {});
            }}
            className={`${primaryBtnCls} disabled:opacity-50`}
          >
            {drive.busy ? "Bağlanıyor..." : "Drive'a Bağlan"}
          </button>
        ) : (
          <>
            <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700 dark:border-green-500/30 dark:bg-green-500/15 dark:text-green-300">
              Bağlı{drive.email ? `: ${drive.email}` : ""}
            </span>
            <button
              type="button"
              onClick={() => {
                disconnectDrive();
                setMessage({ ok: true, message: "Drive bağlantısı kesildi." });
              }}
              className="rounded-full border border-red-200 px-3.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              Bağlantıyı Kes
            </button>
          </>
        )}
      </div>
      {drive.error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">
          {drive.error}
        </p>
      )}
      {message && (
        <p
          className={
            message.ok
              ? "mt-3 text-sm text-green-700 dark:text-green-300"
              : "mt-3 text-sm text-red-600 dark:text-red-400"
          }
        >
          {message.message}
        </p>
      )}
    </section>
  );
}

function ServiceTypesSection() {
  const db = useApp();

  return (
    <section className={`${cardCls} p-6`}>
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
        Hizmet Türleri
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Her hizmet türü için proje sürecinde takip edilecek aşamaları
        tanımlayın (ör. Mimari Proje, Akustik Rapor, Yapı Ruhsatı).
      </p>

      <div className="mt-4 space-y-4">
        {[...db.serviceTypes]
          .sort((a, b) => a.name.localeCompare(b.name, "tr"))
          .map((serviceType) => (
            <ServiceTypeCard key={serviceType.id} serviceType={serviceType} />
          ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const name = str(new FormData(e.currentTarget), "name");
          if (!name) return;
          addServiceType(name);
          e.currentTarget.reset();
        }}
        className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-700"
      >
        <input
          name="name"
          required
          placeholder="Yeni hizmet türü adı"
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-zinc-900/60 dark:text-slate-100"
        />
        <button type="submit" className={primaryBtnCls}>
          Ekle
        </button>
      </form>
    </section>
  );
}

function ServiceTypeCard({ serviceType }: { serviceType: ServiceType }) {
  const db = useApp();
  const [open, setOpen] = useState(false);
  const usedByProjects = db.projects.filter((p) =>
    p.services.some((s) => s.serviceTypeId === serviceType.id)
  ).length;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-600">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-sm font-medium text-slate-900 dark:text-white"
        >
          {open ? "▾" : "▸"} {serviceType.name}{" "}
          <span className="font-normal text-slate-400 dark:text-slate-500">
            ({serviceType.stages.length} aşama)
          </span>
        </button>
        <DeleteButton
          confirmMessage={
            usedByProjects > 0
              ? `"${serviceType.name}" ${usedByProjects} projede kullanılıyor. Yine de silinsin mi? (Projelerdeki mevcut hizmet kayıtları kalır.)`
              : `"${serviceType.name}" hizmet türünü silmek istediğinize emin misiniz?`
          }
          onDelete={() => deleteServiceType(serviceType.id)}
        />
      </div>
      {open && (
        <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-700">
          <ol className="space-y-1">
            {serviceType.stages.map((stage, idx) => (
              <li
                key={stage.id}
                className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-200"
              >
                <span>
                  {idx + 1}. {stage.name}
                </span>
                <DeleteButton
                  confirmMessage={`"${stage.name}" aşamasını silmek istediğinize emin misiniz?`}
                  onDelete={() => deleteStage(serviceType.id, stage.id)}
                />
              </li>
            ))}
            {serviceType.stages.length === 0 && (
              <li className="text-sm text-slate-400 dark:text-slate-500">
                Aşama eklenmemiş.
              </li>
            )}
          </ol>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const name = str(new FormData(e.currentTarget), "name");
              if (!name) return;
              addStage(serviceType.id, name);
              e.currentTarget.reset();
            }}
            className="mt-3 flex items-center gap-2"
          >
            <input
              name="name"
              required
              placeholder="Yeni aşama adı"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-zinc-900/60 dark:text-slate-100"
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
