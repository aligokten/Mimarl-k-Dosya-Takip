import { prisma } from "@/lib/prisma";
import { createProject } from "@/lib/actions/projects";
import ProjectForm from "../project-form";

export default async function YeniProjePage() {
  const [clients, landOwners] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.landOwner.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Yeni Proje</h1>
        <p className="mt-1 text-sm text-slate-500">
          Proje, müşteri, arsa ve arsa sahibi bilgilerini girin.
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <ProjectForm
          action={createProject}
          clients={clients}
          landOwners={landOwners}
          submitLabel="Projeyi Kaydet"
        />
      </div>
    </div>
  );
}
