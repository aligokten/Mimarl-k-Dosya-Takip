import { useEffect, useRef, useState } from "react";
import { primaryBtnCls, secondaryBtnCls } from "../ui";

// Belge tarayıcı: telefon kamerasıyla çekilen evrak fotoğrafının köşelerini
// OpenCV.js ile otomatik algılar, elle düzeltmeye izin verir, perspektifi
// düzeltip A4 boyutunda PDF üretir. Her şey tarayıcıda çalışır (sunucusuz).
// OpenCV (~9 MB) uygulamayla birlikte kendi sitemizden gelir ve yalnızca
// tarayıcı açıldığında dinamik olarak yüklenir (sonra önbellekte kalır).

/* eslint-disable @typescript-eslint/no-explicit-any */

let cvPromise: Promise<any> | null = null;

function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

function loadOpenCV(): Promise<any> {
  if (!cvPromise) {
    cvPromise = (async () => {
      const mod: any = await import("@techstark/opencv-js");
      const cvOrPromise: any = mod.default ?? mod;
      // Bu paketin tarayıcı derlemesi, cv nesnesinin kendisini değil; WASM
      // çalışma zamanı hazır olunca çözülen bir Promise dışa aktarır
      // (emscripten "moduleRtn" deseni). Thenable ise doğrudan bekleriz —
      // üzerinde .Mat yoklamak asla sonuçlanmaz çünkü o bir Promise'tir.
      const ready =
        typeof cvOrPromise?.then === "function"
          ? await withTimeout(
              cvOrPromise,
              40_000,
              "Tarama motoru başlatılamadı. Sayfayı yenileyip tekrar deneyin."
            )
          : cvOrPromise;
      if (!ready?.Mat) {
        throw new Error(
          "Tarama motoru başlatılamadı. Sayfayı yenileyip tekrar deneyin."
        );
      }
      return ready;
    })().catch((err) => {
      cvPromise = null; // sonraki denemede baştan yükle
      throw err;
    });
  }
  return cvPromise;
}

interface Point {
  x: number;
  y: number;
}

// Köşeleri sırala: sol-üst, sağ-üst, sağ-alt, sol-alt
function orderCorners(pts: Point[]): Point[] {
  const bySum = [...pts].sort((a, b) => a.x + a.y - (b.x + b.y));
  const tl = bySum[0];
  const br = bySum[3];
  const byDiff = [...pts].sort((a, b) => a.x - a.y - (b.x - b.y));
  const bl = byDiff[0];
  const tr = byDiff[3];
  return [tl, tr, br, bl];
}

// Fotoğraftaki en büyük dörtgeni (evrak sınırını) bul.
function detectCorners(cv: any, canvas: HTMLCanvasElement): Point[] | null {
  const src = cv.imread(canvas);
  const gray = new cv.Mat();
  const edges = new cv.Mat();
  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  let best: any = null;
  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0);
    cv.Canny(gray, edges, 50, 150);
    cv.dilate(edges, edges, kernel);
    cv.findContours(
      edges,
      contours,
      hierarchy,
      cv.RETR_EXTERNAL,
      cv.CHAIN_APPROX_SIMPLE
    );
    let bestArea = canvas.width * canvas.height * 0.12; // en az %12 alan
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const area = cv.contourArea(contour);
      if (area < bestArea) continue;
      const peri = cv.arcLength(contour, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(contour, approx, 0.02 * peri, true);
      if (approx.rows === 4) {
        best?.delete();
        best = approx.clone();
        bestArea = area;
      }
      approx.delete();
    }
    if (!best) return null;
    const pts: Point[] = [];
    for (let i = 0; i < 4; i++) {
      pts.push({ x: best.data32S[i * 2], y: best.data32S[i * 2 + 1] });
    }
    return orderCorners(pts);
  } finally {
    best?.delete();
    src.delete();
    gray.delete();
    edges.delete();
    kernel.delete();
    contours.delete();
    hierarchy.delete();
  }
}

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Perspektifi düzeltip A4 oranlı tuvale aktar (150 DPI).
function warpToA4(
  cv: any,
  canvas: HTMLCanvasElement,
  corners: Point[]
): { canvas: HTMLCanvasElement; landscape: boolean } {
  const [tl, tr, br, bl] = corners;
  const w = (dist(tl, tr) + dist(bl, br)) / 2;
  const h = (dist(tl, bl) + dist(tr, br)) / 2;
  const landscape = w > h;
  const W = landscape ? 1754 : 1240;
  const H = landscape ? 1240 : 1754;

  const src = cv.imread(canvas);
  const srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
    tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y,
  ]);
  const dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, W, 0, W, H, 0, H]);
  const M = cv.getPerspectiveTransform(srcPts, dstPts);
  const dst = new cv.Mat();
  try {
    cv.warpPerspective(
      src,
      dst,
      M,
      new cv.Size(W, H),
      cv.INTER_LINEAR,
      cv.BORDER_REPLICATE
    );
    const out = document.createElement("canvas");
    out.width = W;
    out.height = H;
    cv.imshow(out, dst);
    return { canvas: out, landscape };
  } finally {
    src.delete();
    srcPts.delete();
    dstPts.delete();
    M.delete();
    dst.delete();
  }
}

