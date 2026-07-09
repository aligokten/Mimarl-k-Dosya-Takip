const { app, BrowserWindow, shell, session } = require("electron");

const PANEL_URL = "https://panel.ruhsat360.com/?source=desktop";

let mainWindow = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1100,
    minHeight: 720,
    title: "Ruhsat360",
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
    if (
      url.startsWith("https://accounts.google.com/") ||
      url.startsWith("https://oauth2.googleapis.com/") ||
      url.startsWith("https://www.googleapis.com/") ||
      url.startsWith("https://drive.google.com/") ||
      url.startsWith("https://panel.ruhsat360.com/") ||
      url.includes("google.com")
    ) {
      return { action: "allow" };
    }

    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (
      url.startsWith("https://panel.ruhsat360.com/") ||
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
