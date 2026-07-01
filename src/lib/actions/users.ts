"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-user";

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
