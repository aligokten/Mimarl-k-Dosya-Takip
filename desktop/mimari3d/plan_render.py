"""2B plan görüntüsü üretimi.

ezdxf'in matplotlib arka ucu ile model uzayını (ve varsa paftaları) yüksek
çözünürlüklü PNG'ye çevirir. Bu görüntüler PDF portföyünde kullanılır.
"""
from __future__ import annotations

import os
from typing import List

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from ezdxf.addons.drawing import RenderContext, Frontend
from ezdxf.addons.drawing.matplotlib import MatplotlibBackend

try:
    from ezdxf.addons.drawing.config import Configuration
except Exception:  # sürüm farkları için
    Configuration = None

from dwg_reader import DrawingData


def render_plan(data: DrawingData, out_dir: str, prefix: str = "plan") -> List[str]:
    """Model uzayını ve varsa paftaları PNG olarak render eder."""
    os.makedirs(out_dir, exist_ok=True)
    doc = data.doc
    paths: List[str] = []

    # Model uzayı
    msp_path = os.path.join(out_dir, f"{prefix}_model.png")
    if _render_layout(doc, doc.modelspace(), msp_path):
        paths.append(msp_path)

    # Pafta (paper space) düzenleri
    try:
        for i, layout in enumerate(doc.layouts):
            if layout.name.lower() in ("model",):
                continue
            if len(layout) == 0:
                continue
            p = os.path.join(out_dir, f"{prefix}_pafta_{i}.png")
            if _render_layout(doc, layout, p):
                paths.append(p)
    except Exception:
        pass

    return paths


def _render_layout(doc, layout, path: str) -> bool:
    try:
        fig = plt.figure(figsize=(16.54, 11.69), dpi=150)  # A3 oranı
        ax = fig.add_axes([0, 0, 1, 1])
        ax.set_facecolor("white")
        ctx = RenderContext(doc)
        backend = MatplotlibBackend(ax)
        frontend = Frontend(ctx, backend, config=Configuration()) if Configuration else Frontend(ctx, backend)
        frontend.draw_layout(layout, finalize=True)
        ax.set_axis_off()
        fig.savefig(path, dpi=150, facecolor="white", bbox_inches="tight")
        plt.close(fig)
        return True
    except Exception:
        plt.close("all")
        return False
