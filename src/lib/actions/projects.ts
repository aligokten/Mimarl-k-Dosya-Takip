"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

const ProjectSchema = z.object({
  name: z.string().min(2, "Proje adı gerekli"),
  clientId: z.string().min(1, "Müşteri seçmelisiniz"),
  landOwnerId: z.string().optional(),
  province: z.string().optional(),
  district: z.string().optional(),
  neighborhood: z.string().optional(),
  ada: z.string().optional(),
  parsel: z.string().optional(),
  pafta: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

function parseProjectForm(formData: FormData) {
  const parsed = ProjectSchema.parse({
    name: formData.get("name"),
    clientId: formData.get("clientId"),
    landOwnerId: formData.get("landOwnerId") || undefined,
    province: formData.get("province") || undefined,
    district: formData.get("district") || undefined,
    neighborhood: formData.get("neighborhood") || undefined,
    ada: formData.get("ada") || undefined,
    parsel: formData.get("parsel") || undefined,
    pafta: formData.get("pafta") || undefined,
    address: formData.get("address") || undefined,
    notes: formData.get("notes") || undefined,
  });

  return {
    ...parsed,
    landOwnerId: parsed.landOwnerId || null,
  };
}

export async function createProject(formData: FormData) {
  await requireUser();
  const data = parseProjectForm(formData);
  const project = await prisma.project.create({ data });
  revalidatePath("/projeler");
  redirect(`/projeler/${project.id}`);
}

export async function updateProject(projectId: string, formData: FormData) {
  await requireUser();
  const data = parseProjectForm(formData);
  await prisma.project.update({ where: { id: projectId }, data });
  revalidatePath("/projeler");
  revalidatePath(`/projeler/${projectId}`);
}

export async function updateProjectStatus(
  projectId: string,
  formData: FormData
) {
  await requireUser();
  const status = z
    .enum(["DEVAM_EDIYOR", "TAMAMLANDI", "DURDURULDU"])
    .parse(formData.get("status"));
  await prisma.project.update({ where: { id: projectId }, data: { status } });
  revalidatePath(`/projeler/${projectId}`);
  revalidatePath("/projeler");
}

export async function deleteProject(projectId: string) {
  await requireUser();
  await prisma.project.delete({ where: { id: projectId } });
  revalidatePath("/projeler");
  redirect("/projeler");
}

export async function addServiceToProject(
  projectId: string,
  formData: FormData
) {
  await requireUser();
  const serviceTypeId = z.string().min(1).parse(formData.get("serviceTypeId"));

  await prisma.projectService.create({
    data: { projectId, serviceTypeId },
  });
  revalidatePath(`/projeler/${projectId}`);
}

export async function removeServiceFromProject(
  projectId: string,
  projectServiceId: string
) {
  await requireUser();
  await prisma.projectService.delete({ where: { id: projectServiceId } });
  revalidatePath(`/projeler/${projectId}`);
}

export async function updateProjectServiceDates(
  projectId: string,
  projectServiceId: string,
  formData: FormData
) {
  await requireUser();
  const targetDate = formData.get("targetDate") as string | null;
  const status = z
    .enum(["DEVAM_EDIYOR", "TAMAMLANDI", "DURDURULDU"])
    .parse(formData.get("status"));

  await prisma.projectService.update({
    where: { id: projectServiceId },
    data: {
      targetDate: targetDate ? new Date(targetDate) : null,
      status,
      completedDate: status === "TAMAMLANDI" ? new Date() : null,
    },
  });
  revalidatePath(`/projeler/${projectId}`);
}

export async function toggleStageCompletion(
  projectId: string,
  projectServiceId: string,
  stageTemplateId: string,
  completed: boolean
) {
  await requireUser();
  await prisma.projectServiceStage.upsert({
    where: {
      projectServiceId_stageTemplateId: {
        projectServiceId,
        stageTemplateId,
      },
    },
    update: {
      completed,
      completedAt: completed ? new Date() : null,
    },
    create: {
      projectServiceId,
      stageTemplateId,
      completed,
      completedAt: completed ? new Date() : null,
    },
  });
  revalidatePath(`/projeler/${projectId}`);
}
