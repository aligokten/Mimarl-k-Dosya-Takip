"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import {
  ensureRootFolder,
  findOrCreateSubfolder,
  uploadFile,
} from "@/lib/google-drive";

const LandOwnerSchema = z.object({
  name: z.string().min(2, "Ad Soyad gerekli"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  tcNo: z.string().optional(),
  powerOfAttorneyNo: z.string().optional(),
  powerOfAttorneyDate: z.string().optional(),
  notaryName: z.string().optional(),
  notes: z.string().optional(),
});

function parseLandOwnerForm(formData: FormData) {
  const parsed = LandOwnerSchema.parse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    address: formData.get("address") || undefined,
    tcNo: formData.get("tcNo") || undefined,
    powerOfAttorneyNo: formData.get("powerOfAttorneyNo") || undefined,
    powerOfAttorneyDate: formData.get("powerOfAttorneyDate") || undefined,
    notaryName: formData.get("notaryName") || undefined,
    notes: formData.get("notes") || undefined,
  });

  return {
    ...parsed,
    powerOfAttorneyDate: parsed.powerOfAttorneyDate
      ? new Date(parsed.powerOfAttorneyDate)
      : undefined,
  };
}

export async function createLandOwner(formData: FormData) {
  await requireUser();
  const data = parseLandOwnerForm(formData);
  const landOwner = await prisma.landOwner.create({ data });
  revalidatePath("/arsa-sahipleri");
  redirect(`/arsa-sahipleri/${landOwner.id}`);
}

export async function updateLandOwner(landOwnerId: string, formData: FormData) {
  await requireUser();
  const data = parseLandOwnerForm(formData);
  await prisma.landOwner.update({ where: { id: landOwnerId }, data });
  revalidatePath("/arsa-sahipleri");
  revalidatePath(`/arsa-sahipleri/${landOwnerId}`);
}

export async function deleteLandOwner(landOwnerId: string) {
  await requireUser();
  await prisma.landOwner.delete({ where: { id: landOwnerId } });
  revalidatePath("/arsa-sahipleri");
  redirect("/arsa-sahipleri");
}

export async function uploadPowerOfAttorney(
  landOwnerId: string,
  formData: FormData
) {
  await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Dosya seçmelisiniz.");
  }

  const landOwner = await prisma.landOwner.findUniqueOrThrow({
    where: { id: landOwnerId },
  });

  const root = await ensureRootFolder();
  const folder = await findOrCreateSubfolder("Vekaletnameler", root.id);
  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadFile({
    name: `${landOwner.name} - Vekaletname${getExtension(file.name)}`,
    mimeType: file.type || "application/octet-stream",
    buffer,
    parentId: folder.id,
  });

  await prisma.landOwner.update({
    where: { id: landOwnerId },
    data: {
      powerOfAttorneyDriveFileId: uploaded.id,
      powerOfAttorneyDriveUrl: uploaded.url,
    },
  });

  revalidatePath(`/arsa-sahipleri/${landOwnerId}`);
}

function getExtension(fileName: string) {
  const idx = fileName.lastIndexOf(".");
  return idx === -1 ? "" : fileName.slice(idx);
}
