"""DWG/DXF okuma ve mimari eleman çıkarımı.

Bu modül AutoCAD ile çizilmiş bir mimari ruhsat projesini (.dwg / .dxf)
okur, katman adlarına göre duvar / kapı / pencere / kolon gibi elemanları
ayıklar ve projeye ait metin/başlık bilgilerini toplar.

.dwg dosyaları kapalı bir formattır; doğrudan okunamaz. ODA File Converter
(ücretsiz) kuruluysa otomatik olarak .dxf'e çevrilir. Kurulu değilse
kullanıcıya nasıl kuracağı anlatılır.
"""
from __future__ import annotations

import math
import os
import tempfile
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import ezdxf
from ezdxf.document import Drawing

# ---------------------------------------------------------------------------
# Katman (layer) sınıflandırma anahtar kelimeleri
# ---------------------------------------------------------------------------
LAYER_KEYWORDS = {
    "wall": ["DUVAR", "WALL", "A-WALL", "AWALL", "MUR", "PERDE"],
    "door": ["KAPI", "DOOR", "A-DOOR", "ADOOR"],
    "window": ["PENCERE", "WINDOW", "A-GLAZ", "A-WIND", "CAM"],
    "column": ["KOLON", "COLUMN", "A-COLS", "COL"],
    "stair": ["MERDIVEN", "MERDİVEN", "STAIR", "STEP"],
    "furniture": ["MOBILYA", "MOBİLYA", "FURN", "FURNITURE"],
    "dimension": ["OLCU", "ÖLÇÜ", "DIM", "DIMENSION", "COTE"],
    "text": ["YAZI", "TEXT", "METIN", "METİN", "ANNO"],
}

# AutoCAD $INSUNITS kod -> metre çarpanı
INSUNITS_TO_M = {
    0: None,     # birimsiz
    1: 0.0254,   # inç
    2: 0.3048,   # ft
    4: 0.001,    # mm
    5: 0.01,     # cm
    6: 1.0,      # m
    8: 1e-6,     # mikron
    9: 0.001,    # mm (alternatif)
    10: 0.9144,  # yard
}

# Başlık bloğu / proje bilgisi ararken kullanılan anahtar kelimeler
INFO_KEYS = [
    "ADA", "PARSEL", "PAFTA", "MALIK", "MALİK", "MIMAR", "MİMAR",
    "PROJE", "TARIH", "TARİH", "OLCEK", "ÖLÇEK", "SCALE", "PROJECT",
    "ARCHITECT", "OWNER", "ADRES", "ADDRESS", "PLAN", "KAT", "ALAN",
    "TAKS", "KAKS", "YAPI", "RUHSAT",
]


@dataclass
class Segment:
    """3B'ye çevrilecek düz duvar/eleman parçası (metre cinsinden)."""
    x0: float
    y0: float
    x1: float
    y1: float

    @property
    def length(self) -> float:
        return math.hypot(self.x1 - self.x0, self.y1 - self.y0)


@dataclass
class DrawingData:
    """Okunan çizimden çıkarılan tüm veriler."""
    source_path: str
    doc: Drawing
    unit_scale: float                      # çizim birimi -> metre
    unit_name: str
    bbox: Tuple[float, float, float, float]  # metre: (minx,miny,maxx,maxy)
    wall_segments: List[Segment] = field(default_factory=list)
    door_segments: List[Segment] = field(default_factory=list)
    window_segments: List[Segment] = field(default_factory=list)
    column_segments: List[Segment] = field(default_factory=list)
    layer_names: List[str] = field(default_factory=list)
    texts: List[str] = field(default_factory=list)
    info: Dict[str, str] = field(default_factory=dict)
    entity_counts: Dict[str, int] = field(default_factory=dict)

    @property
    def width_m(self) -> float:
        return self.bbox[2] - self.bbox[0]

    @property
    def depth_m(self) -> float:
        return self.bbox[3] - self.bbox[1]

    @property
    def footprint_area_m2(self) -> float:
        return max(0.0, self.width_m) * max(0.0, self.depth_m)


class DwgReadError(Exception):
    pass


