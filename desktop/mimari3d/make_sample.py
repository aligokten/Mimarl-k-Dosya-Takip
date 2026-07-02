"""Test için örnek bir mimari plan DXF'i üretir (basit bir daire planı)."""
import sys
import ezdxf


def build(path: str = "samples/ornek_plan.dxf"):
    doc = ezdxf.new("R2010", setup=True)
    doc.header["$INSUNITS"] = 6  # metre
    doc.layers.add("DUVAR", color=7)
    doc.layers.add("KAPI", color=3)
    doc.layers.add("PENCERE", color=5)
    doc.layers.add("KOLON", color=1)
    doc.layers.add("YAZI", color=2)
    msp = doc.modelspace()

    # Dış duvarlar (12m x 9m)
    outer = [(0, 0), (12, 0), (12, 9), (0, 9), (0, 0)]
    for a, b in zip(outer, outer[1:]):
        msp.add_line(a, b, dxfattribs={"layer": "DUVAR"})

    # İç bölme duvarları
    partitions = [
        ((6, 0), (6, 5)),
        ((6, 5), (12, 5)),
        ((0, 5), (4, 5)),
    ]
    for a, b in partitions:
        msp.add_line(a, b, dxfattribs={"layer": "DUVAR"})

    # Pencereler (dış duvar üzerinde)
    windows = [((2, 0), (4, 0)), ((8, 0), (10, 0)), ((0, 2), (0, 4)), ((12, 6), (12, 8))]
    for a, b in windows:
        msp.add_line(a, b, dxfattribs={"layer": "PENCERE"})

    # Kapılar
    doors = [((4, 5), (5, 5)), ((6, 2), (6, 3))]
    for a, b in doors:
        msp.add_line(a, b, dxfattribs={"layer": "KAPI"})

    # Kolonlar (kısa parçalar)
    for cx, cy in [(6, 5), (0, 0), (12, 0), (12, 9), (0, 9)]:
        msp.add_line((cx - 0.15, cy), (cx + 0.15, cy), dxfattribs={"layer": "KOLON"})

    # Oda etiketleri ve proje bilgisi
    for txt, (px, py) in [("SALON", (2.5, 2)), ("MUTFAK", (9, 2)),
                          ("YATAK ODASI", (2.5, 7)), ("BANYO", (9, 7))]:
        msp.add_text(txt, dxfattribs={"layer": "YAZI", "height": 0.35}
                     ).set_placement((px, py))

    info_lines = [
        "PROJE: Ornek Konut Projesi",
        "ADA: 1234",
        "PARSEL: 56",
        "MIMAR: Ali Gokten",
        "OLCEK: 1/100",
    ]
    for i, line in enumerate(info_lines):
        msp.add_text(line, dxfattribs={"layer": "YAZI", "height": 0.3}
                     ).set_placement((0, 10 + i * 0.6))

    import os
    os.makedirs(os.path.dirname(path), exist_ok=True)
    doc.saveas(path)
    print("Örnek DXF üretildi:", path)
    return path


if __name__ == "__main__":
    build(sys.argv[1] if len(sys.argv) > 1 else "samples/ornek_plan.dxf")
