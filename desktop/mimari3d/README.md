# Mimari3D — DWG'den 3B Model ve A3 PDF Portföy Üretici

AutoCAD ile çizilmiş mimari ruhsat projelerini (`.dwg` / `.dxf`) inceleyip:

1. **3B model** üretir (duvarlar, kolonlar ve pencereler düşey yönde
   yükseltilerek) — hem PNG görünümler hem de başka programlarda açılabilen
   `.obj` model dosyası.
2. **A3 yatay PDF proje portföyü** oluşturur — kapak, proje bilgileri/
   istatistikler, 2B plan görünümleri ve 3B görünümlerden oluşan, her sayfada
   antet (başlık bloğu) bulunan bir dosya.

Windows'ta **tek dosyalık `.exe`** olarak çalıştırılabilir.

---

## Windows'ta .exe olarak kullanma

### Yol A — Hazır exe'yi indirme (derleme gerektirmez)
1. GitHub deposunda **Actions** sekmesine gidin.
2. **"Mimari3D Windows EXE"** iş akışını seçip **Run workflow** ile çalıştırın
   (ya da son çalışmayı açın).
3. İş bitince alttaki **Artifacts → `Mimari3D-Windows`** dosyasını indirin,
    zipten çıkarın ve `Mimari3D.exe`'yi çalıştırın.

### Yol B — Kendi bilgisayarınızda derleme
Python 3.10+ kurulu olmalı ([python.org](https://www.python.org/downloads/)).

```bat
cd desktop\mimari3d
build_windows.bat
```

Betik biter bitmez uygulama `dist\Mimari3D.exe` yolunda oluşur.

---

## Kullanım

Uygulamayı açın:
1. **Çizim dosyası**: `.dwg` veya `.dxf` dosyanızı seçin.
2. **Çıktı klasörü**: sonuçların yazılacağı klasör (otomatik önerilir).
3. **Duvar yüksekliği / kalınlığı**: 3B model için (varsayılan 3.0 m / 0.20 m).
4. **▶ Oluştur** düğmesine basın.

İşlem bitince:
- `..._portfoy.pdf` → A3 yatay proje portföyü
- `....obj` → 3B model (SketchUp, Blender, Windows 3D Viewer vb. açar)
- `..._ekler/` → plan ve 3B görünüm PNG'leri

### .dwg dosyaları hakkında
`.dwg` kapalı bir formattır. Program bunları otomatik okuyabilmek için
**ODA File Converter** (ücretsiz) kullanır:

- İndirin: <https://www.opendesign.com/guestfiles/oda_file_converter>
- Kurup programı yeniden başlatın.

Alternatif olarak çizimi AutoCAD'de **Farklı Kaydet → DXF** ile kaydedip
doğrudan `.dxf` yükleyebilirsiniz (ek araç gerekmez).

---

## Katman (layer) adlandırma

Elemanlar katman adlarındaki anahtar kelimelere göre tanınır:

| Eleman  | Aranan kelimeler                         |
|---------|------------------------------------------|
| Duvar   | `DUVAR`, `WALL`, `PERDE`, `MUR`          |
| Kapı    | `KAPI`, `DOOR`                           |
| Pencere | `PENCERE`, `WINDOW`, `CAM`               |
| Kolon   | `KOLON`, `COLUMN`                        |

Duvar katmanı bulunamazsa program tüm çizgileri (ölçü/yazı hariç) duvar kabul
ederek yine de bir model üretmeye çalışır. En iyi sonuç için duvarların ayrı
bir "DUVAR" katmanında olması önerilir.

Proje bilgileri (ada, parsel, mimar, ölçek…) antet bloğu attribute'larından ve
`ANAHTAR: değer` biçimindeki metinlerden otomatik toplanır.

---

## Komut satırı (isteğe bağlı)

```bash
python cli.py cizim.dxf -o cikti/ --height 3.0 --thickness 0.2 --name "Konut Projesi"
```

## Geliştirme / test

```bash
pip install -r requirements.txt
python make_sample.py                 # örnek plan DXF'i üretir
python cli.py samples/ornek_plan.dxf -o out_test
```

---

## Dosya yapısı

| Dosya              | Görev                                             |
|--------------------|---------------------------------------------------|
| `app.py`           | Masaüstü arayüz (Tkinter) — exe girişi            |
| `cli.py`           | Komut satırı arayüzü                              |
| `pipeline.py`      | Uçtan uca iş akışı                                |
| `dwg_reader.py`    | DWG/DXF okuma + mimari eleman çıkarımı            |
| `model3d.py`       | 3B kütle üretimi, görünüm render'ı, OBJ dışa aktarım |
| `plan_render.py`   | 2B plan PNG render'ı                              |
| `pdf_report.py`    | A3 yatay PDF portföy                              |
| `mimari3d.spec`    | PyInstaller yapı tanımı                           |
| `build_windows.bat`| Windows'ta tek tıkla exe derleme                 |
