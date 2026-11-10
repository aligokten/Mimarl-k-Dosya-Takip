// @ts-nocheck
// Arsapay (eşit alanlı parsel bölme) — aligokten/sagg-muhasebe deposundaki
// src/ArsaPaylastir.js dosyasının birebir portu. Artık iframe yerine Ruhsat360
// içinde yerel çalışır; tema panelden (useTheme) gelir. Değişiklikler buradan yapılır.
import React, { useState, useRef, useMemo, useEffect } from "react";
import JSZip from "jszip";
import ilListe from "./ilListe.json";
import logoUrl from "./logo.png";
import { useTheme } from "../theme";

const TKGM_API = "https://cbsapi.tkgm.gov.tr/megsiswebapi.v3.1/api/";
// Milas Belediyesi KEOS e-imar sistemi sadece http destekliyor (https sertifikası yok).
// https sayfalardan mixed-content engelini aşmak için bir Cloudflare Worker proxy
// kullanılıyor (bkz. docs/milas-proxy-worker.js). Kendi worker adresinizi deploy
// ettikten sonra buraya yazın.
const MILAS_PROXY_BASE = "https://milas-eimar-proxy.aligokten99.workers.dev";

/* =========================================================
   GEOMETRİ ÇEKİRDEĞİ
   (SAGG_ARSA_PAYLASTIR_V5.lsp'deki sag5:* fonksiyonlarının
   bire bir JS karşılığı: açısal kesim arama + ikili arama ile
   hedef alan bulma + geçerlilik kontrolleri)
   ========================================================= */

const EPS = 1e-8;
const PIECE_COLORS = [
  "#c1440e", "#2563eb", "#16a34a", "#9333ea", "#ca8a04",
  "#0891b2", "#db2777", "#65a30d", "#7c3aed", "#dc2626",
  "#0d9488", "#ea580c", "#4338ca", "#15803d", "#a16207",
];

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, s) => [a[0] * s, a[1] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const len = (v) => Math.sqrt(v[0] * v[0] + v[1] * v[1]);
const dist = (a, b) => len(sub(a, b));
const cross2 = (a, b) => a[0] * b[1] - a[1] * b[0];

function cleanPoly(pts) {
  const out = [];
  for (const p of pts) {
    if (out.length === 0 || dist(p, out[out.length - 1]) > 1e-7) out.push(p);
  }
  if (out.length > 1 && dist(out[0], out[out.length - 1]) < 1e-7) out.pop();
  return out;
}

function signedArea(pts) {
  const n = pts.length;
  if (n < 3) return 0;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    s += p[0] * q[1] - p[1] * q[0];
  }
  return s / 2;
}
const areaOf = (pts) => Math.abs(signedArea(pts));

function centroidOf(pts) {
  const n = pts.length;
  if (n < 3) return pts[0] || [0, 0];
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    const cr = p[0] * q[1] - p[1] * q[0];
    a += cr;
    cx += (p[0] + q[0]) * cr;
    cy += (p[1] + q[1]) * cr;
  }
  if (Math.abs(a) < EPS) return pts[0];
  return [cx / (3 * a), cy / (3 * a)];
}

function rangeDot(pts, u) {
  let mn = Infinity, mx = -Infinity;
  for (const p of pts) {
    const v = dot(p, u);
    if (v < mn) mn = v;
    if (v > mx) mx = v;
  }
  return [mn, mx];
}

function lineCut(a, b, u, k) {
  const da = dot(a, u) - k;
  const db = dot(b, u) - k;
  const den = db - da;
  if (Math.abs(den) < EPS) return b;
  const oran = -da / den;
  return add(a, mul(sub(b, a), oran));
}

function insideHalf(p, u, k, mode) {
  const d = dot(p, u) - k;
  return mode === "LE" ? d <= EPS : d >= -EPS;
}

function clipHalfplane(poly, u, k, mode) {
  poly = cleanPoly(poly);
  if (poly.length < 3) return null;
  const out = [];
  let prev = poly[poly.length - 1];
  let pin = insideHalf(prev, u, k, mode);
  for (const cur of poly) {
    const cin = insideHalf(cur, u, k, mode);
    if (pin && cin) {
      out.push(cur);
    } else if (pin && !cin) {
      out.push(lineCut(prev, cur, u, k));
    } else if (!pin && cin) {
      out.push(lineCut(prev, cur, u, k));
      out.push(cur);
    }
    prev = cur;
    pin = cin;
  }
  return cleanPoly(out);
}

function strip(poly, u, low, high) {
  const a = clipHalfplane(poly, u, high, "LE");
  if (!a) return null;
  const b = clipHalfplane(a, u, low, "GE");
  if (b && b.length >= 3 && areaOf(b) > EPS) return b;
  return null;
}

function findCutForArea(poly, u, low, high, target) {
  let lo = low, hi = high;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const sp = strip(poly, u, low, mid);
    const ar = sp ? areaOf(sp) : 0;
    if (ar < target) lo = mid;
    else hi = mid;
  }
  return hi;
}

function perimeterOf(pts) {
  pts = cleanPoly(pts);
  const n = pts.length;
  let s = 0;
  for (let i = 0; i < n; i++) s += dist(pts[i], pts[(i + 1) % n]);
  return s;
}

function minEdgeOf(pts) {
  pts = cleanPoly(pts);
  const n = pts.length;
  let mn = Infinity;
  for (let i = 0; i < n; i++) {
    const d = dist(pts[i], pts[(i + 1) % n]);
    if (d < mn) mn = d;
  }
  return n ? mn : 0;
}

function simplifyCollinear(pts, tol) {
  pts = cleanPoly(pts);
  let changed = true;
  while (changed) {
    changed = false;
    const n = pts.length;
    if (n < 4) break;
    const out = [];
    for (let i = 0; i < n; i++) {
      const prev = pts[(i - 1 + n) % n];
      const cur = pts[i];
      const nxt = pts[(i + 1) % n];
      const v1 = sub(cur, prev);
      const v2 = sub(nxt, cur);
      let keep = true;
      if (dist(cur, prev) < tol) keep = false;
      if (keep && Math.abs(cross2(v1, v2)) < tol * Math.max(1, len(v1)) * Math.max(1, len(v2))) keep = false;
      if (keep) out.push(cur);
      else changed = true;
    }
    pts = cleanPoly(out);
  }
  return pts;
}

