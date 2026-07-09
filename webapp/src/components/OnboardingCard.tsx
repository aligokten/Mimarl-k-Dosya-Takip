import { useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { updateOfficeOnboarding, useApp } from "../data";
import { useDrive } from "../drive";
import { cardCls } from "../ui";

function officeValue<T = unknown>(office: unknown, key: string): T | undefined {
  return (office as Record<string, T> | null)?.[key];
}

function hasUploadedDocument(projects: Array<{ documents?: unknown[] }>) {
  return projects.some((project) => (project.documents || []).length > 0);
}

function onboardingStorageKey(office: unknown): string {
  const data = office as { id?: string; officeId?: string; name?: string } | null;
  return `ruhsat360:onboarding:hidden:${data?.officeId || data?.id || data?.name || "default"}`;
}

function readOnboardingHidden(office: unknown): boolean {
  try {
    return localStorage.getItem(onboardingStorageKey(office)) === "1";
  } catch {
    return false;
  }
}

function writeOnboardingHidden(office: unknown, hidden: boolean) {
  try {
    const key = onboardingStorageKey(office);

    if (hidden) {
      localStorage.setItem(key, "1");
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // localStorage erişilemezse sessiz geç.
  }
}

export default function OnboardingCard() {
  const app = useApp();
  const drive = useDrive();
  const [localHidden, setLocalHidden] = useState(() =>
    readOnboardingHidden(app.office)
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const hidden =
    localHidden || !!officeValue<boolean>(app.office, "onboardingHidden");

  if (hidden || app.platformOfficePreview) {
    return null;
  }

  const officeName = app.office?.name || "Ofisiniz";
  const hasOfficeProfile =
    !!app.office?.name &&
    !!officeValue<string>(app.office, "ownerEmail");

  const steps = [
    {
      key: "office",
      title: "Ofis profilinizi oluşturun",
      text: "Ofis adı ve yönetici hesabı tanımlı.",
      done: hasOfficeProfile,
      to: "/ayarlar",
      cta: "Ayarlar",
    },
    {
      key: "team",
      title: "Ekibinizi davet edin",
      text: "Çalışanlarınızı ekleyerek görev ve dosya takibini birlikte yönetin.",
      done: app.members.length + app.invites.length > 1,
      to: "/ekip",
      cta: "Ekip Yönetimi",
    },
    {
      key: "contacts",
      title: "İlk kişiyi ekleyin",
      text: "Müşteri, arsa sahibi veya müteahhit kaydı oluşturun.",
      done: app.contacts.length > 0,
      to: "/kisiler/yeni",
      cta: "Kişi Ekle",
    },
    {
      key: "project",
      title: "İlk projenizi oluşturun",
      text: "Ruhsat, mimari proje veya akustik rapor sürecinizi başlatın.",
      done: app.projects.length > 0,
      to: "/projeler/yeni",
      cta: "Proje Oluştur",
    },
    {
      key: "drive",
      title: "Google Drive bağlantısını kontrol edin",
      text: "Evrakların güvenli şekilde Drive üzerinden saklanması için bağlantıyı kurun.",
      done: drive.connected,
      to: "/ayarlar",
      cta: "Drive Ayarları",
    },
    {
      key: "document",
      title: "İlk evrakı kaydedin",
      text: "Proje içine dijital dosya veya hazır Drive bağlantısı ekleyin.",
      done: hasUploadedDocument(app.projects),
      to: "/projeler",
      cta: "Projeler",
    },
  ];

  const doneCount = steps.filter((step) => step.done).length;
  const percent = Math.round((doneCount / steps.length) * 100);

  async function hideOnboarding() {
    setBusy(true);
    setError("");

    setLocalHidden(true);
    writeOnboardingHidden(app.office, true);

    try {
      await updateOfficeOnboarding({
        onboardingHidden: true,
        onboardingCompletedAt:
          doneCount === steps.length ? new Date().toISOString() : undefined,
      });
    } catch {
      // Rehber yerel olarak gizlendi. Firestore yazımı başarısız olsa da kullanıcı akışı kesilmez.
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`${cardCls} overflow-hidden`}>
      <div className="border-b border-slate-100 bg-gradient-to-br from-orange-50 to-white px-5 py-5 dark:border-zinc-700 dark:from-orange-500/10 dark:to-transparent">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-orange-500">
              Başlangıç rehberi
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Ruhsat360’a hoş geldiniz
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              {officeName} için paneli kullanıma hazır hale getirmek üzere temel adımları tamamlayın.
            </p>
          </div>

          <div className="min-w-[140px] rounded-2xl bg-white/80 p-4 text-center shadow-sm ring-1 ring-slate-200 dark:bg-zinc-800/80 dark:ring-zinc-700">
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
              %{percent}
            </div>
            <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              {doneCount}/{steps.length} tamamlandı
            </div>
          </div>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/80 ring-1 ring-slate-100 dark:bg-zinc-800 dark:ring-zinc-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="grid gap-3 p-5 md:grid-cols-2">
        {steps.map((step) => (
          <div
            key={step.key}
            className={clsx(
              "rounded-2xl border p-4 transition",
              step.done
                ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/20"
                : "border-slate-200 bg-white/70 hover:bg-white dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:bg-zinc-800"
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={clsx(
                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-extrabold",
                  step.done
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-400 dark:bg-zinc-700 dark:text-slate-300"
                )}
              >
                {step.done ? "✓" : "•"}
              </span>

              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {step.text}
                </p>

                {!step.done && (
                  <Link
                    to={step.to}
                    className="mt-3 inline-flex rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    {step.cta} →
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 dark:border-zinc-700">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Bu rehberi kapatsanız bile ayarlardan tekrar açabilirsiniz.
          </p>
          {error && (
            <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={hideOnboarding}
          disabled={busy}
          className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-60 dark:bg-zinc-700 dark:text-slate-200 dark:hover:bg-zinc-600"
        >
          {busy ? "Gizleniyor..." : "Rehberi Gizle"}
        </button>
      </div>
    </section>
  );
}
