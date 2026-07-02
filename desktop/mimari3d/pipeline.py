"""Uçtan uca işlem hattı: DWG/DXF -> 3B model + A3 PDF portföy."""
from __future__ import annotations

import os
import tempfile
from dataclasses import dataclass
from typing import Callable, List, Optional

from dwg_reader import extract, DrawingData
from model3d import Model3D
from plan_render import render_plan
from pdf_report import PortfolioPDF


@dataclass
class PipelineResult:
    pdf_path: str
    obj_path: str
    view_images: List[str]
    plan_images: List[str]
    data: DrawingData


def run(input_path: str,
        output_dir: str,
        wall_height: float = 3.0,
        wall_thickness: float = 0.2,
        project_name: Optional[str] = None,
        log: Callable[[str], None] = print) -> PipelineResult:
    """Tüm süreci çalıştırır ve üretilen dosyaların yollarını döndürür."""
    os.makedirs(output_dir, exist_ok=True)
    base = os.path.splitext(os.path.basename(input_path))[0]
    project_name = project_name or base

    log("1/5  Çizim okunuyor ve elemanlar ayıklanıyor...")
    data = extract(input_path, log)

    work = os.path.join(output_dir, f"{base}_ekler")
    os.makedirs(work, exist_ok=True)

    log("2/5  2B plan görüntüleri üretiliyor...")
    plan_images = render_plan(data, work, prefix=base)
    log(f"     {len(plan_images)} plan görüntüsü üretildi.")

    log("3/5  3B model oluşturuluyor (duvarlar yükseltiliyor)...")
    model = Model3D(data, wall_height=wall_height, wall_thickness=wall_thickness)
    view_images: List[str] = []
    obj_path = os.path.join(output_dir, f"{base}.obj")
    if model.has_geometry:
        view_images = model.render_views(work, prefix=base)
        model.export_obj(obj_path)
        log(f"     {len(view_images)} adet 3B görünüm ve OBJ modeli üretildi.")
    else:
        log("     Uyarı: 3B'ye çevrilecek duvar/geometri bulunamadı.")
        obj_path = ""

    log("4/5  Proje istatistikleri hesaplanıyor...")
    stats = _build_stats(data, model, wall_height)

    log("5/5  A3 yatay PDF portföy hazırlanıyor...")
    pdf_path = os.path.join(output_dir, f"{base}_portfoy.pdf")
    _build_pdf(pdf_path, project_name, data, stats, view_images, plan_images)
    log(f"Tamamlandı. PDF: {pdf_path}")

    return PipelineResult(pdf_path, obj_path, view_images, plan_images, data)


def _build_stats(data: DrawingData, model: Model3D, wall_height: float) -> dict:
    total_wall_len = sum(s.length for s in data.wall_segments)
    return {
        "Birim": data.unit_name,
        "Genişlik (m)": f"{data.width_m:.2f}",
        "Derinlik (m)": f"{data.depth_m:.2f}",
        "Taban Alanı (m²)": f"{data.footprint_area_m2:.1f}",
        "Toplam Duvar Uzunluğu (m)": f"{total_wall_len:.1f}",
        "Duvar Yüksekliği (m)": f"{wall_height:.2f}",
        "Duvar Sayısı": str(len(data.wall_segments)),
        "Kapı Sayısı": str(len(data.door_segments)),
        "Pencere Sayısı": str(len(data.window_segments)),
        "Kolon Sayısı": str(len(data.column_segments)),
        "Toplam Nesne": str(sum(data.entity_counts.values())),
    }


def _build_pdf(pdf_path, project_name, data, stats, view_images, plan_images):
    pdf = PortfolioPDF(pdf_path, project_name, info=data.info)
    # Toplam sayfa sayısını önceden hesapla (antet için)
    pages = 1 + 1 + len(plan_images) + (1 if view_images else 0)
    pdf._total_pages = pages

    cover_thumb = view_images[0] if view_images else (
        plan_images[0] if plan_images else None)
    pdf.cover(thumbnail=cover_thumb,
              subtitle=f"Kaynak: {os.path.basename(data.source_path)}")
    pdf.info_page(stats, data.layer_names)

    for i, img in enumerate(plan_images):
        title = "2B Mimari Plan" + (f" — Pafta {i}" if i else " — Model Uzayı")
        pdf.image_page(title, img, caption="AutoCAD çiziminden üretilen plan görünümü")

    if view_images:
        pdf.gallery_page("3B Model Görünümleri", view_images)

    pdf.save()
    return pdf_path