function onSegP(p, a, b, tol) {
  const ap = sub(p, a);
  const ab = sub(b, a);
  const bp = sub(p, b);
  const crossV = Math.abs(cross2(ap, ab));
  const dotv = dot(ap, bp);
  return crossV <= tol * Math.max(1, len(ab)) && dotv <= tol;
}

function pointInPoly(p, pts) {
  pts = cleanPoly(pts);
  const n = pts.length;
  let inside = false;
  const [x, y] = p;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const pi = pts[i], pj = pts[j];
    if (onSegP(p, pi, pj, 1e-7)) return true;
    const [xi, yi] = pi, [xj, yj] = pj;
    if ((yi > y) !== (yj > y) && x < xi + ((xj - xi) * (y - yi)) / (yj - yi)) {
      inside = !inside;
    }
  }
  return inside;
}

function childInsideParentP(child, parent) {
  child = cleanPoly(child);
  const n = child.length;
  for (let i = 0; i < n; i++) {
    const p = child[i], q = child[(i + 1) % n];
    const mid = mul(add(p, q), 0.5);
    if (!pointInPoly(mid, parent)) return false;
  }
  return true;
}

function validFinalPieceP(piece, parent, minRaw) {
  piece = cleanPoly(piece);
  const simp = simplifyCollinear(piece, 1e-7);
  const area = areaOf(simp);
  const mn = minEdgeOf(simp);
  return (
    simp.length >= 4 &&
    area > 1e-6 &&
    childInsideParentP(simp, parent) &&
    (minRaw <= 0 || mn >= minRaw - 1e-7)
  );
}

function validConnectedChildP(child, parent) {
  child = cleanPoly(child);
  const simp = simplifyCollinear(child, 1e-7);
  return simp.length >= 3 && areaOf(simp) > 1e-6 && childInsideParentP(simp, parent);
}

function compactnessScore(pts) {
  const a = areaOf(pts);
  const p = perimeterOf(pts);
  return a > 1e-9 ? (p * p) / a : 1e99;
}

function candidateScore(piece, rest) {
  let sc = compactnessScore(piece) + 0.35 * compactnessScore(rest);
  sc += 0.2 * simplifyCollinear(piece, 1e-7).length;
  return sc;
}

function tryCut(parent, target, u, minRaw, restWillBeFinal) {
  const [minK, maxK] = rangeDot(parent, u);
  if (maxK - minK <= EPS) return null;
  const k = findCutForArea(parent, u, minK, maxK, target);
  const piece = clipHalfplane(parent, u, k, "LE");
  const rest = clipHalfplane(parent, u, k, "GE");
  if (
    piece &&
    rest &&
    validFinalPieceP(piece, parent, minRaw) &&
    validConnectedChildP(rest, parent) &&
    (!restWillBeFinal || validFinalPieceP(rest, parent, minRaw))
  ) {
    return { sc: candidateScore(piece, rest), piece, rest, u, k };
  }
  return null;
}

function bestCut(parent, target, minRaw, stepDeg, restWillBeFinal) {
  let best = null;
  for (let deg = 0; deg < 360; deg += stepDeg) {
    const ang = (Math.PI * deg) / 180;
    const u = [Math.cos(ang), Math.sin(ang)];
    const cand = tryCut(parent, target, u, minRaw, restWillBeFinal);
    if (cand && (!best || cand.sc < best.sc)) best = cand;
  }
  return best;
}

function generatePiecesAuto(poly, n, minRaw, stepDeg) {
  const total = areaOf(poly);
  const target = total / n;
  let remain = cleanPoly(poly);
  const pieces = [];
  let ok = true;
  for (let i = 1; i < n && ok; i++) {
    const restFinal = i === n - 1;
    const cand = bestCut(remain, target, minRaw, stepDeg, restFinal);
    if (cand) {
      pieces.push(cand.piece);
      remain = cand.rest;
    } else {
      ok = false;
    }
  }
  if (ok && validFinalPieceP(remain, remain, minRaw)) {
    pieces.push(remain);
    return pieces;
  }
  return null;
}

// uFixed: referans çizginin yön vektörü (birim). Kesim çizgileri bu doğrultuya
// dik olacak şekilde, parsel sırayla eşit alanlı şeritlere bölünür.
function generatePiecesFixedDirection(poly, n, minRaw, uFixed) {
  const total = areaOf(poly);
  const target = total / n;
  let remain = cleanPoly(poly);
  const pieces = [];
  let ok = true;
  for (let i = 1; i < n && ok; i++) {
    const restFinal = i === n - 1;
    const cand = tryCut(remain, target, uFixed, minRaw, restFinal);
    if (cand) {
      pieces.push(cand.piece);
      remain = cand.rest;
    } else {
      ok = false;
    }
  }
  if (ok && validFinalPieceP(remain, remain, minRaw)) {
    pieces.push(remain);
    return pieces;
  }
  return null;
}

/* =========================================================
   DXF ÜRETİMİ (R12 ASCII)
   ========================================================= */

