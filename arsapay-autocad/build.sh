#!/usr/bin/env bash
# ArsaPay AutoCAD eklentisini derler ve dağıtım dosyalarını dist/ altına üretir:
#   dist/ArsaPay.bundle/                      Autoloader paketi
#   dist/ArsaPay_AutoCAD_Kurulum_v1.0.0.exe   Windows kurulum dosyası (NSIS)
#   dist/ArsaPay_AutoCAD_v1.0.0.zip           Elle kurulum için paket
# Gereksinimler: .NET 8 SDK, makensis (NSIS), zip.
set -euo pipefail
cd "$(dirname "$0")"

VER=1.0.0
DIST=dist
BUNDLE=$DIST/ArsaPay.bundle

rm -rf "$DIST"
dotnet build ribbon/ArsaPayRibbon.csproj -c Release --nologo -v q

mkdir -p "$BUNDLE/Contents/Win64/R24" "$BUNDLE/Contents/Win64/R25"
cp bundle/PackageContents.xml "$BUNDLE/"
cp bundle/OKUBENI.txt lisp/SAGG_ARSAPAY.lsp "$BUNDLE/Contents/"
cp ribbon/bin/Release/net48/ArsaPayRibbon.dll "$BUNDLE/Contents/Win64/R24/"
cp ribbon/bin/Release/net8.0-windows/ArsaPayRibbon.dll "$BUNDLE/Contents/Win64/R25/"

makensis -V2 -DSTAGE="$PWD/$BUNDLE" -DOUTFILE="$PWD/$DIST/ArsaPay_AutoCAD_Kurulum_v$VER.exe" installer/ArsaPay.nsi

(cd "$DIST" && zip -qr "ArsaPay_AutoCAD_v$VER.zip" ArsaPay.bundle)

echo "Hazır:"
ls -la "$DIST"
