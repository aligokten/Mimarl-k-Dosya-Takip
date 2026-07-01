"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-user";
import { disconnectDrive } from "@/lib/google-drive";

export async function disconnectDriveAction() {
  await requireAdmin();
  await disconnectDrive();
  revalidatePath("/ayarlar");
}