function buildDXF(originalPoly, pieces, unitM, textH) {
  const lines = [];
  const add = (...l) => lines.push(...l);

  const allPts = [...originalPoly, ...pieces.flat()];
  const xs = allPts.map((p) => p[0]);
  const ys = allPts.map((p) => p[1]);
  const minx = Math.min(...xs), maxx = Math.max(...xs);
  const miny = Math.min(...ys), maxy = Math.max(...ys);

  add("0", "SECTION", "2", "HEADER");
  add("9", "$ACADVER", "1", "AC1009");
  add("9", "$INSBASE", "10", "0.0", "20", "0.0", "30", "0.0");
  add("9", "$EXTMIN", "10", (minx - 5).toFixed(4), "20", (miny - 5).toFixed(4), "30", "0.0");
  add("9", "$EXTMAX", "10", (maxx + 5).toFixed(4), "20", (maxy + 5).toFixed(4), "30", "0.0");
  add("9", "$INSUNITS", "70", "6");
  add("0", "ENDSEC");

  add("0", "SECTION", "2", "TABLES");
  add("0", "TABLE", "2", "LTYPE", "70", "1");
  add("0", "LTYPE", "2", "CONTINUOUS", "70", "0", "3", "Solid", "72", "65", "73", "0", "40", "0.0");
  add("0", "ENDTAB");

  add("0", "TABLE", "2", "LAYER", "70", "5");
  const mkLayer = (name, color) => add("0", "LAYER", "2", name, "70", "0", "62", String(color), "6", "CONTINUOUS");
  mkLayer("SAGG-PAY-SINIR", 7);
  mkLayer("SAGG-PAY-ANA", 8);
  mkLayer("SAGG-PAY-HATCH", 8);
  mkLayer("SAGG-PAY-YAZI", 7);
  mkLayer("SAGG-PAY-LEJANT", 7);
  add("0", "ENDTAB");

  add("0", "TABLE", "2", "STYLE", "70", "1");
  add("0", "STYLE", "2", "STANDARD", "70", "0", "40", "0.0", "41", "1.0", "50", "0.0", "71", "0", "42", "1.0", "3", "txt", "4", "");
  add("0", "ENDTAB");
  add("0", "ENDSEC");

  add("0", "SECTION", "2", "ENTITIES");

  const addClosedPoly = (pts, layer, color) => {
    add("0", "POLYLINE", "8", layer, "62", String(color), "66", "1", "70", "1", "40", "0.0", "41", "0.0");
    for (const [x, y] of pts) add("0", "VERTEX", "8", layer, "10", x.toFixed(4), "20", y.toFixed(4), "30", "0.0");
    add("0", "SEQEND");
  };
  addClosedPoly(originalPoly, "SAGG-PAY-ANA", 8);

  pieces.forEach((sp, idx) => {
    const colorIdx = (idx % PIECE_COLORS.length) + 1;
    addClosedPoly(sp, "SAGG-PAY-SINIR", colorIdx);

    const cen = centroidOf(sp);
    const areaM = areaOf(sp) * unitM * unitM;
    const label = `P-${String(idx + 1).padStart(2, "0")}  ${areaM.toFixed(2)} m2`;
    add(
      "0", "TEXT", "8", "SAGG-PAY-YAZI",
      "10", cen[0].toFixed(4), "20", cen[1].toFixed(4), "30", "0.0",
      "40", textH.toFixed(4), "1", label, "50", "0.0", "7", "STANDARD"
    );
  });

  const lx = maxx + 8;
  let ly = maxy;
  const legendLine = (txt) => {
    add("0", "TEXT", "8", "SAGG-PAY-LEJANT", "10", lx.toFixed(4), "20", ly.toFixed(4), "30", "0.0",
      "40", textH.toFixed(4), "1", txt, "50", "0.0", "7", "STANDARD");
    ly -= textH * 1.6;
  };
  legendLine("PARSEL PAYLASIM LEJANTI");
  pieces.forEach((sp, idx) => {
    const areaM = areaOf(sp) * unitM * unitM;
    const mn = minEdgeOf(sp) * unitM;
    legendLine(`P-${String(idx + 1).padStart(2, "0")}  Alan=${areaM.toFixed(2)} m2  MinKenar=${mn.toFixed(2)} m`);
  });
  const totalAreaM = areaOf(originalPoly) * unitM * unitM;
  const sumAreaM = pieces.reduce((s, sp) => s + areaOf(sp) * unitM * unitM, 0);
  legendLine(`Toplam (parcalar) = ${sumAreaM.toFixed(2)} m2`);
  legendLine(`Ana parsel alani = ${totalAreaM.toFixed(2)} m2`);

  add("0", "ENDSEC", "0", "EOF");
  return lines.join("\n") + "\n";
}

/* =========================================================
   UI
   ========================================================= */

const FONT_DISPLAY = "'JetBrains Mono', 'IBM Plex Mono', monospace";
const FONT_BODY = "'Inter', -apple-system, system-ui, sans-serif";
const ACCENT = "#c1440e";

const THEMES = {
  light: {
    paper: "#faf9f6",
    ink: "#1c1c1a",
    rule: "#dcd9d1",
    panel: "#ffffff",
    muted: "#6b675c",
    mutedLight: "#9a9686",
    labelMuted: "#8a8678",
    gridLine: "#f1efe9",
    tableHeadBg: "#f5f3ee",
    tableHeadText: "#55524a",
    disabledText: "#aba795",
    errorBg: "#fbeae3",
    errorBorder: "#f0c9b4",
    errorText: "#7a2e10",
    infoBg: "#f3f1ea",
    infoBorder: "#dcd9d1",
  },
  dark: {
    paper: "#181815",
    ink: "#f0eee6",
    rule: "#3a3934",
    panel: "#222220",
    muted: "#b8b4a7",
    mutedLight: "#8c8979",
    labelMuted: "#9b9788",
    gridLine: "#28271f",
    tableHeadBg: "#29281f",
    tableHeadText: "#d2cfc2",
    disabledText: "#5d5a4e",
    errorBg: "#3a2417",
    errorBorder: "#5b3a22",
    errorText: "#f0b08c",
    infoBg: "#242320",
    infoBorder: "#3a3934",
  },
};

function parsePointsInput(text) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));
  const pts = [];
  for (const l of lines) {
    const parts = l.split(/[,\s]+/).map(Number);
    if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
      pts.push([parts[0], parts[1]]);
    }
  }
  return pts;
}

// X=boylam (-180..180), Y=enlem (-90..90) aralığındaysa GPS (WGS84) koordinatı sayılır.
function looksLikeLatLon(pts) {
  return pts.every(([x, y]) => Math.abs(x) <= 180 && Math.abs(y) <= 90);
}

// Parselin ağırlık merkezine göre düzlemsel (equirectangular) projeksiyon ile yerel metreye çevirir.
// Küçük parsel ölçeğinde (birkaç km'ye kadar) yeterli doğruluktadır.
const EARTH_R_M = 111320;
function projectLatLonToMeters(pts) {
  const lon0 = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const lat0 = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const cosLat0 = Math.cos((lat0 * Math.PI) / 180);
  return pts.map(([lon, lat]) => [
    (lon - lon0) * EARTH_R_M * cosLat0,
    (lat - lat0) * EARTH_R_M,
  ]);
}

const SAMPLE = `0,0
0,180
60,210
190,170
190,0`;

