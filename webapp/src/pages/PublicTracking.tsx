import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { loadPublicShare } from "../data";
import { PROJECT_STATUS_LABELS, type PublicShare } from "../types";

// Müşteriye verilen girişsiz takip sayfası. Ofis, proje detayında "Müşteri
// Takip Linki" oluşturduğunda publicShares/{token} altında sanitize edilmiş
// bir kopya tutulur; bu sayfa yalnızca o kopyayı okur (kimlik doğrulaması
// gerektirmez).
export default function PublicTracking() {
  const { token } = useParams<{ token: string }>();
  const [share, setShare] = useState<PublicShare | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "notfound">("loading");

  useEffect(() => {
    let alive = true;
    if (!token) {
      setState("notfound");
      return;
    }
    loadPublicShare(token)
      .then((data) => {
        if (!alive) return;
        if (data) {
          setShare(data);
          setState("ok");
        } else {
          setState("notfound");
        }
      })
      .catch(() => alive && setState("notfound"));
    return () => {
      alive = false;
    };
  }, [token]);

  const marketingUrl = "https://ruhsat360.com";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 px-4 py-8 dark:from-zinc-950 dark:to-zinc-900">
      <div className="mx-auto w-full max-w-2xl">
        {state === "loading" && (
          <div className="flex items-center justify-center gap-3 rounded-2xl bg-white p-6 shadow dark:bg-zinc-800">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Yükleniyor...
            </span>
          </div>
        )}

        {state === "notfound" && (
          <div className="rounded-3xl bg-white p-8 text-center shadow dark:bg-zinc-800">
            <h1 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Takip bağlantısı bulunamadı
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Bu takip bağlantısı kapatılmış veya süresi geçmiş olabilir. Lütfen
              ilgili mimarlık ofisiyle iletişime geçin.
            </p>
          </div>
        )}

        {state === "ok" && share && (
          <>
            <div className="mb-4 flex items-center gap-2.5">
              <img
                src={`${import.meta.env.BASE_URL}brand/app-icon-512.png`}
                alt="Ruhsat360"
                className="h-9 w-9 rounded-xl shadow-sm"
              />
              <div className="leading-tight">
                <div className="text-base font-extrabold text-slate-900 dark:text-white">
                  {share.officeName}
                </div>
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Ruhsat360 · proje takibi
                </div>
              </div>
            </div>

            {/* İlerleme kartı (marka kimliği) */}
            <section className="rounded-[1.75rem] bg-[#0c1a2e] p-6 shadow-[0_18px_50px_rgba(8,15,30,0.35)] ring-1 ring-white/10">
              <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                {share.projectName}
              </h1>
              <p className="mt-1 text-xs text-slate-400">
                {[
                  share.neighborhood,
                  share.district,
                  share.province,
                  share.ada && `Ada ${share.ada}`,
                  share.parsel && `Parsel ${share.parsel}`,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Proje durumu"}
              </p>
              <p className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                {share.percent}
                <span className="font-semibold text-slate-500">%</span>
              </p>
              <div className="relative mt-3 h-9 overflow-hidden rounded-full bg-white/10">
                {share.percent > 0 && (
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-orange-600"
                    style={{ width: `${Math.max(share.percent, 5)}%` }}
                  />
                )}
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Genel durum:{" "}
                <span className="font-semibold text-slate-200">
                  {PROJECT_STATUS_LABELS[share.status]}
                </span>{" "}
                · Son güncelleme:{" "}
                {format(new Date(share.updatedAt), "d MMMM yyyy HH:mm", {
                  locale: tr,
                })}
              </p>
            </section>

            {/* Hizmet aşamaları */}
            <div className="mt-4 space-y-3">
              {share.services.length === 0 && (
                <div className="rounded-2xl bg-white p-5 text-sm text-slate-500 shadow dark:bg-zinc-800 dark:text-slate-400">
                  Bu proje için henüz hizmet aşaması tanımlanmadı.
                </div>
              )}
              {share.services.map((service, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-white p-5 shadow dark:bg-zinc-800"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      {service.serviceName}
                    </h2>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-zinc-700 dark:text-slate-300">
                      {PROJECT_STATUS_LABELS[service.status]}
                    </span>
                  </div>
                  {service.targetDate && (
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      Hedef tarih:{" "}
                      {format(new Date(service.targetDate), "d MMMM yyyy", {
                        locale: tr,
                      })}
                    </p>
                  )}
                  {service.stages.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {service.stages.map((stage, j) => (
                        <li key={j} className="flex items-center gap-2 text-sm">
                          <span
                            className={
                              stage.done
                                ? "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[11px] text-white"
                                : "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 text-transparent dark:border-slate-600"
                            }
                          >
                            ✓
                          </span>
                          <span
                            className={
                              stage.done
                                ? "text-slate-700 dark:text-slate-200"
                                : "text-slate-400 dark:text-slate-500"
                            }
                          >
                            {stage.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            {/* Alt bilgi / CTA */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white/70 p-4 text-center text-xs text-slate-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-slate-400">
              Bu sayfa <span className="font-semibold">{share.officeName}</span>{" "}
              tarafından Ruhsat360 ile paylaşılmıştır.
              <a
                href={marketingUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block font-semibold text-orange-600 hover:underline dark:text-orange-400"
              >
                Kendi mimarlık ofisiniz için Ruhsat360&apos;ı keşfedin →
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
