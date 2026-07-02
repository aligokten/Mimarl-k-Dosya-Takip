// Google Drive entegrasyonu (tarayıcıdan, sunucusuz).
// Google Identity Services (GIS) token client ile drive.file kapsamında
// erişim alınır: uygulama yalnızca kendi oluşturduğu dosya ve klasörleri
// görebilir/yönetebilir.
import { useSyncExternalStore } from "react";

const CLIENT_ID_KEY = "mimarlik-drive-client-id";
const CONNECTED_KEY = "mimarlik-drive-connected";
const EMAIL_KEY = "mimarlik-drive-email";
const ROOT_FOLDER_KEY = "mimarlik-drive-root-folder-id";

const ROOT_FOLDER_NAME = "Mimarlık Ofisi Dosya Takip";
const SCOPES =
  "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email";

// ---- Durum yönetimi (React'e yansıtılır) ----

export interface DriveState {
  configured: boolean;
  connected: boolean;
  email?: string;
  busy: boolean;
  error?: string;
}

let state: DriveState = {
  configured: !!localStorage.getItem(CLIENT_ID_KEY),
  connected: localStorage.getItem(CONNECTED_KEY) === "1",
  email: localStorage.getItem(EMAIL_KEY) ?? undefined,
  busy: false,
};

const listeners = new Set<() => void>();

function setState(patch: Partial<DriveState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function useDrive(): DriveState {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    () => state
  );
}

export function getClientId(): string {
  return localStorage.getItem(CLIENT_ID_KEY) ?? "";
}

export function setClientId(clientId: string) {
  const trimmed = clientId.trim();
  if (trimmed) {
    localStorage.setItem(CLIENT_ID_KEY, trimmed);
    // Google betiğini şimdiden yükle: "Bağlan"a tıklandığında popup,
    // kullanıcı dokunuşuyla aynı anda açılabilsin (Safari engellemesin).
    void loadGis().catch(() => {});
  } else {
    localStorage.removeItem(CLIENT_ID_KEY);
  }
  setState({ configured: !!trimmed });
}

// ---- Google Identity Services yükleme ve token yönetimi ----

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any;
  }
}

let gisPromise: Promise<void> | null = null;

function loadGis(): Promise<void> {
  if (!gisPromise) {
    gisPromise = new Promise((resolve, reject) => {
      if (window.google?.accounts?.oauth2) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        gisPromise = null;
        reject(new Error("Google servisi yüklenemedi. İnternet bağlantınızı kontrol edin."));
      };
      document.head.appendChild(script);
    });
  }
  return gisPromise;
}

let accessToken: string | null = null;
let tokenExpiry = 0;

async function requestToken(): Promise<string> {
  const clientId = getClientId();
  if (!clientId) {
    throw new Error(
      "Google Client ID tanımlı değil. Ayarlar > Google Drive bölümünden girin."
    );
  }
  await loadGis();
  return new Promise<string>((resolve, reject) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (resp: any) => {
        if (resp.error) {
          reject(new Error(`Yetkilendirme hatası: ${resp.error}`));
          return;
        }
        accessToken = resp.access_token as string;
        const expiresIn = Number(resp.expires_in ?? 3600);
        tokenExpiry = Date.now() + expiresIn * 1000 - 60_000;
        resolve(accessToken);
      },
      error_callback: (err: any) => {
        let message: string;
        if (err?.type === "popup_closed") {
          message = "Yetkilendirme penceresi kapatıldı.";
        } else if (
          err?.type === "popup_failed_to_open" ||
          /popup/i.test(err?.message ?? "")
        ) {
          message =
            "Tarayıcı, Google giriş penceresini engelledi. iPhone/iPad'de: Ayarlar > Safari > 'Açılır Pencereleri Engelle' seçeneğini kapatın (veya adres çubuğundaki 'aA' > Web Sitesi Ayarları > Açılır Pencereler > İzin Ver). Sonra tekrar deneyin.";
        } else {
          message = `Yetkilendirme başarısız: ${err?.message ?? err?.type ?? "bilinmeyen hata"}`;
        }
        reject(new Error(message));
      },
    });
    tokenClient.requestAccessToken({ prompt: "" });
  });
}