// Fotoğrafı tuvale yükle (uzun kenar en fazla 2200 px — telefon belleği için).
async function fileToCanvas(file: File): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error("Fotoğraf okunamadı."));
      im.src = url;
    });
    const maxSide = 2200;
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

type Step = "pick" | "busy" | "adjust" | "preview";

interface ScannedPage {
  canvas: HTMLCanvasElement;
  landscape: boolean;
}

export default function DocScanner({
  onDone,
  onClose,
}: {
  onDone: (file: File) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("pick");
  const [busyText, setBusyText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<HTMLCanvasElement | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [corners, setCorners] = useState<Point[]>([]);
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [previewUrl, setPreviewUrl] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);
  const dragIdx = useRef<number>(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function onPhotoPicked(file: File) {
    setError(null);
    setBusyText("Fotoğraf işleniyor...");
    setStep("busy");
    try {
      const canvas = await fileToCanvas(file);
      setPhoto(canvas);
      setPhotoUrl(canvas.toDataURL("image/jpeg", 0.9));

      setBusyText("Tarama motoru yükleniyor...");
      const cv = await loadOpenCV();

      setBusyText("Evrak köşeleri aranıyor...");
      // Algılamayı küçültülmüş kopya üzerinde yap (hız için)
      const small = document.createElement("canvas");
      const ratio = Math.min(1, 800 / Math.max(canvas.width, canvas.height));
      small.width = Math.round(canvas.width * ratio);
      small.height = Math.round(canvas.height * ratio);
      small
        .getContext("2d")!
        .drawImage(canvas, 0, 0, small.width, small.height);
      const found = detectCorners(cv, small);
      const detected = found
        ? found.map((p) => ({ x: p.x / ratio, y: p.y / ratio }))
        : null;

      // Bulunamazsa: kenarlardan %6 içeride varsayılan çerçeve
      const mx = canvas.width * 0.06;
      const my = canvas.height * 0.06;
      setCorners(
        detected ?? [
          { x: mx, y: my },
          { x: canvas.width - mx, y: my },
          { x: canvas.width - mx, y: canvas.height - my },
          { x: mx, y: canvas.height - my },
        ]
      );
      setStep("adjust");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep("pick");
    }
  }

  async function onConfirmCorners() {
    if (!photo) return;
    setBusyText("Perspektif düzeltiliyor...");
    setStep("busy");
    try {
      const cv = await loadOpenCV();
      const page = warpToA4(cv, photo, corners);
      setPages((prev) => [...prev, page]);
      setPreviewUrl(page.canvas.toDataURL("image/jpeg", 0.85));
      setPhoto(null);
      setPhotoUrl("");
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep("adjust");
    }
  }

  async function onSavePdf() {
    if (pages.length === 0) return;
    setBusyText("PDF oluşturuluyor...");
    setStep("busy");
    try {
      const { jsPDF } = await import("jspdf");
      const first = pages[0];
      const pdf = new jsPDF({
        unit: "mm",
        format: "a4",
        orientation: first.landscape ? "landscape" : "portrait",
      });
      pages.forEach((page, i) => {
        if (i > 0) {
          pdf.addPage("a4", page.landscape ? "landscape" : "portrait");
        }
        const w = page.landscape ? 297 : 210;
        const h = page.landscape ? 210 : 297;
        pdf.addImage(
          page.canvas.toDataURL("image/jpeg", 0.85),
          "JPEG",
          0,
          0,
          w,
          h
        );
      });
      const blob = pdf.output("blob");
      const stamp = new Date()
        .toISOString()
        .slice(0, 16)
        .replace("T", "-")
        .replace(":", "");
      onDone(
        new File([blob], `Tarama-${stamp}.pdf`, { type: "application/pdf" })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep("preview");
    }
  }

  // Köşe sürükleme (dokunmatik + fare)
  function svgPoint(e: React.PointerEvent): Point | null {
    const svg = svgRef.current;
    if (!svg || !photo) return null;
    const rect = svg.getBoundingClientRect();
    return {
      x: Math.min(
        photo.width,
        Math.max(0, ((e.clientX - rect.left) / rect.width) * photo.width)
      ),
      y: Math.min(
        photo.height,
        Math.max(0, ((e.clientY - rect.top) / rect.height) * photo.height)
      ),
    };
  }

  useEffect(() => {
    // Modal açıkken arka sayfanın kaymasını engelle
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleR = photo ? Math.max(photo.width, photo.height) * 0.022 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6">
      <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 dark:border-zinc-700">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Belge Tara
            {pages.length > 0 && (
              <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
                {pages.length} sayfa
              </span>
            )}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-zinc-800"
            title="Kapat"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {error && (
            <p className="mb-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          )}

          {step === "pick" && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-orange-600 text-3xl text-white shadow-md">
                📷
              </span>
              <p className="max-w-sm text-sm text-slate-600 dark:text-slate-300">
                Evrakın fotoğrafını çekin. Köşeler otomatik algılanır,
                gerekirse elle düzeltebilirsiniz; sonuç A4 boyutunda PDF olur.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void onPhotoPicked(f);
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={primaryBtnCls}
              >
                {pages.length > 0
                  ? "Yeni Sayfa İçin Fotoğraf Çek"
                  : "Fotoğraf Çek / Seç"}
              </button>
              {pages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setStep("preview")}
                  className={secondaryBtnCls}
                >
                  ← Önizlemeye Dön
                </button>
              )}
              <p className="text-xs text-slate-400 dark:text-slate-500">
                İpucu: Evrakı zıt renkli bir zeminde, gölgesiz çekin.
              </p>
            </div>
          )}

          {step === "busy" && (
            <div className="flex flex-col items-center gap-3 py-14">
              <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-orange-500 border-t-transparent" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {busyText}
              </p>
            </div>
          )}

          {step === "adjust" && photo && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Turuncu köşeleri sürükleyerek evrak sınırını düzeltin.
              </p>
              <div
                className="relative mx-auto w-full max-w-md overflow-hidden rounded-xl bg-slate-900"
                style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
              >
                <img
                  src={photoUrl}
                  alt="Çekilen evrak"
                  className="absolute inset-0 h-full w-full"
                  draggable={false}
                />
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${photo.width} ${photo.height}`}
                  className="absolute inset-0 h-full w-full touch-none"
                  onPointerMove={(e) => {
                    if (dragIdx.current < 0) return;
                    const p = svgPoint(e);
                    if (!p) return;
                    setCorners((prev) =>
                      prev.map((c, i) => (i === dragIdx.current ? p : c))
                    );
                  }}
                  onPointerUp={() => {
                    dragIdx.current = -1;
                  }}
                >
                  <polygon
                    points={corners.map((c) => `${c.x},${c.y}`).join(" ")}
                    fill="rgba(249,115,22,0.15)"
                    stroke="#f97316"
                    strokeWidth={handleR / 4}
                  />
                  {corners.map((c, i) => (
                    <circle
                      key={i}
                      cx={c.x}
                      cy={c.y}
                      r={handleR}
                      fill="#f97316"
                      stroke="#fff"
                      strokeWidth={handleR / 4}
                      style={{ cursor: "grab" }}
                      onPointerDown={(e) => {
                        dragIdx.current = i;
                        (e.currentTarget.ownerSVGElement as SVGSVGElement)
                          .setPointerCapture(e.pointerId);
                      }}
                    />
                  ))}
                </svg>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPhoto(null);
                    setPhotoUrl("");
                    setStep("pick");
                  }}
                  className={secondaryBtnCls}
                >
                  ← Yeniden Çek
                </button>
                <button
                  type="button"
                  onClick={() => void onConfirmCorners()}
                  className={primaryBtnCls}
                >
                  Devam →
                </button>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                A4 önizleme — {pages.length} sayfa. Kaydetmeden önce yeni
                sayfa ekleyebilirsiniz.
              </p>
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="A4 önizleme"
                  className="mx-auto max-h-[50vh] rounded-lg border border-slate-200 shadow-sm dark:border-zinc-700"
                />
              )}
              {pages.length > 1 && (
                <div className="flex flex-wrap justify-center gap-2">
                  {pages.map((page, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() =>
                        setPreviewUrl(page.canvas.toDataURL("image/jpeg", 0.85))
                      }
                      className="relative overflow-hidden rounded-md border border-slate-200 dark:border-zinc-700"
                      title={`Sayfa ${i + 1}`}
                    >
                      <img
                        src={page.canvas.toDataURL("image/jpeg", 0.4)}
                        alt={`Sayfa ${i + 1}`}
                        className="h-16 w-auto"
                      />
                      <span
                        className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-bl bg-red-500 text-[10px] font-bold text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPages((prev) => {
                            const next = prev.filter((_, j) => j !== i);
                            setPreviewUrl(
                              next.length
                                ? next[next.length - 1].canvas.toDataURL(
                                    "image/jpeg",
                                    0.85
                                  )
                                : ""
                            );
                            if (next.length === 0) setStep("pick");
                            return next;
                          });
                        }}
                      >
                        ✕
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStep("pick")}
                  className={secondaryBtnCls}
                >
                  + Sayfa Ekle
                </button>
                <button
                  type="button"
                  onClick={() => void onSavePdf()}
                  className={primaryBtnCls}
                >
                  PDF&apos;i Kullan ({pages.length} sayfa)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
