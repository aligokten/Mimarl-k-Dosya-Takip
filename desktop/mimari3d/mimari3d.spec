# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller yapı betiği — tek dosyalık Windows .exe üretir.

Yapı:
    pyinstaller mimari3d.spec
Çıktı:
    dist/Mimari3D.exe
"""
from PyInstaller.utils.hooks import collect_submodules, collect_data_files

hiddenimports = []
hiddenimports += collect_submodules("ezdxf")
hiddenimports += collect_submodules("matplotlib")
hiddenimports += collect_submodules("reportlab")

datas = []
datas += collect_data_files("ezdxf")
datas += collect_data_files("matplotlib")

a = Analysis(
    ["app.py"],
    pathex=["."],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    runtime_hooks=[],
    excludes=["PyQt5", "PyQt6", "PySide2", "PySide6", "tornado", "pytest"],
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="Mimari3D",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,   # GUI uygulaması; konsol penceresi açma
    disable_windowed_traceback=False,
    icon=None,
)
