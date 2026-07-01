import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateLandOwner, deleteLandOwner } from "@/lib/actions/land-owners";
import LandOwnerForm from "../land-owner-form";
import DeleteButton from "@/components/delete-button";
import PowerOfAttorneyFile from "./power-of-attorney-file";

export default async function ArsaSahibiDetayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const landOwner = await prisma.landOwner.findUnique({
    where: { id },
    include: { projects: true },
  });

  if (!landOwner) notFound();

  const updateLandOwnerWithId = updateLandOwner.bind(null, landOwner.id);
  const deleteLandOwnerWithId = deleteLandOwner.bind(null, landOwner.id);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {landOwner.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">Arsa sahibi bilgileri</p>
        </div>
        <DeleteButton
          action={deleteLandOwnerWithId}
          confirmMessage="Bu arsa sahibini silmek istediğinize emin misiniz? Bağlı projeler etkilenebilir."
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <PowerOfAttorneyFile
          landOwnerId={landOwner.id}
          driveFileUrl={landOwner.powerOfAttorneyDriveUrl}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <LandOwnerForm
          action={updateLandOwnerWithId}
          initialValues={landOwner}
          submitLabel="Değişiklikleri Kaydet"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-900">Projeler</h2>
        <ul className="mt-3 divide-y divide-slate-100">
          {landOwner.projects.length === 0 && (
            <li className="py-3 text-sm text-slate-500">
              Bu arsa sahibine ait proje yok.
            </li>
          )}
          {landOwner.projects.map((project) => (
            <li key={project.id} className="py-3">
              <Link
                href={`/projeler/${project.id}`}
                className="text-sm font-medium text-slate-900 hover:underline"
              >
                {project.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
