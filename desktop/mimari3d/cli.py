"""Komut satırı arayüzü (arayüzsüz/otomasyon için).

Kullanım:
    python cli.py cizim.dwg -o cikti/ --height 3.0 --thickness 0.2
"""
from __future__ import annotations

import argparse
import os
import sys

import pipeline


def main(argv=None):
    p = argparse.ArgumentParser(
        description="DWG/DXF mimari çizimi 3B modele ve A3 yatay PDF portföye çevirir.")
    p.add_argument("input", help="Girdi çizim dosyası (.dwg veya .dxf)")
    p.add_argument("-o", "--output", default="Mimari3D_Cikti",
                   help="Çıktı klasörü (varsayılan: ./Mimari3D_Cikti)")
    p.add_argument("--height", type=float, default=3.0,
                   help="Duvar yüksekliği (m), varsayılan 3.0")
    p.add_argument("--thickness", type=float, default=0.2,
                   help="Duvar kalınlığı (m), varsayılan 0.2")
    p.add_argument("--name", default=None, help="Proje adı")
    args = p.parse_args(argv)

    if not os.path.isfile(args.input):
        print(f"Hata: dosya bulunamadı: {args.input}", file=sys.stderr)
        return 2
    try:
        res = pipeline.run(args.input, args.output, wall_height=args.height,
                           wall_thickness=args.thickness, project_name=args.name)
    except Exception as exc:
        print(f"Hata: {exc}", file=sys.stderr)
        return 1
    print("\n=== Bitti ===")
    print("PDF   :", res.pdf_path)
    print("OBJ   :", res.obj_path or "(geometri yok)")
    print("Görsel:", len(res.view_images), "3B +", len(res.plan_images), "plan")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
