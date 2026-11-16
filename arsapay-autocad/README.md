# ArsaPay — AutoCAD eklentisi

Eşit alanlı parsel bölme. `SAGG_ARSA_PAYLASTIR_V5.lsp` (bkz. `lisp/arsiv/`) tabanlı V6 çekirdek + AutoCAD şeridinde **ARSAPAY** sekmesi.

| Klasör | İçerik |
|---|---|
| `lisp/SAGG_ARSAPAY.lsp` | Komutlar: `ARSAPAY`, `ARSAPAYREF`, `ARSAPAYWEB`, `ARSAPAYBILGI` (`ARSAPAY5` eski ad) |
| `ribbon/` | Şerit sekmesini çalışma anında ekleyen .NET eklentisi (`net48` → AutoCAD 2021-2024, `net8.0-windows` → 2025+), `ARSAPAYSERIT` komutu |
| `bundle/` | Autoloader `PackageContents.xml` ve kullanıcı notları |
| `installer/` | NSIS kurulum betiği (yönetici izni gerekmez, `%APPDATA%\Autodesk\ApplicationPlugins`) |

Derleme (Linux/Windows): `./build.sh` → `dist/ArsaPay_AutoCAD_Kurulum_v1.0.0.exe` ve `dist/ArsaPay_AutoCAD_v1.0.0.zip`.
Gereksinimler: .NET 8 SDK, NSIS (`makensis`), `zip`.

Algoritma, Ruhsat360 web modülü (`webapp/src/arsapay/ArsaPaylastir.tsx`) ile aynıdır; değişiklik yaparken ikisini birlikte güncelleyin.
