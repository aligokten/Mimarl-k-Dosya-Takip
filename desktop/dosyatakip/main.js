// Ruhsat360 — Windows masaüstü kabuğu.
// Canlı uygulamayı (GitHub Pages) yükler: veriler zaten Firebase'de
// olduğundan uygulama internet gerektirir; bu sayede web'e gelen her
// güncelleme masaüstünde de otomatik geçerli olur.
const { app, BrowserWindow, shell } = require("electron");
const path = require("path");

const APP_URL = "https://aligokten.github.io/Mimarl-k-Dosya-Takip/";

// Google, gömülü tarayıcılarda OAuth girişini user agent'a bakarak
// engelleyebiliyor; UA'dan Electron izini kaldırmak standart çözüm.
function cleanUserAgent(wc) {
  wc.userAgent = wc.userAgent.replace(/\sElectron\/[\d.]+/i, "");
}

// Google giriş / Drive yetkilendirme popupları uygulama penceresi olarak
// açılmalı (postMessage ile ana pencereye dönerler); diğer dış bağlantılar
// (Drive dosya linkleri, mevzuat sayfaları) sistem tarayıcısına gider.
function isAuthPopup(url) {
  return (
    url.includes("accounts.google.com") ||
    url.includes("firebaseapp.com/__/auth") ||
    url.includes("google.com/gsi")
  );
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1380,
    height: 880,
    minWidth: 900,
    minHeight: 600,
    autoHideMenuBar: true,
    backgroundColor: "#212124",
    icon: path.join(__dirname, "icon.ico"),
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  cleanUserAgent(win.webContents);

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isAuthPopup(url)) {
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          autoHideMenuBar: true,
          webPreferences: { contextIsolation: true, nodeIntegration: false },
        },
      };
    }
    shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("did-create-window", (child) =>
    cleanUserAgent(child.webContents)
  );

  // İnternet yoksa yerel bilgi sayfası göster (kod -3 = iptal, yok say).
  win.webContents.on("did-fail-load", (_e, code, _desc, _url, isMainFrame) => {
    if (isMainFrame && code !== -3) {
      win.loadFile(path.join(__dirname, "offline.html"));
    }
  });

  win.loadURL(APP_URL);
  return win;
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => app.quit());