export default function ArsaPaylastir() {
  // Tema Ruhsat360 panelinden gelir (başlıktaki açık/koyu düğmesi).
  const theme = useTheme();
  const C = THEMES[theme];

  const [pointsText, setPointsText] = useState(SAMPLE);
  const [polygon, setPolygon] = useState(() => parsePointsInput(SAMPLE));
  const [parseError, setParseError] = useState(null);
  const [isGeoInput, setIsGeoInput] = useState(false);

  const [n, setN] = useState(4);
  const [unitM, setUnitM] = useState(1);
  const [minM, setMinM] = useState(0);
  const [stepDeg, setStepDeg] = useState(5);

  const [pieces, setPieces] = useState(null);
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [drawMode, setDrawMode] = useState(false);
  const [drawPts, setDrawPts] = useState([]);

  const [refMode, setRefMode] = useState(false);
  const [refClickPts, setRefClickPts] = useState([]);
  const [refLine, setRefLine] = useState(null);
  const [useRefDirection, setUseRefDirection] = useState(false);

  const [tkgmProvinceId, setTkgmProvinceId] = useState("");
  const [tkgmDistrictId, setTkgmDistrictId] = useState("");
  const [tkgmNeighborhoodId, setTkgmNeighborhoodId] = useState("");
  const [tkgmDistricts, setTkgmDistricts] = useState([]);
  const [tkgmNeighborhoods, setTkgmNeighborhoods] = useState([]);
  const [tkgmAda, setTkgmAda] = useState("");
  const [tkgmParsel, setTkgmParsel] = useState("");
  const [tkgmBusy, setTkgmBusy] = useState(false);
  const [tkgmError, setTkgmError] = useState("");
  const [tkgmDistrictsLoading, setTkgmDistrictsLoading] = useState(false);
  const [tkgmNeighborhoodsLoading, setTkgmNeighborhoodsLoading] = useState(false);

  const [milasParselId, setMilasParselId] = useState("");
  const [milasBusy, setMilasBusy] = useState(false);
  const [milasError, setMilasError] = useState("");

  const svgRef = useRef(null);

  const totalArea = useMemo(() => (polygon.length >= 3 ? areaOf(polygon) : 0), [polygon]);

  function applyPointsText(text) {
    setPointsText(text);
    const pts = parsePointsInput(text);
    if (pts.length < 3) {
      setParseError("En az 3 nokta gerekli.");
      return;
    }
    setParseError(null);
    const geo = looksLikeLatLon(pts);
    setIsGeoInput(geo);
    setPolygon(geo ? projectLatLonToMeters(pts) : pts);
    if (geo) setUnitM(1);
    setPieces(null);
    setStatus("idle");
    setRefLine(null);
    setUseRefDirection(false);
  }

  // Sayfa açıldığında varsayılan olarak Anıtkabir parselini (Ankara/Çankaya/Mebusevleri,
  // ada 4252, parsel 43) TKGM'den çekip yükle.
  useEffect(() => {
    let cancelled = false;
    async function loadDefaultParcel() {
      const ankara = ilListe.find((p) => p.text === "Ankara");
      if (!ankara) return;
      setTkgmBusy(true);
      setTkgmProvinceId(ankara.id);
      setTkgmDistrictsLoading(true);
      try {
        const dRes = await fetch(`${TKGM_API}idariYapi/ilceListe/${ankara.id}`, { referrerPolicy: "no-referrer" });
        if (!dRes.ok || cancelled) return;
        const dData = await dRes.json();
        const districts = (dData.features || [])
          .map((f) => f.properties)
          .sort((a, b) => a.text.localeCompare(b.text, "tr"));
        if (cancelled) return;
        setTkgmDistricts(districts);
        setTkgmDistrictsLoading(false);
        const cankaya = districts.find((d) => d.text === "Çankaya");
        if (!cankaya) return;
        setTkgmDistrictId(cankaya.id);
        setTkgmNeighborhoodsLoading(true);
        const nRes = await fetch(`${TKGM_API}idariYapi/mahalleListe/${cankaya.id}`, { referrerPolicy: "no-referrer" });
        if (!nRes.ok || cancelled) return;
        const nData = await nRes.json();
        const neighborhoods = (nData.features || [])
          .map((f) => f.properties)
          .sort((a, b) => a.text.localeCompare(b.text, "tr"));
        if (cancelled) return;
        setTkgmNeighborhoods(neighborhoods);
        setTkgmNeighborhoodsLoading(false);
        const mebusevleri = neighborhoods.find((m) => m.text === "Mebusevleri");
        if (!mebusevleri) return;
        setTkgmNeighborhoodId(mebusevleri.id);
        setTkgmAda("4252");
        setTkgmParsel("43");
        const pRes = await fetch(`${TKGM_API}parsel/${mebusevleri.id}/4252/43`, { referrerPolicy: "no-referrer" });
        if (!pRes.ok || cancelled) return;
        const feature = await pRes.json();
        if (!feature.geometry || cancelled) return;
        const ring =
          feature.geometry.type === "Polygon"
            ? feature.geometry.coordinates[0]
            : feature.geometry.type === "MultiPolygon"
            ? feature.geometry.coordinates[0][0]
            : null;
        if (!ring || ring.length < 3) return;
        const pts = ring.slice();
        const first = pts[0], lastP = pts[pts.length - 1];
        if (pts.length > 1 && first[0] === lastP[0] && first[1] === lastP[1]) pts.pop();
        const text = pts.map(([lon, lat]) => `${lon},${lat}`).join("\n");
        if (!cancelled) applyPointsText(text);
      } catch {
        // Varsayılan parsel yüklenemezse örnek poligon olduğu gibi kalır.
      } finally {
        if (!cancelled) {
          setTkgmBusy(false);
          setTkgmDistrictsLoading(false);
          setTkgmNeighborhoodsLoading(false);
        }
      }
    }
    loadDefaultParcel();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleProvinceChange(id) {
    setTkgmProvinceId(id);
    setTkgmDistrictId("");
    setTkgmNeighborhoodId("");
    setTkgmDistricts([]);
    setTkgmNeighborhoods([]);
    setTkgmError("");
    if (!id) return;
    setTkgmDistrictsLoading(true);
    try {
      const res = await fetch(`${TKGM_API}idariYapi/ilceListe/${id}`, { referrerPolicy: "no-referrer" });
      if (!res.ok) {
        setTkgmError(`İlçe listesi alınamadı (HTTP ${res.status}).`);
        return;
      }
      const data = await res.json();
      const list = (data.features || [])
        .map((f) => f.properties)
        .sort((a, b) => a.text.localeCompare(b.text, "tr"));
      if (list.length === 0) {
        setTkgmError("İlçe listesi boş geldi. Tekrar deneyin.");
      }
      setTkgmDistricts(list);
    } catch (e) {
      setTkgmError(`İlçe listesi alınamadı: ${e.message || "bilinmeyen hata"}.`);
    } finally {
      setTkgmDistrictsLoading(false);
    }
  }

  async function handleDistrictChange(id) {
    setTkgmDistrictId(id);
    setTkgmNeighborhoodId("");
    setTkgmNeighborhoods([]);
    setTkgmError("");
    if (!id) return;
    setTkgmNeighborhoodsLoading(true);
    try {
      const res = await fetch(`${TKGM_API}idariYapi/mahalleListe/${id}`, { referrerPolicy: "no-referrer" });
      if (!res.ok) {
        setTkgmError(`Mahalle listesi alınamadı (HTTP ${res.status}).`);
        return;
      }
      const data = await res.json();
      const list = (data.features || [])
        .map((f) => f.properties)
        .sort((a, b) => a.text.localeCompare(b.text, "tr"));
      if (list.length === 0) {
        setTkgmError("Mahalle listesi boş geldi. Tekrar deneyin.");
      }
      setTkgmNeighborhoods(list);
    } catch (e) {
      setTkgmError(`Mahalle listesi alınamadı: ${e.message || "bilinmeyen hata"}.`);
    } finally {
      setTkgmNeighborhoodsLoading(false);
    }
  }

  async function fetchParcel() {
    const ada = tkgmAda.trim();
    const parsel = tkgmParsel.trim();
    if (!tkgmNeighborhoodId || !ada || !parsel) {
      setTkgmError("İl, ilçe, mahalle seçip ada ve parsel numarasını girin.");
      return;
    }
    setTkgmBusy(true);
    setTkgmError("");
    try {
      const res = await fetch(`${TKGM_API}parsel/${tkgmNeighborhoodId}/${ada}/${parsel}`, { referrerPolicy: "no-referrer" });
      if (res.status === 404) {
        setTkgmError("Parsel bulunamadı. Ada/parsel numaralarını kontrol edin.");
        return;
      }
      if (res.status === 403) {
        setTkgmError("TKGM sorgu limiti aşıldı. Daha sonra tekrar deneyin.");
        return;
      }
      if (res.status === 401 || res.status === 412) {
        setTkgmError("Bu parsel kadastro kısıtlaması nedeniyle sorgulanamıyor.");
        return;
      }
      if (!res.ok) {
        setTkgmError("TKGM sorgusunda bir hata oluştu.");
        return;
      }
      const feature = await res.json();
      if (!feature.geometry) {
        setTkgmError("Bu parsel için sınır (geometri) bilgisi bulunamadı (ana taşınmaz olabilir).");
        return;
      }
      const ring =
        feature.geometry.type === "Polygon"
          ? feature.geometry.coordinates[0]
          : feature.geometry.type === "MultiPolygon"
          ? feature.geometry.coordinates[0][0]
          : null;
      if (!ring || ring.length < 3) {
        setTkgmError("Parsel geometrisi okunamadı.");
        return;
      }
      const pts = ring.slice();
      const first = pts[0], lastP = pts[pts.length - 1];
      if (pts.length > 1 && first[0] === lastP[0] && first[1] === lastP[1]) pts.pop();
      const text = pts.map(([lon, lat]) => `${lon},${lat}`).join("\n");
      applyPointsText(text);
    } catch {
      setTkgmError("TKGM sunucusuna bağlanılamadı. İnternet bağlantınızı kontrol edin.");
    } finally {
      setTkgmBusy(false);
    }
  }

  async function fetchMilasParcel() {
    const parselId = milasParselId.trim();
    if (!parselId) {
      setMilasError("Parsel ID girin (Milas e-imar sorgu sayfasındaki parselid değeri).");
      return;
    }
    if (MILAS_PROXY_BASE.includes("REPLACE-WITH-YOUR-WORKER")) {
      setMilasError("Milas proxy adresi henüz ayarlanmadı (MILAS_PROXY_BASE).");
      return;
    }
    setMilasBusy(true);
    setMilasError("");
    try {
      const imarUrl = `${MILAS_PROXY_BASE}/imar?parselid=${encodeURIComponent(parselId)}`;
      const imarRes = await fetch(imarUrl, { referrerPolicy: "no-referrer" });
      if (!imarRes.ok) {
        setMilasError(`İmar durumu alınamadı (HTTP ${imarRes.status}).`);
        return;
      }
      const html = await imarRes.text();
      const tokenMatch = html.match(/kml\.ashx\?token=([0-9a-fA-F-]{36})/);
      if (!tokenMatch) {
        setMilasError("Bu parsel için KML linki bulunamadı. Parsel ID'yi kontrol edin.");
        return;
      }
      const kmlUrl = `${MILAS_PROXY_BASE}/kml?token=${tokenMatch[1]}`;
      const kmzRes = await fetch(kmlUrl, { referrerPolicy: "no-referrer" });
      if (!kmzRes.ok) {
        setMilasError(`KML dosyası alınamadı (HTTP ${kmzRes.status}).`);
        return;
      }
      const kmzBuffer = await kmzRes.arrayBuffer();
      const zip = await JSZip.loadAsync(kmzBuffer);
      const kmlEntry = Object.values(zip.files).find((f) => f.name.toLowerCase().endsWith(".kml"));
      if (!kmlEntry) {
        setMilasError("KML dosyası içinde geometri bulunamadı.");
        return;
      }
      const kmlText = await kmlEntry.async("text");
      const coordMatch = kmlText.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
      if (!coordMatch) {
        setMilasError("KML içinde koordinat bilgisi bulunamadı.");
        return;
      }
      const triples = coordMatch[1].trim().split(/\s+/).filter(Boolean);
      const pts = triples.map((t) => {
        const [lon, lat] = t.split(",");
        return [parseFloat(lon), parseFloat(lat)];
      });
      if (pts.length < 3) {
        setMilasError("Parsel geometrisi okunamadı.");
        return;
      }
      const first = pts[0], lastP = pts[pts.length - 1];
      if (pts.length > 1 && first[0] === lastP[0] && first[1] === lastP[1]) pts.pop();
      const text = pts.map(([lon, lat]) => `${lon},${lat}`).join("\n");
      applyPointsText(text);
    } catch {
      setMilasError("Milas e-imar sunucusuna bağlanılamadı. İnternet bağlantınızı kontrol edin.");
    } finally {
      setMilasBusy(false);
    }
  }

  function runSplit() {
    if (polygon.length < 3) return;
    setStatus("running");
    setErrorMsg("");
    setTimeout(() => {
      const minRaw = minM > 0 ? minM / unitM : 0;
      let result = null;
      if (useRefDirection && refLine) {
        const v = sub(refLine[1], refLine[0]);
        const vlen = len(v);
        if (vlen > EPS) {
          const uFixed = [v[0] / vlen, v[1] / vlen];
          result = generatePiecesFixedDirection(polygon, n, minRaw, uFixed);
        }
      } else {
        result = generatePiecesAuto(polygon, n, minRaw, stepDeg);
      }
      if (!result) {
        setStatus("error");
        setErrorMsg(
          useRefDirection && refLine
            ? "Referans çizgisine dik kesimlerle güvenli bölme bulunamadı. Minimum kenar değerini düşürün, parça sayısını azaltın veya referans çizgisini farklı çizip tekrar deneyin."
            : "Bu geometri ve kriterlerle güvenli bölme bulunamadı. Minimum kenar değerini düşürün, parça sayısını azaltın veya arama hassasiyetini 2-3°'ye çekip tekrar deneyin."
        );
        setPieces(null);
      } else {
        setPieces(result);
        setStatus("done");
      }
    }, 30);
  }

  function downloadDXF() {
    if (!pieces) return;
    const xs = polygon.map((p) => p[0]);
    const ys = polygon.map((p) => p[1]);
    const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1);
    const textH = Math.max(span / 60, 0.5);
    const dxf = buildDXF(polygon, pieces, unitM, textH);
    const blob = new Blob([dxf], { type: "application/dxf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ARSAPAY_sonuc.dxf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const VB = 600;
  const PAD = 40;
  const allPtsForBounds = polygon.length >= 3 ? polygon : drawPts;
  const bounds = useMemo(() => {
    if (!allPtsForBounds.length) return { minx: 0, miny: 0, scale: 1 };
    const xs = allPtsForBounds.map((p) => p[0]);
    const ys = allPtsForBounds.map((p) => p[1]);
    const minx = Math.min(...xs), maxx = Math.max(...xs);
    const miny = Math.min(...ys), maxy = Math.max(...ys);
    const w = Math.max(maxx - minx, 1);
    const h = Math.max(maxy - miny, 1);
    const scale = (VB - PAD * 2) / Math.max(w, h);
    return { minx, miny, maxx, maxy, scale };
  }, [allPtsForBounds]);

  function toSvg([x, y]) {
    const sx = PAD + (x - bounds.minx) * bounds.scale;
    const sy = VB - PAD - (y - bounds.miny) * bounds.scale;
    return [sx, sy];
  }

  function fromSvg([sx, sy]) {
    const x = bounds.minx + (sx - PAD) / bounds.scale;
    const y = bounds.miny + (VB - PAD - sy) / bounds.scale;
    return [x, y];
  }

  function handleSvgClick(e) {
    if (!drawMode && !refMode) return;
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * VB;
    const sy = ((e.clientY - rect.top) / rect.height) * VB;
    if (drawMode) {
      setDrawPts((prev) => [...prev, [sx, sy]]);
      return;
    }
    setRefClickPts((prev) => {
      const next = [...prev, [sx, sy]];
      if (next.length >= 2) {
        setRefLine(next.map(fromSvg));
        setRefMode(false);
        return [];
      }
      return next;
    });
  }

  function finishDrawing() {
    if (drawPts.length < 3) return;
    const ys = drawPts.map((p) => p[1]);
    const maxY = Math.max(...ys);
    const real = drawPts.map(([x, y]) => [Number(x.toFixed(2)), Number((maxY - y).toFixed(2))]);
    const text = real.map(([x, y]) => `${x},${y}`).join("\n");
    setDrawMode(false);
    setDrawPts([]);
    applyPointsText(text);
  }

  const pathOf = (pts) =>
    pts
      .map((p) => toSvg(p))
      .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)},${p[1].toFixed(2)}`)
      .join(" ") + " Z";

  const btnPrimary = { background: C.ink, color: C.paper, border: "none", padding: "11px 16px", fontFamily: FONT_DISPLAY, fontSize: 12.5, letterSpacing: "0.02em", fontWeight: 600 };
  const btnGhost = { background: "transparent", color: C.ink, border: `1px solid ${C.rule}`, padding: "8px 12px", fontFamily: FONT_DISPLAY, fontSize: 11.5 };
  const selectStyle = { width: "100%", border: `1px solid ${C.rule}`, padding: "7px 8px", fontSize: 13, background: C.panel, color: C.ink, fontFamily: FONT_BODY };

  return (
    <div style={{ fontFamily: FONT_BODY, background: C.paper, color: C.ink, minHeight: "100%", padding: "20px 16px 40px", boxSizing: "border-box" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        button { cursor: pointer; }
        button:active { transform: translateY(1px); }
        textarea:focus, input:focus { outline: 2px solid ${ACCENT}; outline-offset: 1px; }
      `}</style>

      <header style={{ maxWidth: 1040, margin: "0 auto 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: "#fff", padding: "5px 10px", borderRadius: 4, display: "flex" }}>
              <img src={logoUrl} alt="ArsaPay" style={{ height: 32, display: "block" }} />
            </div>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 11, color: C.labelMuted, letterSpacing: "0.04em" }}>
              SAGG+ MİMARLIK — EŞİT ALANLI PARSEL BÖLME
            </span>
          </div>
        </div>
        <div style={{ height: 1, background: C.rule, marginTop: 10 }} />
      </header>

      <div style={{ maxWidth: 1040, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr", gap: 18 }}>
        <div style={{ border: `1px solid ${C.infoBorder}`, background: C.infoBg, padding: 12, fontSize: 12.5, lineHeight: 1.5, color: C.muted }}>
          <b style={{ color: C.ink }}>Bilgilendirme:</b> Sitemizde yer alan veriler TKGM Parsel Sorgu sisteminden alınmakta olup, kesin imar bilgisi için işlem yapacağınız belediye ve ilgili birimlere başvurmanız gerekmektedir. Buradan edindiğiniz bilgilerin resmi bir bağlayıcılığı bulunmamaktadır.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.3fr) minmax(280px,1fr)", gap: 18 }}>
          <div style={{ border: `1px solid ${C.rule}`, background: C.panel }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderBottom: `1px solid ${C.rule}`, fontFamily: FONT_DISPLAY, fontSize: 11, letterSpacing: "0.03em", color: C.muted }}>
              <span>SINIR GÖRÜNÜMÜ</span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {!drawMode ? (
                  <button onClick={() => { setDrawMode(true); setDrawPts([]); setPieces(null); setStatus("idle"); }} style={btnGhost} disabled={refMode}>
                    Tıklayarak Çiz
                  </button>
                ) : (
                  <>
                    <button onClick={finishDrawing} style={btnGhost} disabled={drawPts.length < 3}>
                      Bitir ({drawPts.length})
                    </button>
                    <button onClick={() => { setDrawMode(false); setDrawPts([]); }} style={btnGhost}>
                      Vazgeç
                    </button>
                  </>
                )}
                {!refMode ? (
                  <button onClick={() => { setRefMode(true); setRefClickPts([]); setPieces(null); setStatus("idle"); }} style={btnGhost} disabled={drawMode}>
                    Referans Çizgisi Çiz
                  </button>
                ) : (
                  <button onClick={() => { setRefMode(false); setRefClickPts([]); }} style={btnGhost}>
                    Vazgeç ({refClickPts.length}/2)
                  </button>
                )}
                {refLine && (
                  <button onClick={() => { setRefLine(null); setUseRefDirection(false); }} style={btnGhost}>
                    Referansı Temizle
                  </button>
                )}
              </div>
            </div>
            <svg ref={svgRef} viewBox={`0 0 ${VB} ${VB}`} onClick={handleSvgClick} style={{ width: "100%", display: "block", aspectRatio: "1/1", cursor: drawMode ? "crosshair" : "default", background: C.panel }}>
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M20 0 L0 0 0 20" fill="none" stroke={C.gridLine} strokeWidth="1" />
                </pattern>
              </defs>
              <rect width={VB} height={VB} fill="url(#grid)" />

              {!drawMode && polygon.length >= 3 && (
                <path d={pathOf(polygon)} fill={pieces ? "none" : "rgba(193,68,14,0.06)"} stroke={C.ink} strokeWidth={pieces ? 1 : 1.6} strokeDasharray={pieces ? "4 3" : "none"} />
              )}

              {pieces &&
                pieces.map((sp, idx) => (
                  <path key={idx} d={pathOf(sp)} fill={PIECE_COLORS[idx % PIECE_COLORS.length] + "22"} stroke={PIECE_COLORS[idx % PIECE_COLORS.length]} strokeWidth={1.6} />
                ))}

              {pieces &&
                pieces.map((sp, idx) => {
                  const c = toSvg(centroidOf(sp));
                  const areaM = areaOf(sp) * unitM * unitM;
                  return (
                    <g key={idx}>
                      <text x={c[0]} y={c[1] - 4} textAnchor="middle" fontFamily={FONT_DISPLAY} fontSize="11" fontWeight="700" fill={PIECE_COLORS[idx % PIECE_COLORS.length]}>
                        P-{String(idx + 1).padStart(2, "0")}
                      </text>
                      <text x={c[0]} y={c[1] + 9} textAnchor="middle" fontFamily={FONT_DISPLAY} fontSize="9.5" fill={C.tableHeadText}>
                        {areaM.toFixed(1)} m²
                      </text>
                    </g>
                  );
                })}

              {drawMode && drawPts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={3.5} fill={ACCENT} />)}
              {drawMode && drawPts.length > 1 && (
                <polyline points={drawPts.map((p) => p.join(",")).join(" ")} fill="none" stroke={ACCENT} strokeWidth={1.4} />
              )}
              {drawMode && drawPts.length > 2 && (
                <line x1={drawPts[drawPts.length - 1][0]} y1={drawPts[drawPts.length - 1][1]} x2={drawPts[0][0]} y2={drawPts[0][1]} stroke={ACCENT} strokeDasharray="3 3" strokeWidth={1} />
              )}

              {refMode && refClickPts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={3.5} fill="#eab308" />)}
              {refLine && (
                <line
                  x1={toSvg(refLine[0])[0]} y1={toSvg(refLine[0])[1]}
                  x2={toSvg(refLine[1])[0]} y2={toSvg(refLine[1])[1]}
                  stroke="#eab308" strokeWidth={2.5}
                />
              )}
            </svg>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ border: `1px solid ${C.rule}`, background: C.panel, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 11, letterSpacing: "0.03em", color: C.muted }}>
                TKGM PARSEL SORGU
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <select value={tkgmProvinceId} onChange={(e) => handleProvinceChange(e.target.value)} style={selectStyle}>
                  <option value="">İl seçin</option>
                  {ilListe.map((p) => (
                    <option key={p.id} value={p.id}>{p.text}</option>
                  ))}
                </select>
                <select value={tkgmDistrictId} onChange={(e) => handleDistrictChange(e.target.value)} disabled={!tkgmProvinceId || tkgmDistrictsLoading} style={selectStyle}>
                  <option value="">{tkgmDistrictsLoading ? "İlçeler yükleniyor…" : "İlçe seçin"}</option>
                  {tkgmDistricts.map((d) => (
                    <option key={d.id} value={d.id}>{d.text}</option>
                  ))}
                </select>
                <select value={tkgmNeighborhoodId} onChange={(e) => setTkgmNeighborhoodId(e.target.value)} disabled={!tkgmDistrictId || tkgmNeighborhoodsLoading} style={selectStyle}>
                  <option value="">{tkgmNeighborhoodsLoading ? "Mahalleler yükleniyor…" : "Mahalle seçin"}</option>
                  {tkgmNeighborhoods.map((m) => (
                    <option key={m.id} value={m.id}>{m.text}</option>
                  ))}
                </select>
                <div style={{ display: "flex", gap: 8 }}>
                  <input placeholder="Ada" value={tkgmAda} onChange={(e) => setTkgmAda(e.target.value)} style={selectStyle} />
                  <input placeholder="Parsel" value={tkgmParsel} onChange={(e) => setTkgmParsel(e.target.value)} style={selectStyle} />
                </div>
              </div>
              <button onClick={fetchParcel} disabled={tkgmBusy || !tkgmNeighborhoodId} style={btnGhost}>
                {tkgmBusy ? "Sorgulanıyor…" : "Parsel Bul"}
              </button>
              {tkgmError && <div style={{ fontSize: 12, color: ACCENT }}>{tkgmError}</div>}
            </div>

            <div style={{ border: `1px solid ${C.rule}`, background: C.panel, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 11, letterSpacing: "0.03em", color: C.muted }}>
                MİLAS BELEDİYESİ E-İMAR (KEOS)
              </div>
              <div style={{ fontSize: 11.5, color: C.mutedLight }}>
                Parsel ID'yi Milas e-imar sorgu sayfasından (keos.milas.bel.tr/imardurumu) alıp girin.
              </div>
              <input placeholder="Parsel ID (örn. 173293)" value={milasParselId} onChange={(e) => setMilasParselId(e.target.value)} style={selectStyle} />
              <button onClick={fetchMilasParcel} disabled={milasBusy || !milasParselId.trim()} style={btnGhost}>
                {milasBusy ? "Sorgulanıyor…" : "Parsel Bul"}
              </button>
              {milasError && <div style={{ fontSize: 12, color: ACCENT }}>{milasError}</div>}
            </div>

            <Field label="Koordinatlar (x,y — her satır bir köşe)" C={C}>
              <textarea value={pointsText} onChange={(e) => applyPointsText(e.target.value)} rows={6} style={{ width: "100%", fontFamily: FONT_DISPLAY, fontSize: 12, border: `1px solid ${C.rule}`, padding: 8, resize: "vertical", background: C.panel, color: C.ink }} />
            </Field>
            {parseError && <div style={{ fontSize: 12, color: ACCENT }}>{parseError}</div>}
            {!parseError && isGeoInput && (
              <div style={{ fontSize: 12, color: C.muted }}>
                GPS koordinatı (enlem/boylam) algılandı — parselin merkezine göre yerel metre düzlemine otomatik dönüştürüldü.
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Parça sayısı (n)" C={C}><NumberInput value={n} onChange={setN} min={2} step={1} C={C} /></Field>
              <Field label="1 birim = ? metre" C={C}><NumberInput value={unitM} onChange={setUnitM} min={0.001} step={0.1} C={C} /></Field>
              <Field label="Min. kenar (m, 0=yok)" C={C}><NumberInput value={minM} onChange={setMinM} min={0} step={1} C={C} /></Field>
              <Field label="Arama hassasiyeti (°)" C={C}><NumberInput value={stepDeg} onChange={setStepDeg} min={1} max={45} step={1} C={C} /></Field>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: refLine ? C.ink : C.disabledText, cursor: refLine ? "pointer" : "not-allowed" }}>
              <input
                type="checkbox"
                checked={useRefDirection}
                disabled={!refLine}
                onChange={(e) => setUseRefDirection(e.target.checked)}
              />
              Referans çizgisine dik kesimler kullan (şeritler çizgiye paralel)
            </label>

            <div style={{ fontSize: 12, color: C.muted, fontFamily: FONT_DISPLAY }}>
              Toplam alan: <b style={{ color: C.ink }}>{(totalArea * unitM * unitM).toFixed(2)} m²</b>
              {" · "}Hedef parça: <b style={{ color: C.ink }}>{((totalArea * unitM * unitM) / n).toFixed(2)} m²</b>
            </div>

            <button onClick={runSplit} disabled={status === "running" || polygon.length < 3} style={btnPrimary}>
              {status === "running" ? "Hesaplanıyor…" : "Eşit Alanlı Böl"}
            </button>

            {status === "error" && (
              <div style={{ fontSize: 12.5, color: C.errorText, background: C.errorBg, border: `1px solid ${C.errorBorder}`, padding: 10, lineHeight: 1.5 }}>
                {errorMsg}
              </div>
            )}

            {pieces && <button onClick={downloadDXF} style={btnGhost}>DXF olarak indir ↓</button>}
          </div>
        </div>

        {pieces && (
          <div style={{ border: `1px solid ${C.rule}`, background: C.panel }}>
            <div style={{ padding: "8px 12px", borderBottom: `1px solid ${C.rule}`, fontFamily: FONT_DISPLAY, fontSize: 11, letterSpacing: "0.03em", color: C.muted }}>
              PARSEL PAYLAŞIM LEJANTI
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT_DISPLAY, fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: C.tableHeadBg }}>
                  {["Parça", "Alan (m²)", "Min kenar (m)", "Renk", "Kenarlar (m)"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "7px 10px", borderBottom: `1px solid ${C.rule}`, fontWeight: 600, color: C.tableHeadText }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pieces.map((sp, idx) => {
                  const simp = simplifyCollinear(sp, 1e-7);
                  const areaM = areaOf(simp) * unitM * unitM;
                  const mn = minEdgeOf(simp) * unitM;
                  const edges = [];
                  const m = simp.length;
                  for (let i = 0; i < m; i++) edges.push(dist(simp[i], simp[(i + 1) % m]) * unitM);
                  const color = PIECE_COLORS[idx % PIECE_COLORS.length];
                  return (
                    <tr key={idx} style={{ borderBottom: `1px solid ${C.rule}` }}>
                      <td style={{ padding: "7px 10px", fontWeight: 700 }}>P-{String(idx + 1).padStart(2, "0")}</td>
                      <td style={{ padding: "7px 10px" }}>{areaM.toFixed(2)}</td>
                      <td style={{ padding: "7px 10px" }}>{mn.toFixed(2)}</td>
                      <td style={{ padding: "7px 10px" }}>
                        <span style={{ display: "inline-block", width: 11, height: 11, background: color, borderRadius: 2, marginRight: 6, verticalAlign: "middle" }} />
                      </td>
                      <td style={{ padding: "7px 10px", color: C.muted }}>{edges.map((d, i) => `K${i + 1}=${d.toFixed(2)}`).join(", ")}</td>
                    </tr>
                  );
                })}
                <tr style={{ background: C.tableHeadBg }}>
                  <td style={{ padding: "7px 10px", fontWeight: 600 }}>Toplam (parçalar)</td>
                  <td style={{ padding: "7px 10px", fontWeight: 600 }} colSpan={4}>
                    {pieces.reduce((s, sp) => s + areaOf(sp) * unitM * unitM, 0).toFixed(2)} m²
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "7px 10px", fontWeight: 600 }}>Ana parsel alanı</td>
                  <td style={{ padding: "7px 10px", fontWeight: 600 }} colSpan={4}>
                    {(totalArea * unitM * unitM).toFixed(2)} m²
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <footer style={{ fontSize: 11, color: C.mutedLight, fontFamily: FONT_DISPLAY, textAlign: "center", paddingTop: 4 }}>
          ArsaPay v1.0 uygulaması SAGG markasına ait olup, tüm hakları saklıdır. 2026.
        </footer>
      </div>
    </div>
  );
}

function Field({ label, children, C }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 10.5, color: C.labelMuted, letterSpacing: "0.03em", marginBottom: 5 }}>
        {label.toUpperCase()}
      </div>
      {children}
    </label>
  );
}

function NumberInput({ value, onChange, min, max, step, C }) {
  return (
    <input type="number" value={value} min={min} max={max} step={step} onChange={(e) => onChange(Number(e.target.value))}
      style={{ width: "100%", border: `1px solid ${C.rule}`, padding: "7px 8px", fontSize: 13, background: C.panel, color: C.ink }} />
  );
}
