@echo off
REM ============================================================
REM  Mimari3D - Windows EXE olusturma betigi
REM  Gereksinim: Python 3.10+ kurulu olmali (python.org)
REM ============================================================
setlocal

echo [1/4] Sanal ortam hazirlaniyor...
python -m venv .venv
call .venv\Scripts\activate.bat

echo [2/4] Bagimliliklar yukleniyor...
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

echo [3/4] EXE derleniyor (PyInstaller)...
pyinstaller --noconfirm mimari3d.spec

echo [4/4] Tamamlandi.
echo   Uygulama: dist\Mimari3D.exe
echo.
echo NOT: .dwg dosyalari icin ODA File Converter (ucretsiz) kurulmalidir:
echo   https://www.opendesign.com/guestfiles/oda_file_converter
echo .dxf dosyalari icin ek bir araca gerek yoktur.
pause
