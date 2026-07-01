"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import {
  ensureRootFolder,
  findOrCreateSubfolder,
  uploadFile,
  deleteFile,
} from "@/lib/google-drive";

async function ensureProjectFolder(projectId: string) {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
  });
  if (project.driveFolderId) {
    return { id: project.driveFolderId, url: project.driveFolderUrl ?? undefined };
  }

  const root = await ensureRootFolder();
  const folder = await findOrCreateSubfolder(project.name, root.id);
  await prisma.project.update({
    where: { id: projectId },
    data: { driveFolderId: folder.id, driveFolderUrl: folder.url },
  });
  return folder;
}

const KindSchema = z.enum(["DIJITAL", "FIZIKSEL", "IKISI_DE"]);

export async function uploadDocument(
  projectId: string,
  projectServiceId: string | null,
  formData: FormData
) {
  const user = await requireUser();
  const kind = KindSchema.parse(formData.get("kind"));
  const physicalLocation =
    (formData.get("physicalLocation") as string | null) || null;
  const file = formData.get("file");

  let driveFileId: string | undefined;
  let driveFileUrl: string | undefined;
  let mimeType: string | undefined;
  let name = (formData.get("name") as string | null)?.trim() || "";

  if (kind !== "FIZIKSEL") {
    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Dijital evrak için dosya seçmelisiniz.");
    }
    const folder = await ensureProjectFolder(projectId);
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadFile({
      name: name || file.name,
      mimeType: file.type || "application/octet-stream",
      buffer,
      parentId: folder.id,
    });
    driveFileId = uploaded.id;
    driveFileUrl = uploaded.url;
    mimeType = file.type;
    if (!name) name = file.name;
  }

  if (!name) {
    throw new Error("Evrak adı gerekli.");
  }

  await prisma.document.create({
    data: {
      name,
      kind,
      driveFileId,
      driveFileUrl,
      mimeType,
      physicalLocation:
        kind === "DIJITAL" ? null : physicalLocation,
      projectId,
      projectServiceId,
      uploadedById: user.id,
    },
  });

  revalidatePath(`/projeler/${projectId}`);
}

export async function deleteDocument(projectId: string, documentId: string) {
  await requireUser();
  const document = await prisma.document.findUniqueOrThrow({
    where: { id: documentId },
  });

  if (document.driveFileId) {
    try {
      await deleteFile(document.driveFileId);
    } catch {
      // Drive'da bulunamadıysa veritabanı kaydını yine de temizle
    }
  }

  await prisma.document.delete({ where: { id: documentId } });
  revalidatePath(`/projeler/${projectId}`);
}