# ---------------------------------------------------------------------------
# Dosya yükleme
# ---------------------------------------------------------------------------
def load_document(path: str, log=print) -> Drawing:
    """.dwg veya .dxf dosyasını ezdxf Drawing nesnesi olarak yükler."""
    if not os.path.isfile(path):
        raise DwgReadError(f"Dosya bulunamadı: {path}")

    ext = os.path.splitext(path)[1].lower()
    if ext == ".dxf":
        log(f"DXF dosyası okunuyor: {os.path.basename(path)}")
        try:
            return ezdxf.readfile(path)
        except ezdxf.DXFStructureError as exc:
            # Bozuk/hatalı DXF için kurtarma modunu dene
            log("DXF yapısı hatalı, kurtarma modu deneniyor...")
            from ezdxf import recover
            doc, auditor = recover.readfile(path)
            if auditor.has_errors:
                log(f"Uyarı: {len(auditor.errors)} yapısal hata bulundu ama okuma sürdü.")
            return doc
    elif ext == ".dwg":
        return _load_dwg(path, log)
    else:
        raise DwgReadError(
            f"Desteklenmeyen dosya türü: {ext}. Lütfen .dwg veya .dxf yükleyin."
        )


def _load_dwg(path: str, log=print) -> Drawing:
    from ezdxf.addons import odafc

    if not odafc.is_installed():
        raise DwgReadError(
            ".dwg dosyalarını okumak için ODA File Converter gereklidir "
            "(ücretsiz).\n"
            "1) https://www.opendesign.com/guestfiles/oda_file_converter "
            "adresinden indirip kurun.\n"
            "2) Programı yeniden başlatın.\n"
            "Alternatif: Dosyayı AutoCAD'de açıp 'Farklı Kaydet > DXF' ile "
            "kaydedip .dxf yükleyebilirsiniz."
        )
    log("ODA File Converter ile .dwg -> .dxf dönüştürülüyor...")
    try:
        doc = odafc.readfile(path)
    except Exception as exc:  # pragma: no cover - dış araca bağlı
        raise DwgReadError(f".dwg dönüştürme hatası: {exc}")
    log("Dönüştürme tamam.")
    return doc


# ---------------------------------------------------------------------------
# Birim tespiti
# ---------------------------------------------------------------------------
def detect_unit_scale(doc: Drawing, bbox_raw: Tuple[float, float, float, float],
                      log=print) -> Tuple[float, str]:
    """Çizim birimini metreye çeviren çarpanı bulur."""
    insunits = doc.header.get("$INSUNITS", 0)
    scale = INSUNITS_TO_M.get(insunits)
    if scale:
        name = {0.001: "mm", 0.01: "cm", 1.0: "m"}.get(scale, f"x{scale}")
        log(f"Birim başlıktan tespit edildi: {name} (INSUNITS={insunits})")
        return scale, name

    # Başlıkta birim yoksa boyuta bakarak tahmin et
    max_dim = max(bbox_raw[2] - bbox_raw[0], bbox_raw[3] - bbox_raw[1])
    if max_dim > 2000:      # 2000'den büyük => büyük olasılıkla mm
        log(f"Birim belirsiz; büyük koordinatlar (max={max_dim:.0f}) => mm varsayıldı")
        return 0.001, "mm (tahmin)"
    log(f"Birim belirsiz; küçük koordinatlar (max={max_dim:.1f}) => m varsayıldı")
    return 1.0, "m (tahmin)"


# ---------------------------------------------------------------------------
# Katman sınıflandırma
# ---------------------------------------------------------------------------
def classify_layer(layer_name: str) -> Optional[str]:
    up = layer_name.upper()
    for category, keys in LAYER_KEYWORDS.items():
        for k in keys:
            if k in up:
                return category
    return None


