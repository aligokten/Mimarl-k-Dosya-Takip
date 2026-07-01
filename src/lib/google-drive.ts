import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email",
];
const ROOT_FOLDER_NAME = "Mimarlık Ofisi Dosya Takip";

function getRedirectUri() {
  return (
    process.env.GOOGLE_REDIRECT_URI ??
    "http://localhost:3000/api/drive/callback"
  );
}

export function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET tanımlı değil. .env dosyasını kontrol edin."
    );
  }
  return new google.auth.OAuth2(clientId, clientSecret, getRedirectUri());
}

export function getAuthUrl() {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
}

export async function exchangeCodeForTokens(code: string) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

export async function getAccountEmail(accessToken: string) {
  const client = getOAuthClient();
  client.setCredentials({ access_token: accessToken });
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const info = await oauth2.userinfo.get();
  return info.data.email ?? "bilinmiyor";
}

export async function getActiveConnection() {
  return prisma.googleDriveConnection.findFirst();
}

async function getAuthorizedClient() {
  const connection = await getActiveConnection();
  if (!connection) {
    throw new Error(
      "Google Drive bağlantısı kurulmamış. Ayarlar sayfasından bağlanın."
    );
  }

  const client = getOAuthClient();
  client.setCredentials({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken,
    expiry_date: connection.expiryDate?.getTime(),
  });

  client.on("tokens", async (tokens) => {
    await prisma.googleDriveConnection.update({
      where: { id: connection.id },
      data: {
        accessToken: tokens.access_token ?? connection.accessToken,
        refreshToken: tokens.refresh_token ?? connection.refreshToken,
        expiryDate: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : connection.expiryDate,
      },
    });
  });

  return client;
}

async function getDriveClient() {
  const auth = await getAuthorizedClient();
  return google.drive({ version: "v3", auth });
}

export async function ensureRootFolder() {
  const connection = await getActiveConnection();
  if (!connection) {
    throw new Error("Google Drive bağlantısı kurulmamış.");
  }
  if (connection.rootFolderId) {
    return {
      id: connection.rootFolderId,
      url: connection.rootFolderUrl ?? undefined,
    };
  }

  const folder = await createFolder(ROOT_FOLDER_NAME, null);
  await prisma.googleDriveConnection.update({
    where: { id: connection.id },
    data: { rootFolderId: folder.id, rootFolderUrl: folder.url },
  });
  return folder;
}

export async function createFolder(name: string, parentId: string | null) {
  const drive = await getDriveClient();
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : undefined,
    },
    fields: "id, webViewLink",
  });
  return {
    id: res.data.id as string,
    url: res.data.webViewLink ?? undefined,
  };
}

export async function findOrCreateSubfolder(
  name: string,
  parentId: string
) {
  const drive = await getDriveClient();
  const safeName = name.replace(/'/g, "\\'");
  const search = await drive.files.list({
    q: `'${parentId}' in parents and name = '${safeName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id, webViewLink)",
  });
  const existing = search.data.files?.[0];
  if (existing) {
    return { id: existing.id as string, url: existing.webViewLink ?? undefined };
  }
  return createFolder(name, parentId);
}

export async function uploadFile({
  name,
  mimeType,
  buffer,
  parentId,
}: {
  name: string;
  mimeType: string;
  buffer: Buffer;
  parentId: string;
}) {
  const drive = await getDriveClient();
  const { Readable } = await import("node:stream");
  const res = await drive.files.create({
    requestBody: {
      name,
      parents: [parentId],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: "id, webViewLink, webContentLink",
  });
  return {
    id: res.data.id as string,
    url: res.data.webViewLink ?? res.data.webContentLink ?? undefined,
  };
}

export async function deleteFile(fileId: string) {
  const drive = await getDriveClient();
  await drive.files.delete({ fileId });
}

export async function disconnectDrive() {
  await prisma.googleDriveConnection.deleteMany();
}
