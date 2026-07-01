import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { prisma } from "@/lib/prisma";
import { deleteProject, updateProjectStatus } from "@/lib/actions/projects";
import DeleteButton from "@/components/delete-button";
import GeneralTab from "./general-tab";
import ServicesTab from "./services-tab";
import DocumentsTab from "./documents-tab";
import StatusSelect from "./status-select";

const TABS = [
  { key: "genel", label: "Genel Bilgi" },
  { key: "hizmetler", label: "Hizmetler ve Aşamalar" },
  { key: "evraklar", label: "Evraklar" },
];

export default async function ProjeDetayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = "genel" } = await searchParams;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: true,
      landOwner: true,
      services: {
        include: {
          serviceType: { include: { stages: { orderBy: { order: "asc" } } } },
          stages: true,
        },
      },
      documents: {
        include: { projectService: { include: { serviceType: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!project) notFound();

  const [clients, landOwners, allServiceTypes] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.landOwner.findMany({ orderBy: { name: "asc" } }),
    prisma.serviceType.findMany({ orderBy: { order: "asc" } }),
  ]);

  const updateProjectStatusWithId = updateProjectStatus.bind(null, project.id);
  const deleteProjectWithId = deleteProject.bind(null, project.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {project.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {project.client.name}
            {project.landOwner ? ` · Arsa Sahibi: ${project.landOwner.name}` : ""}
          </p>
          {project.driveFolderUrl && (
            <a
              href={project.driveFolderUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-xs text-blue-600 hover:underline"
            >
              Drive klasörünü görüntüle
            </a>
          )}
        </div>
        <div className="flex items-center gap-3">
          <StatusSelect
            action={updateProjectStatusWithId}
            defaultValue={project.status}
          />
          <DeleteButton
            action={deleteProjectWithId}
            confirmMessage="Bu projeyi silmek istediğinize emin misiniz? Tüm hizmet ve evrak kayıtları silinecek."
          />
        </div>
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-6">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/projeler/${project.id}?tab=${t.key}`}
              className={clsx(
                "border-b-2 px-1 py-3 text-sm font-medium",
                tab === t.key
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>

      {tab === "genel" && (
        <GeneralTab project={project} clients={clients} landOwners={landOwners} />
      )}
      {tab === "hizmetler" && (
        <ServicesTab project={project} allServiceTypes={allServiceTypes} />
      )}
      {tab === "evraklar" && <DocumentsTab project={project} />}
    </div>
  );
}
