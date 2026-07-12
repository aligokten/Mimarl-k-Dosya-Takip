import { useState } from "react";
import { createPortal } from "react-dom";
import { createLeaveRequest } from "../data";
import { uploadSharedPdf, useDrive } from "../drive";
import { inputCls, primaryBtnCls, secondaryBtnCls, smallLabelCls } from "../ui";
import type { LeaveKind } from "../types";
import DocScanner from "./DocScanner";

// Personelin yeni izin talebi (yıllık izin veya sağlık raporu) oluşturduğu
// açılır pencere. Sağlık raporu seçilirse, Evraklar'daki gibi kamera/galeri
// ile tarayıp Drive'a yükleyebilir.
export default function LeaveRequestModal({
  memberName,
  onClose,
}: {
  memberName: string;
  onClose: () => void;
}) {
  const drive = useDrive();
  const [kind, setKind] = useState<LeaveKind>("YILLIK");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [reportDiagnosis, setReportDiagnosis] = useState("");
  const [reportHospital, setReportHospital] = useState("");
  const [reportDoctor, setReportDoctor] = useState("");
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!startDate || !endDate) {
      setError("Başlangıç ve bitiş tarihini seçin.");
      return;
    }
    if (endDate < startDate) {
      setError("Bitiş tarihi başlangıçtan önce olamaz.");
      return;
    }

    setBusy(true);
    try {
      let reportFileUrl: string | undefined;
      let reportPreviewUrl: string | undefined;

      if (kind === "RAPOR" && reportFile) {
        const uploaded = await uploadSharedPdf(
          reportFile,
          `Sağlık Raporları - ${memberName}`
        );
        reportFileUrl = uploaded.webViewLink;
        reportPreviewUrl = uploaded.previewUrl;
      }

      await createLeaveRequest({
        kind,
        startDate,
        endDate,
        reason: kind === "YILLIK" ? reason.trim() || undefined : undefined,
        reportDiagnosis: kind === "RAPOR" ? reportDiagnosis.trim() || undefined : undefined,
        reportHospital: kind === "RAPOR" ? reportHospital.trim() || undefined : undefined,
        reportDoctor: kind === "RAPOR" ? reportDoctor.trim() || undefined : undefined,
        reportFileUrl,
        reportPreviewUrl,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Talep oluşturulamadı.");
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-zinc-700">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Yeni İzin Talebi
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="max-h-[75vh] space-y-4 overflow-y-auto p-5">
          <div>
            <label className={smallLabelCls}>Talep Türü</label>
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={() => setKind("YILLIK")}
                className={
                  kind === "YILLIK"
                    ? "rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-white dark:text-slate-900"
                    : "rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-600 dark:text-slate-300"
                }
              >
                Yıllık İzin
              </button>
              <button
                type="button"
                onClick={() => setKind("RAPOR")}
                className={
                  kind === "RAPOR"
                    ? "rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-white dark:text-slate-900"
                    : "rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-600 dark:text-slate-300"
                }
              >
                Sağlık Raporu
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <label className={smallLabelCls}>Başlangıç Tarihi</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`${inputCls} min-w-0`}
                required
              />
            </div>
            <div className="min-w-0">
              <label className={smallLabelCls}>Bitiş Tarihi</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`${inputCls} min-w-0`}
                required
              />
            </div>
          </div>

          {kind === "YILLIK" ? (
            <div>
              <label className={smallLabelCls}>Not (isteğe bağlı)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className={inputCls}
                placeholder="Ör: Aile ziyareti"
              />
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-slate-100 p-3 dark:border-zinc-700">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={smallLabelCls}>Teşhis / Sebep</label>
                  <input
                    value={reportDiagnosis}
                    onChange={(e) => setReportDiagnosis(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={smallLabelCls}>Hastane / Klinik</label>
                  <input
                    value={reportHospital}
                    onChange={(e) => setReportHospital(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className={smallLabelCls}>Doktor (isteğe bağlı)</label>
                <input
                  value={reportDoctor}
                  onChange={(e) => setReportDoctor(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={smallLabelCls}>Rapor Belgesi</label>
                {drive.connected ? (
                  <>
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      onChange={(e) => setReportFile(e.target.files?.[0] ?? null)}
                      className="mt-1 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-200 dark:text-slate-300 dark:file:bg-slate-700 dark:file:text-slate-200"
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setScanOpen(true)}
                        className={secondaryBtnCls}
                      >
                        📷 Raporu Tara (kamera/galeri ile A4 PDF)
                      </button>
                      {reportFile && (
                        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                          {reportFile.name}
                          <button
                            type="button"
                            onClick={() => setReportFile(null)}
                            title="Kaldır"
                            className="text-emerald-600 hover:text-emerald-900 dark:text-emerald-300"
                          >
                            ✕
                          </button>
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    Rapor belgesini yüklemek için Ayarlar &gt; Google
                    Drive&apos;dan bağlanın.
                  </p>
                )}
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-zinc-700">
            <button type="button" onClick={onClose} className={secondaryBtnCls}>
              Vazgeç
            </button>
            <button type="submit" disabled={busy} className={`${primaryBtnCls} disabled:opacity-60`}>
              {busy ? "Gönderiliyor..." : "Talebi Gönder"}
            </button>
          </div>
        </form>
      </div>

      {scanOpen && (
        <DocScanner
          onDone={(file) => {
            setReportFile(file);
            setScanOpen(false);
          }}
          onClose={() => setScanOpen(false)}
        />
      )}
    </div>,
    document.body
  );
}
