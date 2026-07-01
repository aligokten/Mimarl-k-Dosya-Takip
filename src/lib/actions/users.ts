"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/require-user";

const NewUserSchema = z.object({
  name: z.string().min(2, "Ad Soyad gerekli"),
  email: z.string().email("Geçerli bir e-posta girin"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
  role: z.enum(["ADMIN", "STAFF"]),
});

export async function createUser(formData: FormData) {
  await requireAdmin();
  const data = NewUserSchema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  const passwordHash = await bcrypt.hash(data.password, 12);
  await prisma.user.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase().trim(),
      passwordHash,
      role: data.role,
    },
  });
  revalidatePath("/ayarlar");
}

export async function deleteUser(userId: string) {
  const admin = await requireAdmin();
  if (admin.id === userId) {
    throw new Error("Kendi hesabınızı silemezsiniz.");
  }
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/ayarlar");
}

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Mevcut şifre gerekli"),
  newPassword: z.string().min(6, "Yeni şifre en az 6 karakter olmalı"),
});

export async function changeOwnPassword(
  formData: FormData
): Promise<{ ok: boolean; message: string }> {
  const sessionUser = await requireUser();
  const parsed = ChangePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Geçersiz form verisi.",
    };
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
  });
  const isValid = await bcrypt.compare(
    parsed.data.currentPassword,
    user.passwordHash
  );
  if (!isValid) {
    return { ok: false, message: "Mevcut şifreniz hatalı." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });
  return { ok: true, message: "Şifreniz güncellendi." };
}
