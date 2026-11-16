; ArsaPay AutoCAD eklentisi - Windows kurulum dosyası (NSIS)
; Yönetici izni gerektirmez: paket kullanıcının
; %APPDATA%\Autodesk\ApplicationPlugins klasörüne kurulur ve AutoCAD
; Autoloader mekanizmasıyla her açılışta otomatik yüklenir.
;
; Derleme: ../build.sh  (veya: makensis -DSTAGE=<ArsaPay.bundle yolu> ArsaPay.nsi)

Unicode true
!include "MUI2.nsh"

!ifndef STAGE
  !define STAGE "..\dist\ArsaPay.bundle"
!endif
!ifndef OUTFILE
  !define OUTFILE "..\dist\ArsaPay_AutoCAD_Kurulum_v1.0.0.exe"
!endif

!define APPNAME "ArsaPay"
!define APPVER "1.0.0"
!define UNINSTKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\SAGG_ArsaPay_AutoCAD"

Name "${APPNAME} ${APPVER} - AutoCAD Eklentisi"
OutFile "${OUTFILE}"
RequestExecutionLevel user
InstallDir "$APPDATA\Autodesk\ApplicationPlugins\ArsaPay.bundle"
SetCompressor /SOLID lzma
BrandingText "ArsaPay v1.0 - SAGG"

VIProductVersion "1.0.0.0"
VIAddVersionKey /LANG=1055 "ProductName" "ArsaPay AutoCAD Eklentisi"
VIAddVersionKey /LANG=1055 "CompanyName" "SAGG"
VIAddVersionKey /LANG=1055 "FileDescription" "ArsaPay AutoCAD eklentisi kurulumu"
VIAddVersionKey /LANG=1055 "FileVersion" "${APPVER}"
VIAddVersionKey /LANG=1055 "LegalCopyright" "ArsaPay v1.0 SAGG markasina aittir. Tum haklari saklidir. 2026."

!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "ArsaPay AutoCAD Eklentisi"
!define MUI_WELCOMEPAGE_TEXT "Bu sihirbaz ArsaPay v${APPVER} eklentisini AutoCAD'e kuracak.$\r$\n$\r$\nKurulumdan sonra AutoCAD şeridinde ARSAPAY sekmesi görünür (eşit alanlı parsel bölme).$\r$\n$\r$\nDevam etmeden önce açık AutoCAD pencerelerini kapatmanız önerilir.$\r$\n$\r$\nGereksinim: AutoCAD 2021 veya üstü (64 bit)."
!define MUI_FINISHPAGE_TITLE "Kurulum tamamlandı"
!define MUI_FINISHPAGE_TEXT "AutoCAD'i yeniden başlatın; şeritte ARSAPAY sekmesi görünecek.$\r$\n$\r$\nSekme görünmezse komut satırına ARSAPAYSERIT yazın. Güvenlik uyarısı çıkarsa 'Her zaman yükle'yi seçin."
!define MUI_FINISHPAGE_SHOWREADME "$INSTDIR\Contents\OKUBENI.txt"
!define MUI_FINISHPAGE_SHOWREADME_TEXT "Kullanım notlarını göster"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Turkish"

Section "ArsaPay" SecMain
  ; Eski sürümün dosyalarını temizle (ayarlar yok, güvenle silinebilir)
  RMDir /r "$INSTDIR"
  SetOutPath "$INSTDIR"
  File /r "${STAGE}\*.*"

  WriteUninstaller "$INSTDIR\Kaldir.exe"
  WriteRegStr HKCU "${UNINSTKEY}" "DisplayName" "ArsaPay AutoCAD Eklentisi"
  WriteRegStr HKCU "${UNINSTKEY}" "DisplayVersion" "${APPVER}"
  WriteRegStr HKCU "${UNINSTKEY}" "Publisher" "SAGG"
  WriteRegStr HKCU "${UNINSTKEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINSTKEY}" "UninstallString" '"$INSTDIR\Kaldir.exe"'
  WriteRegDWORD HKCU "${UNINSTKEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINSTKEY}" "NoRepair" 1
SectionEnd

Section "Uninstall"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "${UNINSTKEY}"
SectionEnd
