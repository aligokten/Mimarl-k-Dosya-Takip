"""A3 yatay PDF proje portföyü üretimi.

Kapak, proje bilgileri, 2B plan ve 3B görünüm sayfalarını içeren, her
sayfada başlık bloğu (antet) bulunan bir portföy hazırlar.
"""
from __future__ import annotations

import datetime
import os
from typing import Dict, List, Optional

from reportlab.lib.pagesizes import A3, landscape
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

PAGE = landscape(A3)  # (420mm x 297mm)
PW, PH = PAGE
MARGIN = 12 * mm
TITLEBLOCK_H = 22 * mm

# Renk paleti
INK = (0.15, 0.16, 0.18)
ACCENT = (0.16, 0.42, 0.55)
LIGHT = (0.90, 0.90, 0.90)


class PortfolioPDF:
    def __init__(self, out_path: str, project_name: str,
                 info: Optional[Dict[str, str]] = None):
        self.out_path = out_path
        self.project_name = project_name or "İsimsiz Proje"
        self.info = info or {}
        self.c = canvas.Canvas(out_path, pagesize=PAGE)
        self._page_no = 0
        self._total_pages = 0

    # ------------------------------------------------------------------
    def _titleblock(self, sheet_title: str):
        c = self.c
        x0, y0 = MARGIN, MARGIN
        w = PW - 2 * MARGIN
        # Dış çerçeve
        c.setLineWidth(1.2)
        c.setStrokeColorRGB(*INK)
        c.rect(x0, y0, w, PH - 2 * MARGIN)
        # Antet kutusu
        c.setLineWidth(0.8)
        c.rect(x0, y0, w, TITLEBLOCK_H)
        c.line(x0 + w - 70 * mm, y0, x0 + w - 70 * mm, y0 + TITLEBLOCK_H)
        c.line(x0 + w - 140 * mm, y0, x0 + w - 140 * mm, y0 + TITLEBLOCK_H)

        c.setFillColorRGB(*INK)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(x0 + 4 * mm, y0 + TITLEBLOCK_H - 8 * mm, self.project_name[:60])
        c.setFont("Helvetica", 8)
        c.drawString(x0 + 4 * mm, y0 + 5 * mm, sheet_title)

        # Orta bölme: bilgi
        mid_x = x0 + w - 140 * mm + 4 * mm
        c.setFont("Helvetica", 7)
        tarih = self.info.get("TARIH") or self.info.get("TARİH") or \
            datetime.date.today().strftime("%d.%m.%Y")
        c.drawString(mid_x, y0 + TITLEBLOCK_H - 7 * mm, f"Tarih: {tarih}")
        mimar = self.info.get("MIMAR") or self.info.get("MİMAR") or \
            self.info.get("ARCHITECT") or "-"
        c.drawString(mid_x, y0 + TITLEBLOCK_H - 13 * mm, f"Mimar: {mimar[:28]}")

        # Sağ bölme: pafta no
        right_x = x0 + w - 70 * mm + 4 * mm
        c.setFont("Helvetica-Bold", 9)
        c.drawString(right_x, y0 + TITLEBLOCK_H - 8 * mm, "MİMARİ3D PORTFÖY")
        c.setFont("Helvetica", 8)
        self._page_no += 1
        c.drawString(right_x, y0 + 5 * mm,
                     f"Sayfa {self._page_no}" +
                     (f" / {self._total_pages}" if self._total_pages else ""))

    def _content_area(self):
        """Antet üstündeki kullanılabilir alan (x, y, w, h)."""
        x = MARGIN + 6 * mm
        y = MARGIN + TITLEBLOCK_H + 6 * mm
        w = PW - 2 * MARGIN - 12 * mm
        h = PH - 2 * MARGIN - TITLEBLOCK_H - 12 * mm
        return x, y, w, h

    def _finish_page(self):
        self.c.showPage()

    # ------------------------------------------------------------------
    def cover(self, thumbnail: Optional[str] = None, subtitle: str = ""):
        c = self.c
        c.setFillColorRGB(*ACCENT)
        c.rect(0, PH - 60 * mm, PW, 60 * mm, fill=1, stroke=0)
        c.setFillColorRGB(1, 1, 1)
        c.setFont("Helvetica-Bold", 34)
        c.drawString(MARGIN + 8 * mm, PH - 40 * mm, "MİMARİ PROJE PORTFÖYÜ")
        c.setFont("Helvetica", 16)
        c.drawString(MARGIN + 8 * mm, PH - 52 * mm, self.project_name[:70])

        if thumbnail and os.path.isfile(thumbnail):
            self._draw_image_fit(thumbnail, MARGIN + 30 * mm, MARGIN + 30 * mm,
                                  PW - 2 * MARGIN - 60 * mm, PH - 130 * mm)

        c.setFillColorRGB(*INK)
        c.setFont("Helvetica", 11)
        if subtitle:
            c.drawString(MARGIN + 8 * mm, MARGIN + 14 * mm, subtitle)
        c.setFont("Helvetica-Oblique", 9)
        c.drawString(MARGIN + 8 * mm, MARGIN + 6 * mm,
                     "Mimari3D — DWG'den 3B model ve PDF portföy üretici")
        self._page_no += 1
        self._finish_page()

    # ------------------------------------------------------------------
    def info_page(self, stats: Dict[str, str], layers: List[str]):
        self._titleblock("Proje Bilgileri ve İstatistikler")
        x, y, w, h = self._content_area()
        c = self.c
        c.setFillColorRGB(*ACCENT)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(x, y + h - 6 * mm, "Proje Bilgileri")

        # Sol sütun: proje bilgi tablosu
        col_w = w * 0.48
        row_y = y + h - 18 * mm
        merged = {}
        merged.update(self.info)
        merged.update(stats)
        c.setFont("Helvetica", 10)
        for key, val in merged.items():
            if row_y < y + 6 * mm:
                break
            c.setFillColorRGB(*INK)
            c.setFont("Helvetica-Bold", 9)
            c.drawString(x, row_y, f"{key}:")
            c.setFont("Helvetica", 9)
            c.drawString(x + 45 * mm, row_y, str(val)[:40])
            c.setStrokeColorRGB(*LIGHT)
            c.setLineWidth(0.3)
            c.line(x, row_y - 2 * mm, x + col_w, row_y - 2 * mm)
            row_y -= 8 * mm

        # Sağ sütun: katman listesi
        rx = x + col_w + 12 * mm
        c.setFillColorRGB(*ACCENT)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(rx, y + h - 6 * mm, f"Katmanlar ({len(layers)})")
        c.setFillColorRGB(*INK)
        c.setFont("Helvetica", 8)
        ry = y + h - 14 * mm
        for name in layers:
            if ry < y + 6 * mm:
                c.drawString(rx, ry, "...")
                break
            c.drawString(rx, ry, f"• {name[:48]}")
            ry -= 5 * mm
        self._finish_page()

    # ------------------------------------------------------------------
    def image_page(self, title: str, image_path: str, caption: str = ""):
        if not (image_path and os.path.isfile(image_path)):
            return
        self._titleblock(title)
        x, y, w, h = self._content_area()
        c = self.c
        c.setFillColorRGB(*ACCENT)
        c.setFont("Helvetica-Bold", 13)
        c.drawString(x, y + h - 5 * mm, title)
        img_h = h - 12 * mm
        self._draw_image_fit(image_path, x, y, w, img_h)
        if caption:
            c.setFillColorRGB(*INK)
            c.setFont("Helvetica-Oblique", 8)
            c.drawString(x, y - 1 * mm, caption)
        self._finish_page()

    def gallery_page(self, title: str, images: List[str]):
        """2x2 ızgarada 3B görünümleri gösterir."""
        images = [p for p in images if p and os.path.isfile(p)][:4]
        if not images:
            return
        self._titleblock(title)
        x, y, w, h = self._content_area()
        c = self.c
        c.setFillColorRGB(*ACCENT)
        c.setFont("Helvetica-Bold", 13)
        c.drawString(x, y + h - 5 * mm, title)
        grid_top = y + h - 10 * mm
        cell_w = (w - 8 * mm) / 2
        cell_h = (grid_top - y - 4 * mm) / 2
        labels = ["İzometrik", "Kuş Bakışı", "Ön Cephe", "Yan Cephe"]
        for i, img in enumerate(images):
            col, rowi = i % 2, i // 2
            cx = x + col * (cell_w + 8 * mm)
            cy = grid_top - (rowi + 1) * cell_h - rowi * 4 * mm
            self._draw_image_fit(img, cx, cy, cell_w, cell_h - 6 * mm)
            c.setFillColorRGB(*INK)
            c.setFont("Helvetica-Bold", 9)
            if i < len(labels):
                c.drawString(cx, cy - 4 * mm, labels[i])
        self._finish_page()

    # ------------------------------------------------------------------
    def _draw_image_fit(self, path: str, x, y, w, h):
        try:
            img = ImageReader(path)
            iw, ih = img.getSize()
            scale = min(w / iw, h / ih)
            dw, dh = iw * scale, ih * scale
            ox = x + (w - dw) / 2
            oy = y + (h - dh) / 2
            self.c.drawImage(img, ox, oy, dw, dh,
                             preserveAspectRatio=True, mask="auto")
        except Exception:
            pass

    def save(self):
        self.c.save()
        return self.out_path
