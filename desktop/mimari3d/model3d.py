"""2B mimari plandan 3B model üretimi.

Duvar parçaları düşey yönde yükseltilerek (extrude) 3B kütle oluşturulur.
Sonuç hem OBJ dosyası olarak dışa aktarılır hem de birkaç kamera açısından
PNG görüntü olarak render edilir (PDF portföyünde kullanmak için).
"""
from __future__ import annotations

import math
import os
from typing import List, Tuple

import matplotlib
matplotlib.use("Agg")  # ekransız (headless) render
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
import numpy as np

from dwg_reader import DrawingData, Segment

# 3B kutu için 6 yüzü tanımlayan köşe indeksleri
_BOX_FACES = [
    (0, 1, 2, 3),  # alt
    (4, 5, 6, 7),  # üst
    (0, 1, 5, 4),  # yan
    (1, 2, 6, 5),
    (2, 3, 7, 6),
    (3, 0, 4, 7),
]


def _segment_to_box(seg: Segment, thickness: float, height: float,
                    z0: float = 0.0) -> np.ndarray:
    """Bir duvar parçasını 8 köşeli 3B kutuya çevirir."""
    dx, dy = seg.x1 - seg.x0, seg.y1 - seg.y0
    length = math.hypot(dx, dy)
    if length < 1e-9:
        return None
    # Parçaya dik birim vektör (kalınlık yönü)
    nx, ny = -dy / length, dx / length
    h = thickness / 2.0
    # Alt yüz köşeleri (saat yönü)
    p0 = (seg.x0 + nx * h, seg.y0 + ny * h, z0)
    p1 = (seg.x1 + nx * h, seg.y1 + ny * h, z0)
    p2 = (seg.x1 - nx * h, seg.y1 - ny * h, z0)
    p3 = (seg.x0 - nx * h, seg.y0 - ny * h, z0)
    top = z0 + height
    p4 = (p0[0], p0[1], top)
    p5 = (p1[0], p1[1], top)
    p6 = (p2[0], p2[1], top)
    p7 = (p3[0], p3[1], top)
    return np.array([p0, p1, p2, p3, p4, p5, p6, p7], dtype=float)


