"""Mimari3D — Masaüstü arayüz (Windows/macOS/Linux).

DWG/DXF mimari çizimini 3B modele ve A3 yatay PDF portföye dönüştürür.
PyInstaller ile .exe olarak paketlenebilir.
"""
from __future__ import annotations

import os
import queue
import sys
import threading
import traceback
import webbrowser

import tkinter as tk
from tkinter import filedialog, messagebox, ttk

# PyInstaller ile paketlenince modüller aynı klasörde bulunur
try:
    import pipeline
except ImportError:  # pragma: no cover
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import pipeline

APP_TITLE = "Mimari3D — DWG'den 3B Model ve PDF Portföy"


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title(APP_TITLE)
        self.geometry("760x620")
        self.minsize(680, 560)
        self._log_queue: queue.Queue = queue.Queue()
        self._result = None
        self._build_ui()
        self.after(120, self._drain_log)

    # ------------------------------------------------------------------
    def _build_ui(self):
        pad = {"padx": 10, "pady": 6}
        header = tk.Frame(self, bg="#294b5a")
        header.pack(fill="x")
        tk.Label(header, text="Mimari3D", bg="#294b5a", fg="white",
                 font=("Segoe UI", 20, "bold")).pack(anchor="w", padx=16, pady=(12, 0))
        tk.Label(header, text="AutoCAD DWG/DXF → 3B model + A3 yatay PDF proje portföyü",
                 bg="#294b5a", fg="#cfe0e8", font=("Segoe UI", 10)).pack(
            anchor="w", padx=16, pady=(0, 12))

        frm = ttk.Frame(self)
        frm.pack(fill="x", **pad)

        # Girdi dosyası
        ttk.Label(frm, text="Çizim dosyası (.dwg / .dxf):").grid(
            row=0, column=0, sticky="w")
        self.in_var = tk.StringVar()
        ttk.Entry(frm, textvariable=self.in_var, width=60).grid(
            row=1, column=0, sticky="we", padx=(0, 6))
        ttk.Button(frm, text="Seç...", command=self._pick_input).grid(row=1, column=1)

        # Çıktı klasörü
        ttk.Label(frm, text="Çıktı klasörü:").grid(row=2, column=0, sticky="w", pady=(8, 0))
        self.out_var = tk.StringVar()
        ttk.Entry(frm, textvariable=self.out_var, width=60).grid(
            row=3, column=0, sticky="we", padx=(0, 6))
        ttk.Button(frm, text="Seç...", command=self._pick_output).grid(row=3, column=1)

        frm.columnconfigure(0, weight=1)

        # Parametreler
        opts = ttk.LabelFrame(self, text="Model Ayarları")
        opts.pack(fill="x", **pad)
        ttk.Label(opts, text="Duvar yüksekliği (m):").grid(
            row=0, column=0, sticky="w", padx=8, pady=6)
        self.height_var = tk.StringVar(value="3.0")
        ttk.Entry(opts, textvariable=self.height_var, width=8).grid(row=0, column=1, sticky="w")
        ttk.Label(opts, text="Duvar kalınlığı (m):").grid(
            row=0, column=2, sticky="w", padx=8)
        self.thick_var = tk.StringVar(value="0.2")
        ttk.Entry(opts, textvariable=self.thick_var, width=8).grid(row=0, column=3, sticky="w")
        ttk.Label(opts, text="Proje adı:").grid(row=1, column=0, sticky="w", padx=8, pady=6)
        self.name_var = tk.StringVar()
        ttk.Entry(opts, textvariable=self.name_var, width=40).grid(
            row=1, column=1, columnspan=3, sticky="we", padx=(0, 8))

        # Çalıştır butonu
        btns = ttk.Frame(self)
        btns.pack(fill="x", **pad)
        self.run_btn = ttk.Button(btns, text="▶  Oluştur", command=self._start)
        self.run_btn.pack(side="left")
        self.open_btn = ttk.Button(btns, text="📄  PDF'i Aç", command=self._open_pdf,
                                   state="disabled")
        self.open_btn.pack(side="left", padx=6)
        self.folder_btn = ttk.Button(btns, text="📁  Klasörü Aç",
                                     command=self._open_folder, state="disabled")
        self.folder_btn.pack(side="left")

        self.progress = ttk.Progressbar(self, mode="indeterminate")
        self.progress.pack(fill="x", padx=10)

        # Günlük (log)
        logf = ttk.LabelFrame(self, text="İşlem Günlüğü")
        logf.pack(fill="both", expand=True, **pad)
        self.log_txt = tk.Text(logf, height=12, wrap="word", state="disabled",
                               bg="#1e1e1e", fg="#d4d4d4", font=("Consolas", 9))
        self.log_txt.pack(fill="both", expand=True, padx=6, pady=6)

    # ------------------------------------------------------------------
    def _pick_input(self):
        path = filedialog.askopenfilename(
            title="Çizim dosyası seçin",
            filetypes=[("AutoCAD çizimleri", "*.dwg *.dxf"), ("Tüm dosyalar", "*.*")])
        if path:
            self.in_var.set(path)
            if not self.out_var.get():
                self.out_var.set(os.path.join(os.path.dirname(path), "Mimari3D_Cikti"))
            if not self.name_var.get():
                self.name_var.set(os.path.splitext(os.path.basename(path))[0])

    def _pick_output(self):
        path = filedialog.askdirectory(title="Çıktı klasörü seçin")
        if path:
            self.out_var.set(path)

    # ------------------------------------------------------------------
    def _log(self, msg: str):
        self._log_queue.put(msg)

    def _drain_log(self):
        try:
            while True:
                msg = self._log_queue.get_nowait()
                self.log_txt.configure(state="normal")
                self.log_txt.insert("end", msg + "\n")
                self.log_txt.see("end")
                self.log_txt.configure(state="disabled")
        except queue.Empty:
            pass
        self.after(120, self._drain_log)

    # ------------------------------------------------------------------
    def _start(self):
        inp = self.in_var.get().strip()
        out = self.out_var.get().strip()
        if not inp or not os.path.isfile(inp):
            messagebox.showerror("Hata", "Lütfen geçerli bir .dwg/.dxf dosyası seçin.")
            return
        if not out:
            out = os.path.join(os.path.dirname(inp), "Mimari3D_Cikti")
            self.out_var.set(out)
        try:
            height = float(self.height_var.get().replace(",", "."))
            thick = float(self.thick_var.get().replace(",", "."))
        except ValueError:
            messagebox.showerror("Hata", "Yükseklik ve kalınlık sayısal olmalı.")
            return

        self.run_btn.configure(state="disabled")
        self.open_btn.configure(state="disabled")
        self.folder_btn.configure(state="disabled")
        self.progress.start(12)
        self._result = None

        t = threading.Thread(target=self._worker,
                             args=(inp, out, height, thick, self.name_var.get().strip()),
                             daemon=True)
        t.start()

    def _worker(self, inp, out, height, thick, name):
        try:
            result = pipeline.run(inp, out, wall_height=height,
                                  wall_thickness=thick,
                                  project_name=name or None, log=self._log)
            self._result = result
            self.after(0, self._on_success)
        except Exception as exc:
            tb = traceback.format_exc()
            self._log("HATA: " + str(exc))
            self.after(0, lambda: self._on_error(str(exc), tb))

    def _on_success(self):
        self.progress.stop()
        self.run_btn.configure(state="normal")
        self.open_btn.configure(state="normal")
        self.folder_btn.configure(state="normal")
        messagebox.showinfo(
            "Tamamlandı",
            "Proje portföyü başarıyla oluşturuldu.\n\n"
            f"PDF: {os.path.basename(self._result.pdf_path)}\n"
            f"3B model (OBJ): "
            f"{os.path.basename(self._result.obj_path) if self._result.obj_path else '—'}")

    def _on_error(self, msg, tb):
        self.progress.stop()
        self.run_btn.configure(state="normal")
        messagebox.showerror("İşlem başarısız", msg)

    # ------------------------------------------------------------------
    def _open_pdf(self):
        if self._result and os.path.isfile(self._result.pdf_path):
            _open_path(self._result.pdf_path)

    def _open_folder(self):
        if self._result:
            _open_path(os.path.dirname(self._result.pdf_path))


def _open_path(path: str):
    try:
        if sys.platform.startswith("win"):
            os.startfile(path)  # type: ignore[attr-defined]
        elif sys.platform == "darwin":
            os.system(f'open "{path}"')
        else:
            webbrowser.open("file://" + os.path.abspath(path))
    except Exception:
        webbrowser.open("file://" + os.path.abspath(path))


def main():
    app = App()
    app.mainloop()


if __name__ == "__main__":
    main()