# ---------------------------------------------------------------------------
# Ana çıkarım
# ---------------------------------------------------------------------------
def extract(path: str, log=print) -> DrawingData:
    doc = load_document(path, log)
    msp = doc.modelspace()

    # Ham bounding box (çizim birimi)
    bbox_raw = _bounding_box(msp)
    scale, unit_name = detect_unit_scale(doc, bbox_raw, log)

    def sc(x):  # koordinatı metreye çevir
        return x * scale

    data = DrawingData(
        source_path=path,
        doc=doc,
        unit_scale=scale,
        unit_name=unit_name,
        bbox=(sc(bbox_raw[0]), sc(bbox_raw[1]), sc(bbox_raw[2]), sc(bbox_raw[3])),
    )
    data.layer_names = sorted(l.dxf.name for l in doc.layers)

    counts: Dict[str, int] = {}
    for e in msp:
        counts[e.dxftype()] = counts.get(e.dxftype(), 0) + 1
    data.entity_counts = counts

    log(f"{sum(counts.values())} nesne, {len(data.layer_names)} katman bulundu.")

    # Elemanları çıkar
    for e in msp:
        etype = e.dxftype()
        category = classify_layer(_entity_layer(e))
        target = {
            "wall": data.wall_segments,
            "door": data.door_segments,
            "window": data.window_segments,
            "column": data.column_segments,
        }.get(category)

        if target is not None and etype in ("LINE", "LWPOLYLINE", "POLYLINE"):
            _append_segments(e, target, scale)

        # Proje metinlerini topla
        if etype in ("TEXT", "MTEXT"):
            txt = _entity_text(e)
            if txt:
                data.texts.append(txt)

        # Başlık bloğu attribute'ları (INSERT) -> proje bilgisi
        if etype == "INSERT":
            _collect_block_info(e, data.info)

    # Duvar katmanı hiç yoksa: tüm LINE/POLYLINE'ları duvar varsay (yedek plan)
    if not data.wall_segments:
        log("Duvar katmanı bulunamadı; tüm çizgiler duvar olarak varsayılıyor.")
        for e in msp:
            if e.dxftype() in ("LINE", "LWPOLYLINE", "POLYLINE"):
                cat = classify_layer(_entity_layer(e))
                if cat in ("dimension", "text"):
                    continue
                _append_segments(e, data.wall_segments, scale)

    _extract_info_from_texts(data)
    log(
        f"Duvar: {len(data.wall_segments)} | Kapı: {len(data.door_segments)} | "
        f"Pencere: {len(data.window_segments)} | Kolon: {len(data.column_segments)}"
    )
    return data


# ---------------------------------------------------------------------------
# Yardımcılar
# ---------------------------------------------------------------------------
def _entity_layer(e) -> str:
    try:
        return e.dxf.layer
    except Exception:
        return "0"


def _entity_text(e) -> str:
    try:
        if e.dxftype() == "MTEXT":
            return e.plain_text().strip()
        return str(e.dxf.text).strip()
    except Exception:
        return ""


def _append_segments(e, target: List[Segment], scale: float):
    etype = e.dxftype()
    if etype == "LINE":
        s, t = e.dxf.start, e.dxf.end
        target.append(Segment(s.x * scale, s.y * scale, t.x * scale, t.y * scale))
    elif etype == "LWPOLYLINE":
        pts = [(p[0], p[1]) for p in e.get_points()]
        if getattr(e, "closed", False) or e.dxf.get("flags", 0) & 1:
            pts = pts + [pts[0]] if pts else pts
        for a, b in zip(pts, pts[1:]):
            target.append(Segment(a[0] * scale, a[1] * scale, b[0] * scale, b[1] * scale))
    elif etype == "POLYLINE":
        pts = [(v.dxf.location.x, v.dxf.location.y) for v in e.vertices]
        if e.is_closed and pts:
            pts = pts + [pts[0]]
        for a, b in zip(pts, pts[1:]):
            target.append(Segment(a[0] * scale, a[1] * scale, b[0] * scale, b[1] * scale))


def _bounding_box(msp) -> Tuple[float, float, float, float]:
    from ezdxf.bbox import extents
    try:
        box = extents(msp, fast=True)
        if box.has_data:
            return (box.extmin.x, box.extmin.y, box.extmax.x, box.extmax.y)
    except Exception:
        pass
    # Yedek: elle tara
    minx = miny = math.inf
    maxx = maxy = -math.inf
    for e in msp:
        try:
            if e.dxftype() == "LINE":
                for p in (e.dxf.start, e.dxf.end):
                    minx, miny = min(minx, p.x), min(miny, p.y)
                    maxx, maxy = max(maxx, p.x), max(maxy, p.y)
        except Exception:
            continue
    if minx is math.inf:
        return (0.0, 0.0, 1.0, 1.0)
    return (minx, miny, maxx, maxy)


def _collect_block_info(insert, info: Dict[str, str]):
    try:
        if not insert.attribs:
            return
        for att in insert.attribs:
            tag = str(att.dxf.tag).strip()
            val = str(att.dxf.text).strip()
            if tag and val and _looks_like_info(tag):
                info.setdefault(tag.upper(), val)
    except Exception:
        pass


def _looks_like_info(tag: str) -> bool:
    up = tag.upper()
    return any(k in up for k in INFO_KEYS)


def _extract_info_from_texts(data: DrawingData):
    """Serbest metinlerde 'ANAHTAR: değer' kalıbı ara."""
    for txt in data.texts:
        if ":" in txt:
            key, _, val = txt.partition(":")
            key, val = key.strip(), val.strip()
            if 1 <= len(key) <= 30 and val and _looks_like_info(key):
                data.info.setdefault(key.upper(), val)