class Model3D:
    def __init__(self, data: DrawingData, wall_height: float = 3.0,
                 wall_thickness: float = 0.2, window_sill: float = 0.9,
                 window_height: float = 1.4):
        self.data = data
        self.wall_height = wall_height
        self.wall_thickness = wall_thickness
        self.window_sill = window_sill
        self.window_height = window_height
        self.boxes: List[Tuple[np.ndarray, str]] = []  # (köşeler, kategori)
        self._build()

    def _build(self):
        for seg in self.data.wall_segments:
            box = _segment_to_box(seg, self.wall_thickness, self.wall_height)
            if box is not None:
                self.boxes.append((box, "wall"))
        # Kolonlar biraz daha kalın kutular
        for seg in self.data.column_segments:
            box = _segment_to_box(seg, self.wall_thickness * 2, self.wall_height)
            if box is not None:
                self.boxes.append((box, "column"))
        # Pencereler: parapet yüksekliğinden itibaren kısa kutular
        for seg in self.data.window_segments:
            box = _segment_to_box(seg, self.wall_thickness, self.window_height,
                                  z0=self.window_sill)
            if box is not None:
                self.boxes.append((box, "window"))

    # ------------------------------------------------------------------
    @property
    def has_geometry(self) -> bool:
        return len(self.boxes) > 0

    def _geometry_bounds(self):
        """3B kutuların gerçek sınırları (plan dışı metinlerden etkilenmez)."""
        if not self.boxes:
            return self.data.bbox
        allpts = np.vstack([b for b, _ in self.boxes])
        return (float(allpts[:, 0].min()), float(allpts[:, 1].min()),
                float(allpts[:, 0].max()), float(allpts[:, 1].max()))

    def _floor_slab(self) -> np.ndarray:
        minx, miny, maxx, maxy = self._geometry_bounds()
        t = 0.15
        return np.array([
            (minx, miny, -t), (maxx, miny, -t), (maxx, maxy, -t), (minx, maxy, -t),
            (minx, miny, 0.0), (maxx, miny, 0.0), (maxx, maxy, 0.0), (minx, maxy, 0.0),
        ], dtype=float)

    # ------------------------------------------------------------------
    def render_views(self, out_dir: str, prefix: str = "model3d") -> List[str]:
        """Farklı kamera açılarından PNG görüntüler üretir."""
        os.makedirs(out_dir, exist_ok=True)
        colors = {
            "wall": ("#c9b79c", "#8a7c66"),
            "column": ("#9aa0a6", "#5f6368"),
            "window": ("#8fd0e8", "#4a90b8"),
            "floor": ("#e8e2d6", "#b8b0a0"),
        }
        views = [
            ("izometrik", 25, -60),
            ("kus_bakisi", 55, -90),
            ("on_cephe", 8, -90),
            ("yan_cephe", 8, 0),
        ]
        paths = []
        for name, elev, azim in views:
            p = os.path.join(out_dir, f"{prefix}_{name}.png")
            self._render_single(p, elev, azim, colors)
            paths.append(p)
        return paths

    def _render_single(self, path: str, elev: float, azim: float, colors):
        fig = plt.figure(figsize=(11.69, 8.27), dpi=150)  # A4 oranı
        ax = fig.add_subplot(111, projection="3d")

        # Zemin döşemesi
        slab = self._floor_slab()
        face, edge = colors["floor"]
        ax.add_collection3d(Poly3DCollection(
            [slab[list(f)] for f in _BOX_FACES],
            facecolor=face, edgecolor=edge, linewidths=0.3, alpha=0.6))

        # Kutular
        for box, cat in self.boxes:
            face, edge = colors.get(cat, colors["wall"])
            polys = [box[list(f)] for f in _BOX_FACES]
            ax.add_collection3d(Poly3DCollection(
                polys, facecolor=face, edgecolor=edge, linewidths=0.25, alpha=0.95))

        minx, miny, maxx, maxy = self._geometry_bounds()
        self._set_equal_aspect(ax, minx, maxx, miny, maxy)
        ax.view_init(elev=elev, azim=azim)
        ax.set_axis_off()
        fig.tight_layout(pad=0)
        fig.savefig(path, dpi=150, bbox_inches="tight", facecolor="white")
        plt.close(fig)

    def _set_equal_aspect(self, ax, minx, maxx, miny, maxy):
        maxz = self.wall_height
        rx, ry = maxx - minx, maxy - miny
        r = max(rx, ry, maxz, 1.0)
        cx, cy = (minx + maxx) / 2, (miny + maxy) / 2
        ax.set_xlim(cx - r / 2, cx + r / 2)
        ax.set_ylim(cy - r / 2, cy + r / 2)
        ax.set_zlim(0, r)
        try:
            ax.set_box_aspect((rx or 1, ry or 1, maxz or 1))
        except Exception:
            pass

    # ------------------------------------------------------------------
    def export_obj(self, path: str) -> str:
        """Modeli Wavefront OBJ olarak dışa aktarır (başka programlarda açılır)."""
        verts: List[Tuple[float, float, float]] = []
        faces: List[Tuple[int, int, int, int]] = []
        for box, _cat in self.boxes:
            base = len(verts)
            for v in box:
                verts.append(tuple(v))
            for f in _BOX_FACES:
                faces.append(tuple(base + i + 1 for i in f))  # OBJ 1-indexli
        with open(path, "w", encoding="utf-8") as fh:
            fh.write("# Mimari3D tarafindan uretildi\n")
            for v in verts:
                fh.write(f"v {v[0]:.4f} {v[1]:.4f} {v[2]:.4f}\n")
            for f in faces:
                fh.write("f " + " ".join(str(i) for i in f) + "\n")
        return path
