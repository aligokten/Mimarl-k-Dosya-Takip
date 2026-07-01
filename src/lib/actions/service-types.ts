"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-user";

export async function createServiceType(formData: FormData) {
  await requireAdmin();
  const name = z.string().min(2).parse(formData.get("name"));

  const maxOrder = await prisma.serviceType.aggregate({ _max: { order: true } });
  await prisma.serviceType.create({
    data: { name, order: (maxOrder._max.order ?? -1) + 1 },
  });
  revalidatePath("/ayarlar");
}

export async function deleteServiceType(serviceTypeId: string) {
  await requireAdmin();
  await prisma.serviceType.delete({ where: { id: serviceTypeId } });
  revalidatePath("/ayarlar");
}

export async function addStageTemplate(
  serviceTypeId: string,
  formData: FormData
) {
  await requireAdmin();
  const name = z.string().min(2).parse(formData.get("name"));

  const maxOrder = await prisma.stageTemplate.aggregate({
    where: { serviceTypeId },
    _max: { order: true },
  });
  await prisma.stageTemplate.create({
    data: {
      name,
      serviceTypeId,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });
  revalidatePath("/ayarlar");
}

export async function deleteStageTemplate(stageTemplateId: string) {
  await requireAdmin();
  await prisma.stageTemplate.delete({ where: { id: stageTemplateId } });
  revalidatePath("/ayarlar");
}
