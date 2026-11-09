const { app, BrowserWindow, shell, session } = require("electron");
const path = require("path");

const PANEL_HOST = "panel.ruhsat360.com";
const PANEL_URL = `https://${PANEL_HOST}/?source=desktop`;
const ICON_PATH = path.join(__dirname, "icon.ico");

// Panel yalnızca https üzerinden açılmalı. Sayfa http'ten açılırsa sayfanın
// origin'i "http://panel.ruhsat360.com" olur; Google OAuth localhost dışında
// http origin kabul etmediği için Drive bağlantısı "Hata 400:
// origin_mismatch" ile reddedilir. Aşağıdaki üç nokta (gezinme, yeni pencere
// ve ağ katmanı) panelin http'e düşmesini engeller.
function httpsZorla(url) {
  try {
    const u = new URL(url);
    if (u.hostname === PANEL_HOST && u.protocol === "http:") {
      u.protocol = "https:";
      return u.toString();
    }
  } catch (e) {
    // URL çözümlenemezse olduğu gibi bırak.
  }
  return url;
}

let mainWindow = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1100,
    minHeight: 720,
    title: "Ruhsat360",
    icon: ICON_PATH,
    autoHideMenuBar: true,
    backgroundColor: "#111217",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  });

  mainWindow.webContents.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
  );

  mainWindow.loadURL(PANEL_URL);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const hedef = httpsZorla(url);
    if (
      hedef.startsWith("https://accounts.google.com/") ||
      hedef.startsWith("https://oauth2.googleapis.com/") ||
      hedef.startsWith("https://www.googleapis.com/") ||
      hedef.startsWith("https://drive.google.com/") ||
      hedef.startsWith(`https://${PANEL_HOST}/`) ||
      hedef.includes("google.com")
    ) {
      return { action: "allow" };
    }

    shell.openExternal(hedef);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    // Panele http ile gidilmeye çalışılırsa engelleyip https'e taşı.
    const hedef = httpsZorla(url);
    if (hedef !== url) {
      event.preventDefault();
      mainWindow.loadURL(hedef);
      return;
    }

    if (
      url.startsWith(`https://${PANEL_HOST}/`) ||
      url.startsWith("https://accounts.google.com/") ||
      url.includes("google.com")
    ) {
      return;
    }

    event.preventDefault();
    shell.openExternal(url);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ["notifications"];
    callback(allowedPermissions.includes(permission));
  });

  // Son güvenlik ağı: panele giden her http isteği, kaynağı ne olursa olsun
  // (yönlendirme, eski önbellek, elle girilen adres) ağ katmanında https'e
  // çevrilir.
  session.defaultSession.webRequest.onBeforeRequest(
    { urls: [`http://${PANEL_HOST}/*`] },
    (details, callback) => {
      const hedef = httpsZorla(details.url);
      if (hedef !== details.url) {
        callback({ redirectURL: hedef });
        return;
      }
      callback({});
    }
  );

  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