async function getToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;
  return requestToken();
}

// ---- Drive REST yardımcıları ----

async function driveFetch(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = await getToken();
  const resp = await fetch(input, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  if (!resp.ok) {
    let detail = `${resp.status}`;
    try {
      const body = await resp.json();
      detail = body?.error?.message ?? detail;
    } catch {
      // gövde okunamadı
    }
    throw new Error(`Google Drive hatası: ${detail}`);
  }
  return resp;
}

async function findFiles(query: string): Promise<
  { id: string; name: string; webViewLink?: string }[]
> {
  const params = new URLSearchParams({
    q: query,
    fields: "files(id,name,webViewLink)",
    pageSize: "10",
  });
  const resp = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`
  );
  const data = await resp.json();
  return data.files ?? [];
}

async function createFolder(
  name: string,
  parentId?: string
): Promise<{ id: string; webViewLink?: string }> {
  const resp = await driveFetch(
    "https://www.googleapis.com/drive/v3/files?fields=id,webViewLink",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: parentId ? [parentId] : undefined,
      }),
    }
  );
  return resp.json();
}

function escapeQuery(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function ensureRootFolder(): Promise<string> {
  const cached = localStorage.getItem(ROOT_FOLDER_KEY);
  if (cached) return cached;
  const existing = await findFiles(
    `name = '${escapeQuery(ROOT_FOLDER_NAME)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const folder = existing[0] ?? (await createFolder(ROOT_FOLDER_NAME));
  localStorage.setItem(ROOT_FOLDER_KEY, folder.id);
  return folder.id;
}

async function ensureSubfolder(name: string): Promise<string> {
  const rootId = await ensureRootFolder();
  const existing = await findFiles(
    `name = '${escapeQuery(name)}' and '${rootId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  if (existing[0]) return existing[0].id;
  const folder = await createFolder(name, rootId);
  return folder.id;
}

// ---- Genel API: bağlanma / kopma ----

async function fetchEmail(): Promise<string | undefined> {
  try {
    const resp = await driveFetch(
      "https://www.googleapis.com/oauth2/v3/userinfo"
    );
    const data = await resp.json();
    return data.email as string | undefined;
  } catch {
    return undefined;
  }
}

export async function connectDrive(): Promise<void> {
  setState({ busy: true, error: undefined });
  try {
    await requestToken();
    const email = await fetchEmail();
    localStorage.setItem(CONNECTED_KEY, "1");
    if (email) localStorage.setItem(EMAIL_KEY, email);
    setState({ connected: true, email, busy: false });
    await ensureRootFolder();
  } catch (e) {
    setState({ busy: false, error: e instanceof Error ? e.message : String(e) });
    throw e;
  }
}

export function disconnectDrive() {
  accessToken = null;
  tokenExpiry = 0;
  localStorage.removeItem(CONNECTED_KEY);
  localStorage.removeItem(EMAIL_KEY);
  localStorage.removeItem(ROOT_FOLDER_KEY);
  setState({ connected: false, email: undefined, error: undefined });
}

// ---- Dosya yükleme (resumable — büyük dosyalar dahil) ----

export async function uploadToDrive(
  file: File,
  folderName: string
): Promise<{ id: string; url?: string }> {
  const folderId = await ensureSubfolder(folderName);

  const initResp = await driveFetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,webViewLink",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": file.type || "application/octet-stream",
      },
      body: JSON.stringify({ name: file.name, parents: [folderId] }),
    }
  );
  const sessionUrl = initResp.headers.get("Location");
  if (!sessionUrl) {
    throw new Error("Google Drive yükleme oturumu açılamadı.");
  }

  const uploadResp = await fetch(sessionUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!uploadResp.ok) {
    throw new Error(`Dosya yüklenemedi (HTTP ${uploadResp.status}).`);
  }
  const data = await uploadResp.json();
  return { id: data.id as string, url: data.webViewLink as string | undefined };
}


// Client ID tanımlıysa Google betiğini uygulama açılışında yükle:
// böylece "Drive'a Bağlan" tıklamasında popup gecikmeden (ve Safari
// tarafından engellenmeden) açılır.
if (state.configured) {
  void loadGis().catch(() => {});
}
