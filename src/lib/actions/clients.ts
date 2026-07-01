"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

const ClientSchema = z.object({
  name: z.string().min(2, "Ad Soyad / Unvan gerekli"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  taxNo: z.string().optional(),
  notes: z.string().optional(),
});

function parseClientForm(formData: FormData) {
  return ClientSchema.parse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    address: formData.get("address") || undefined,
    taxNo: formData.get("taxNo") || undefined,
    notes: formData.get("notes") || undefined,
  });
}

export async function createClient(formData: FormData) {
  await requireUser();
  const data = parseClientForm(formData);
  const client = await prisma.client.create({ data });
  revalidatePath("/musteriler");
  redirect(`/musteriler/${client.id}`);
}

export async function updateClient(clientId: string, formData: FormData) {
  await requireUser();
  const data = parseClientForm(formData);
  await prisma.client.update({ where: { id: clientId }, data });
  revalidatePath("/musteriler");
  revalidatePath(`/musteriler/${clientId}`);
}

export async function deleteClient(clientId: string) {
  await requireUser();
  await prisma.client.delete({ where: { id: clientId } });
  revalidatePath("/musteriler");
  redirect("/musteriler");
}
